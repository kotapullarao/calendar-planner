/**
 * The calendar data model.
 *
 * A category's `dates[]` holds two shapes — a plain `'YYYY-MM-DD'` string for a
 * bare day, or an object carrying a span plus optional event details. That
 * duality was re-implemented at 21 sites across the codebase, each deciding
 * again what `start` and `end` mean. This module is the single place that
 * knows, and every consumer should read through it.
 *
 * Pure functions over plain data: no DOM, no state, no persistence, so the
 * whole model is unit-testable without a browser.
 *
 * Vocabulary
 *   entry  — a raw element of `category.dates[]`, either shape
 *   span   — `{ start, end }`, both inclusive; `end === start` for one day
 *   event  — a normalized entry with its optional details resolved
 */

/** True for an entry that carries event details rather than only a date. */
function isDetailed(entry) {
    return !!entry && typeof entry === 'object' &&
        !!(entry.title || entry.time || entry.endTime || entry.location || entry.notes);
}

/**
 * The inclusive day span an entry covers, or null if malformed.
 *
 * Mirrors the convention used throughout the app: a string entry is a single
 * day, and an object entry falls back to `start` when `end` is missing.
 */
export function entrySpan(entry) {
    if (typeof entry === 'string') {
        return entry ? { start: entry, end: entry } : null;
    }
    if (!entry || !entry.start) return null;
    return { start: entry.start, end: entry.end || entry.start };
}

/** Whether an entry covers a 'YYYY-MM-DD' date. Dates sort lexicographically. */
export function entryCoversDate(entry, dateStr) {
    const span = entrySpan(entry);
    if (!span) return false;
    return dateStr >= span.start && dateStr <= span.end;
}

/** Whether an entry overlaps an inclusive [from, to] window. */
export function entryOverlaps(entry, from, to) {
    const span = entrySpan(entry);
    if (!span) return false;
    return span.start <= to && span.end >= from;
}

/**
 * Normalize an entry into an event, or null if it carries no details.
 *
 * A bare date is not an event: it marks a day without describing anything, so
 * callers that want "things with titles" get null and callers that want "days
 * covered" use entrySpan instead.
 */
export function toEvent(entry) {
    if (!isDetailed(entry)) return null;
    const span = entrySpan(entry);
    if (!span) return null;
    return {
        start: span.start,
        end: span.end,
        title: entry.title || 'Untitled event',
        time: entry.time || null,
        endTime: entry.endTime || null,
        location: entry.location || null,
        notes: entry.notes || null
    };
}

/** Sort comparator: timed events first in clock order, all-day last. */
export function byStartTime(a, b) {
    return (a.time || '99:99').localeCompare(b.time || '99:99');
}

/** True for a calendar backed by a subscribed feed. */
export function isSubscribed(calendar) {
    return !!calendar && calendar.type === 'ics';
}

/** True for a saved intersection of other calendars. */
export function isSmart(calendar) {
    return !!calendar && calendar.type === 'group';
}

/**
 * Every event on one calendar, from either source.
 *
 * Subscribed calendars keep their details in an `eventsByDate` map built at
 * sync time; local ones keep them inline in `dates[]`. Callers should not care
 * which, so both are flattened to the same shape here.
 */
export function calendarEvents(calendar) {
    if (!calendar || isSmart(calendar)) return [];

    if (isSubscribed(calendar)) {
        const out = [];
        for (const [date, entries] of Object.entries(calendar.eventsByDate || {})) {
            for (const ev of entries) {
                out.push({
                    start: date,
                    end: date,
                    title: ev.title || 'Untitled event',
                    time: ev.time || null,
                    endTime: ev.endTime || null,
                    location: ev.location || null,
                    notes: ev.desc || null
                });
            }
        }
        return out;
    }

    return (calendar.dates || []).map(toEvent).filter(Boolean);
}

/**
 * Events on one calendar that fall on a date, in display order.
 *
 * Subscribed feeds are pre-indexed by date, so they are looked up directly
 * rather than scanned — the map is what makes this cheap for large feeds.
 */
export function calendarEventsOnDate(calendar, dateStr) {
    if (!calendar || isSmart(calendar)) return [];

    if (isSubscribed(calendar)) {
        const entries = (calendar.eventsByDate || {})[dateStr];
        if (!entries || !entries.length) return [];
        return entries.map(ev => ({
            start: dateStr,
            end: dateStr,
            title: ev.title || 'Untitled event',
            time: ev.time || null,
            endTime: ev.endTime || null,
            location: ev.location || null,
            notes: ev.desc || null
        }));
    }

    return (calendar.dates || [])
        .filter(entry => isDetailed(entry) && entryCoversDate(entry, dateStr))
        .map(toEvent)
        .filter(Boolean)
        .sort(byStartTime);
}

/**
 * Events across calendars, each tagged with the calendar it belongs to.
 * `calendarIds` restricts the scan; omit it to cover everything.
 */
export function allEvents(calendars, calendarIds = null) {
    const wanted = calendarIds ? new Set(calendarIds) : null;
    const out = [];
    for (const calendar of calendars || []) {
        if (wanted && !wanted.has(calendar.id)) continue;
        for (const event of calendarEvents(calendar)) {
            out.push({ ...event, calendar });
        }
    }
    return out;
}

/**
 * Events on one date, grouped by calendar and ordered as the calendars are.
 * Returns `[{ calendar, events, editable }]`, skipping calendars with none.
 */
export function eventsOnDate(calendars, dateStr, calendarIds = null) {
    const wanted = calendarIds ? new Set(calendarIds) : null;
    const groups = [];
    for (const calendar of calendars || []) {
        if (wanted && !wanted.has(calendar.id)) continue;
        const events = calendarEventsOnDate(calendar, dateStr);
        if (events.length) {
            groups.push({ calendar, events, editable: !isSubscribed(calendar) });
        }
    }
    return groups;
}

export const Model = {
    entrySpan,
    entryCoversDate,
    entryOverlaps,
    toEvent,
    byStartTime,
    isSubscribed,
    isSmart,
    calendarEvents,
    calendarEventsOnDate,
    allEvents,
    eventsOnDate
};
