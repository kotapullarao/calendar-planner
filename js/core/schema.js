/**
 * Stored-config schema and migrations.
 *
 * The persisted config had no version field, and `category.dates[]` held two
 * different shapes — a bare `'YYYY-MM-DD'` string or an object with a span.
 * That ambiguity is the root of the duplication the model module now hides
 * from consumers; this migration removes it from the data itself, so newly
 * written configs carry exactly one shape.
 *
 * Migrations must be:
 *   idempotent  — running twice changes nothing the second time
 *   total       — never throws on malformed input, reports instead
 *   honest      — anything dropped is counted and surfaced, never silent
 */

export const SCHEMA_VERSION = 2;

/** Storage keys owned by this module. */
export const KEYS = {
    CONFIG: 'calendar-plan-config',
    BACKUP: 'calendar-plan-config-backup'
};

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Convert one `dates[]` entry to the canonical object form.
 * Returns null for anything unparseable — such entries are already invisible
 * to every consumer (they fail isDateInRanges and are skipped by the counters),
 * so dropping them removes noise rather than data.
 */
export function normalizeEntry(entry) {
    if (typeof entry === 'string') {
        return DATE_RE.test(entry) ? { start: entry, end: entry } : null;
    }
    if (!entry || typeof entry !== 'object') return null;
    if (!DATE_RE.test(entry.start || '')) return null;

    const end = DATE_RE.test(entry.end || '') ? entry.end : entry.start;

    // Build in a fixed key order — span, then details, then anything this
    // version does not know about. Deterministic serialization keeps stored
    // configs diffable and lets the idempotency check compare bytes.
    const out = { start: entry.start, end };

    for (const key of ['title', 'time', 'endTime', 'location', 'notes']) {
        const value = entry[key];
        // Empty details are dropped rather than stored as `"title": null`.
        if (value !== null && value !== undefined && value !== '') out[key] = value;
    }

    const known = new Set(['start', 'end', 'title', 'time', 'endTime', 'location', 'notes']);
    for (const key of Object.keys(entry)) {
        if (!known.has(key)) out[key] = entry[key];
    }
    return out;
}

/** The version a stored config declares; absent means the original schema. */
export function detectVersion(config) {
    if (!config || typeof config !== 'object') return 0;
    return Number.isInteger(config.schemaVersion) ? config.schemaVersion : 1;
}

/**
 * Bring a stored config up to SCHEMA_VERSION.
 *
 * Returns `{ config, changed, report }`. `report` describes what happened so
 * callers can log or surface it; `changed` is false when the input was already
 * current, which is what makes re-running safe.
 */
export function migrateConfig(input) {
    const report = {
        from: detectVersion(input),
        to: SCHEMA_VERSION,
        categories: 0,
        entriesNormalized: 0,
        entriesDropped: 0,
        droppedSamples: []
    };

    if (!input || typeof input !== 'object') {
        return {
            config: { schemaVersion: SCHEMA_VERSION, eventCategories: [] },
            changed: true,
            report: { ...report, from: 0, recreated: true }
        };
    }

    const config = { ...input };
    if (!Array.isArray(config.eventCategories)) config.eventCategories = [];

    config.eventCategories = config.eventCategories.map(category => {
        if (!category || typeof category !== 'object') return category;
        report.categories++;
        if (!Array.isArray(category.dates)) return { ...category, dates: [] };

        const dates = [];
        for (const entry of category.dates) {
            const normalized = normalizeEntry(entry);
            if (!normalized) {
                report.entriesDropped++;
                if (report.droppedSamples.length < 5) {
                    report.droppedSamples.push({ category: category.name, entry });
                }
                continue;
            }
            // Count only entries whose shape actually changed.
            if (typeof entry === 'string' || entry.end !== normalized.end) {
                report.entriesNormalized++;
            }
            dates.push(normalized);
        }
        return { ...category, dates };
    });

    config.schemaVersion = SCHEMA_VERSION;

    const changed = report.from !== SCHEMA_VERSION ||
        report.entriesNormalized > 0 ||
        report.entriesDropped > 0;

    return { config, changed, report };
}

/** One-line summary of a migration report, for the console. */
export function describeMigration(report) {
    if (report.recreated) return 'config was missing or unreadable; started fresh';
    const parts = [`schema v${report.from} -> v${report.to}`, `${report.categories} categories`];
    if (report.entriesNormalized) parts.push(`${report.entriesNormalized} dates normalized`);
    if (report.entriesDropped) parts.push(`${report.entriesDropped} unparseable dates dropped`);
    return parts.join(', ');
}
