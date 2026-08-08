/**
 * ICS (iCalendar) Parsing Module
 *
 * Parses RFC 5545 calendar feeds into plain calendar dates that the planner
 * can render. The app is date-based rather than time-based, so every event is
 * reduced to the set of YYYY-MM-DD days it covers.
 *
 * Pure functions only — no network, no DOM, no state. See sync.js for fetching.
 */

// Expansion safety limits. A malformed or unbounded RRULE must never hang the UI.
const MAX_OCCURRENCES = 500;
const MAX_ITERATIONS = 5000;

const WEEKDAY_CODES = ['SU', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA'];

/**
 * Unfold RFC 5545 folded lines.
 * Long lines are split with CRLF followed by a single space or tab, which must
 * be rejoined before anything else can be parsed.
 */
function unfoldLines(text) {
    return text
        .replace(/\r\n/g, '\n')
        .replace(/\r/g, '\n')
        .replace(/\n[ \t]/g, '');
}

/**
 * Unescape a TEXT value (RFC 5545 §3.3.11).
 */
function unescapeText(value) {
    return value
        .replace(/\\n/gi, '\n')
        .replace(/\\,/g, ',')
        .replace(/\\;/g, ';')
        .replace(/\\\\/g, '\\');
}

/**
 * Split a content line into { name, params, value }.
 * Handles quoted parameter values so a colon inside quotes is not mistaken
 * for the name/value separator.
 */
function parseLine(line) {
    let colonIndex = -1;
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
        const ch = line[i];
        if (ch === '"') inQuotes = !inQuotes;
        else if (ch === ':' && !inQuotes) { colonIndex = i; break; }
    }
    if (colonIndex === -1) return null;

    const namePart = line.slice(0, colonIndex);
    const value = line.slice(colonIndex + 1);

    const segments = namePart.split(';');
    const name = segments[0].toUpperCase();
    const params = {};
    for (let i = 1; i < segments.length; i++) {
        const eq = segments[i].indexOf('=');
        if (eq === -1) continue;
        const key = segments[i].slice(0, eq).toUpperCase();
        params[key] = segments[i].slice(eq + 1).replace(/^"|"$/g, '');
    }
    return { name, params, value };
}

/**
 * Format a Date as YYYY-MM-DD using its UTC fields.
 */
function formatUTC(date) {
    const y = date.getUTCFullYear();
    const m = String(date.getUTCMonth() + 1).padStart(2, '0');
    const d = String(date.getUTCDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
}

/**
 * Format an instant as the calendar date it falls on in a given IANA zone.
 * en-CA formats as YYYY-MM-DD, which is exactly the shape we want.
 */
function formatInZone(date, timeZone) {
    try {
        return new Intl.DateTimeFormat('en-CA', {
            timeZone, year: 'numeric', month: '2-digit', day: '2-digit'
        }).format(date);
    } catch (e) {
        // Unknown TZID — fall back to UTC rather than dropping the event.
        return formatUTC(date);
    }
}

/**
 * Parse a DTSTART/DTEND/UNTIL value into a calendar date.
 *
 * Three encodings appear in the wild:
 *   VALUE=DATE       20260115            → a floating calendar date
 *   UTC              20260115T133000Z    → an instant, rendered in `timeZone`
 *   floating / TZID  20260115T133000     → wall time; the date is taken as-is
 *
 * Returns { date: 'YYYY-MM-DD', allDay: boolean } or null.
 */
function parseDateValue(value, params = {}, timeZone) {
    if (!value) return null;
    const raw = value.trim();

    // Date-only form: YYYYMMDD
    const dateOnly = /^(\d{4})(\d{2})(\d{2})$/.exec(raw);
    if (dateOnly) {
        return { date: `${dateOnly[1]}-${dateOnly[2]}-${dateOnly[3]}`, allDay: true, time: null };
    }

    // Date-time form: YYYYMMDDTHHMMSS with optional trailing Z
    const dateTime = /^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})(Z)?$/.exec(raw);
    if (!dateTime) return null;

    const [, y, mo, d, h, mi, s, zulu] = dateTime;

    if (zulu) {
        // A real instant. Which calendar day (and wall-clock time) it lands on
        // depends on the viewer's zone, so resolve both there.
        const instant = new Date(Date.UTC(+y, +mo - 1, +d, +h, +mi, +s));
        const zone = timeZone || Intl.DateTimeFormat().resolvedOptions().timeZone;
        let time = null;
        try {
            time = new Intl.DateTimeFormat('en-GB', {
                timeZone: zone, hour: '2-digit', minute: '2-digit', hour12: false
            }).format(instant);
        } catch (e) {
            time = `${h}:${mi}`;
        }
        return { date: formatInZone(instant, zone), allDay: false, time };
    }

    // Floating time, or a TZID we deliberately do not shift: the wall-clock date
    // is what the organiser meant, so use it directly.
    return { date: `${y}-${mo}-${d}`, allDay: false, time: `${h}:${mi}` };
}

/** Add `days` to a YYYY-MM-DD string. */
export function addDays(dateStr, days) {
    const [y, m, d] = dateStr.split('-').map(Number);
    const dt = new Date(Date.UTC(y, m - 1, d));
    dt.setUTCDate(dt.getUTCDate() + days);
    return formatUTC(dt);
}

/** Difference in whole days between two YYYY-MM-DD strings (b - a). */
function daysBetween(a, b) {
    const [ay, am, ad] = a.split('-').map(Number);
    const [by, bm, bd] = b.split('-').map(Number);
    const msA = Date.UTC(ay, am - 1, ad);
    const msB = Date.UTC(by, bm - 1, bd);
    return Math.round((msB - msA) / 86400000);
}

/** Day of week (0=Sun) for a YYYY-MM-DD string. */
function dayOfWeek(dateStr) {
    const [y, m, d] = dateStr.split('-').map(Number);
    return new Date(Date.UTC(y, m - 1, d)).getUTCDay();
}

/**
 * Parse an RRULE value into a plain object.
 * e.g. "FREQ=WEEKLY;BYDAY=MO,WE;UNTIL=20261231T000000Z;INTERVAL=2"
 */
function parseRRule(value) {
    const rule = {};
    value.split(';').forEach(part => {
        const eq = part.indexOf('=');
        if (eq === -1) return;
        rule[part.slice(0, eq).toUpperCase()] = part.slice(eq + 1);
    });
    if (!rule.FREQ) return null;

    return {
        freq: rule.FREQ.toUpperCase(),
        interval: Math.max(1, parseInt(rule.INTERVAL, 10) || 1),
        count: rule.COUNT ? parseInt(rule.COUNT, 10) : null,
        until: rule.UNTIL ? (parseDateValue(rule.UNTIL, {}, 'UTC') || {}).date || null : null,
        byDay: rule.BYDAY ? rule.BYDAY.split(',').map(s => s.trim().toUpperCase()) : null
    };
}

/**
 * Expand a recurring event into its occurrence start dates within [from, to].
 * Always bounded by MAX_OCCURRENCES / MAX_ITERATIONS.
 */
function expandRRule(startDate, rule, from, to) {
    const occurrences = [];
    const hardStop = rule.until && rule.until < to ? rule.until : to;

    // Weekly with BYDAY: walk week by week, emitting each selected weekday.
    if (rule.freq === 'WEEKLY' && rule.byDay && rule.byDay.length) {
        const wanted = rule.byDay
            .map(code => WEEKDAY_CODES.indexOf(code.replace(/^[+-]?\d+/, '')))
            .filter(i => i >= 0);
        if (!wanted.length) return [startDate];

        // Back up to the Sunday of the start's week so intervals count properly.
        let weekStart = addDays(startDate, -dayOfWeek(startDate));
        let weekIndex = 0;
        let iterations = 0;

        while (weekStart <= hardStop && occurrences.length < MAX_OCCURRENCES && iterations++ < MAX_ITERATIONS) {
            if (weekIndex % rule.interval === 0) {
                for (const wd of wanted) {
                    const occ = addDays(weekStart, wd);
                    if (occ >= startDate && occ >= from && occ <= hardStop) {
                        occurrences.push(occ);
                        if (rule.count && occurrences.length >= rule.count) return occurrences;
                    }
                }
            }
            weekStart = addDays(weekStart, 7);
            weekIndex++;
        }
        return occurrences;
    }

    // Simple cadences. Each occurrence is computed from the ORIGINAL start
    // rather than the previous occurrence, so month-end clamping never drifts
    // (Jan 31 → Feb 28 → Mar 31, not Mar 28).
    const [startY, startM, startD] = startDate.split('-').map(Number);

    /** The nth occurrence, or null for an unsupported frequency. */
    const nth = (step) => {
        if (rule.freq === 'DAILY') return addDays(startDate, step * rule.interval);
        if (rule.freq === 'WEEKLY') return addDays(startDate, step * rule.interval * 7);

        if (rule.freq === 'MONTHLY' || rule.freq === 'YEARLY') {
            const monthOffset = rule.freq === 'MONTHLY'
                ? step * rule.interval
                : step * rule.interval * 12;
            const target = new Date(Date.UTC(startY, startM - 1 + monthOffset, 1));
            const lastDay = new Date(Date.UTC(target.getUTCFullYear(), target.getUTCMonth() + 1, 0)).getUTCDate();
            target.setUTCDate(Math.min(startD, lastDay));
            return formatUTC(target);
        }
        return null;
    };

    let emitted = 0;
    for (let step = 0; step < MAX_ITERATIONS; step++) {
        const cursor = nth(step);
        // Unsupported frequency (e.g. HOURLY): keep the first instance only.
        if (cursor === null) {
            if (startDate >= from && startDate <= hardStop) occurrences.push(startDate);
            break;
        }
        if (cursor > hardStop) break;

        if (cursor >= from) occurrences.push(cursor);
        emitted++;
        if (rule.count && emitted >= rule.count) break;
        if (occurrences.length >= MAX_OCCURRENCES) break;
    }
    return occurrences;
}

/**
 * Parse an ICS document.
 * Returns { calendarName, events: [{ uid, summary, start, end, allDay, rrule, exdates }] }
 * where `end` is INCLUSIVE (ICS DTEND is exclusive for all-day events).
 */
export function parseICS(text, options = {}) {
    const timeZone = options.timeZone || Intl.DateTimeFormat().resolvedOptions().timeZone;
    const lines = unfoldLines(String(text || '')).split('\n');

    const events = [];
    let calendarName = '';
    let current = null;
    let inEvent = false;

    for (const rawLine of lines) {
        const line = rawLine.trim();
        if (!line) continue;

        if (line === 'BEGIN:VEVENT') {
            inEvent = true;
            current = { uid: '', summary: '', description: '', location: '', start: null, end: null, allDay: false, time: null, endTime: null, rrule: null, exdates: [] };
            continue;
        }
        if (line === 'END:VEVENT') {
            if (current && current.start) {
                if (!current.end) current.end = current.start;
                events.push(current);
            }
            inEvent = false;
            current = null;
            continue;
        }

        const parsed = parseLine(line);
        if (!parsed) continue;
        const { name, params, value } = parsed;

        if (!inEvent) {
            // X-WR-CALNAME is the de-facto feed title used by Google and others.
            if (name === 'X-WR-CALNAME') calendarName = unescapeText(value).trim();
            continue;
        }
        if (!current) continue;

        switch (name) {
            case 'UID':
                current.uid = value.trim();
                break;
            case 'SUMMARY':
                current.summary = unescapeText(value).trim();
                break;
            case 'DESCRIPTION':
                current.description = unescapeText(value).trim();
                break;
            case 'LOCATION':
                current.location = unescapeText(value).trim();
                break;
            case 'DTSTART': {
                const r = parseDateValue(value, params, timeZone);
                if (r) {
                    current.start = r.date;
                    current.allDay = r.allDay || params.VALUE === 'DATE';
                    current.time = current.allDay ? null : r.time;
                }
                break;
            }
            case 'DTEND': {
                const r = parseDateValue(value, params, timeZone);
                if (r) {
                    // For all-day events DTEND is exclusive, so step back one day
                    // to get the last day the event actually covers.
                    const isDateValue = params.VALUE === 'DATE' || /^\d{8}$/.test(value.trim());
                    current.end = isDateValue ? addDays(r.date, -1) : r.date;
                    if (!isDateValue) current.endTime = r.time;
                }
                break;
            }
            case 'DURATION': {
                // e.g. P3D / PT2H. Only whole-day components affect the date span.
                const m = /^P(?:(\d+)W)?(?:(\d+)D)?/.exec(value.trim());
                if (m && current.start) {
                    const days = (parseInt(m[1], 10) || 0) * 7 + (parseInt(m[2], 10) || 0);
                    current.end = days > 0 ? addDays(current.start, days - 1) : current.start;
                }
                break;
            }
            case 'RRULE':
                current.rrule = parseRRule(value);
                break;
            case 'EXDATE': {
                value.split(',').forEach(v => {
                    const r = parseDateValue(v, params, timeZone);
                    if (r) current.exdates.push(r.date);
                });
                break;
            }
        }
    }

    // Guard against a feed whose end precedes its start.
    events.forEach(ev => { if (ev.end < ev.start) ev.end = ev.start; });

    return { calendarName, events };
}

/**
 * Convert parsed events into planner date entries within [from, to].
 *
 * Single-day events become 'YYYY-MM-DD' strings; multi-day events become
 * { start, end } objects — matching the two shapes the planner already stores.
 */
export function eventsToDates(events, from, to) {
    const seen = new Set();
    const dates = [];

    for (const ev of events) {
        if (!ev.start) continue;
        const span = Math.max(0, daysBetween(ev.start, ev.end || ev.start));

        const starts = ev.rrule
            ? expandRRule(ev.start, ev.rrule, from, to)
            : (ev.start <= to && (ev.end || ev.start) >= from ? [ev.start] : []);

        for (const start of starts) {
            if (ev.exdates.includes(start)) continue;
            const end = span > 0 ? addDays(start, span) : start;
            if (end < from || start > to) continue;

            const key = span > 0 ? `${start}|${end}` : start;
            if (seen.has(key)) continue;
            seen.add(key);
            dates.push(span > 0 ? { start, end } : start);
        }
    }

    return dates;
}

// Bounds for the per-day details map, so a huge feed cannot blow the
// localStorage quota through titles alone.
const MAX_DETAIL_ENTRIES = 4000;
const MAX_DETAILS_PER_DAY = 8;
const MAX_SUMMARY_CHARS = 80;
const MAX_LOCATION_CHARS = 80;
const MAX_DESCRIPTION_CHARS = 280;

/**
 * Build a per-day details map for tooltips and the day peek:
 *   { 'YYYY-MM-DD': [{ title, time }] }
 * `time` is 'HH:MM' for timed events, null for all-day ones. Entries are
 * capped per day and overall; multi-day events appear on every covered day.
 */
export function eventsToDetails(events, from, to) {
    const byDate = {};
    let total = 0;

    const push = (date, ev) => {
        if (total >= MAX_DETAIL_ENTRIES) return;
        const list = byDate[date] || (byDate[date] = []);
        if (list.length >= MAX_DETAILS_PER_DAY) return;
        const entry = {
            title: (ev.summary || 'Untitled event').slice(0, MAX_SUMMARY_CHARS),
            time: ev.time || null
        };
        // Optional fields are only stored when present, keeping the persisted
        // map compact for feeds that carry none of them.
        if (ev.endTime && ev.endTime !== ev.time) entry.endTime = ev.endTime;
        if (ev.location) entry.location = ev.location.slice(0, MAX_LOCATION_CHARS);
        if (ev.description) {
            // Google appends boilerplate holiday text; still useful, but trim
            // whitespace runs before capping so the cap buys real content.
            const desc = ev.description.replace(/\s+/g, ' ').trim();
            if (desc && desc !== entry.title) entry.desc = desc.slice(0, MAX_DESCRIPTION_CHARS);
        }
        list.push(entry);
        total++;
    };

    for (const ev of events) {
        if (!ev.start) continue;
        const span = Math.max(0, daysBetween(ev.start, ev.end || ev.start));

        const starts = ev.rrule
            ? expandRRule(ev.start, ev.rrule, from, to)
            : (ev.start <= to && (ev.end || ev.start) >= from ? [ev.start] : []);

        for (const start of starts) {
            if (ev.exdates.includes(start)) continue;
            for (let offset = 0; offset <= span; offset++) {
                const day = addDays(start, offset);
                if (day < from || day > to) continue;
                push(day, ev);
            }
        }
        if (total >= MAX_DETAIL_ENTRIES) break;
    }

    // Timed events first within each day, in time order.
    for (const day of Object.keys(byDate)) {
        byDate[day].sort((a, b) => (a.time || '99:99').localeCompare(b.time || '99:99'));
    }
    return byDate;
}

export const ICS = { parseICS, eventsToDates, eventsToDetails, addDays };
