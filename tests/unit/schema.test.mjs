/**
 * Migration tests.
 *
 * This is the one piece of the rework that touches real user data, so the bar
 * is higher than elsewhere: idempotency, no silent loss, survival of unknown
 * fields, and total behaviour on garbage input.
 */

import {
    SCHEMA_VERSION, normalizeEntry, detectVersion, migrateConfig, describeMigration
} from '../../js/core/schema.js';
import { entrySpan, calendarEventsOnDate } from '../../js/core/model.js';
import { createSuite } from '../helpers/assert.mjs';

const { check, eq, done } = createSuite('schema migration');

// --- normalizeEntry -------------------------------------------------------
eq('bare date becomes a one-day span', normalizeEntry('2026-03-10'),
    { start: '2026-03-10', end: '2026-03-10' });
eq('span passes through', normalizeEntry({ start: '2026-03-10', end: '2026-03-12' }),
    { start: '2026-03-10', end: '2026-03-12' });
eq('missing end fills from start', normalizeEntry({ start: '2026-03-10' }),
    { start: '2026-03-10', end: '2026-03-10' });
eq('details are preserved',
    normalizeEntry({ start: '2026-03-10', title: 'Standup', time: '09:30', location: 'HQ', notes: 'n' }),
    { start: '2026-03-10', end: '2026-03-10', title: 'Standup', time: '09:30', location: 'HQ', notes: 'n' });
eq('empty detail fields are dropped, not stored as null',
    normalizeEntry({ start: '2026-03-10', title: '', time: null, notes: undefined }),
    { start: '2026-03-10', end: '2026-03-10' });
eq('unknown fields survive (forward compatibility)',
    normalizeEntry({ start: '2026-03-10', somethingNew: 42 }),
    { start: '2026-03-10', end: '2026-03-10', somethingNew: 42 });
eq('malformed end falls back to start',
    normalizeEntry({ start: '2026-03-10', end: 'garbage' }),
    { start: '2026-03-10', end: '2026-03-10' });

for (const [label, bad] of [
    ['null', null], ['undefined', undefined], ['number', 42], ['empty string', ''],
    ['non-date string', 'tomorrow'], ['object without start', { end: '2026-03-10' }],
    ['bad start format', { start: '10-03-2026' }], ['array', []]
]) {
    eq(`rejects ${label}`, normalizeEntry(bad), null);
}

// --- version detection ----------------------------------------------------
eq('unversioned config reads as v1', detectVersion({ eventCategories: [] }), 1);
eq('versioned config reads its version', detectVersion({ schemaVersion: 2 }), 2);
eq('missing config reads as v0', detectVersion(null), 0);

// --- a realistic v1 config ------------------------------------------------
const V1 = {
    eventCategories: [
        {
            id: 'work', name: 'Work', emoji: '💼', color: '#3b82f6', type: 'single',
            excludeHolidays: true, childCategoryIds: [],
            dates: [
                '2026-03-09',
                { start: '2026-03-11', end: '2026-03-13' },
                { start: '2026-03-14', end: '2026-03-14', title: 'Review', time: '11:00', endTime: '12:00' },
                null,
                'not-a-date'
            ]
        },
        {
            id: 'hols', name: 'Public Holidays', emoji: '🎌', color: '#ef4444', type: 'single',
            excludeHolidays: false, childCategoryIds: [], dates: ['2026-01-01']
        },
        {
            id: 'feed', name: 'Team', emoji: '🔗', color: '#0891b2', type: 'ics', readOnly: true,
            sourceUrl: 'https://example.com/f.ics', excludeHolidays: false, childCategoryIds: [],
            dates: ['2026-03-10'],
            eventsByDate: { '2026-03-10': [{ title: 'Demo', time: '15:00' }] }
        },
        {
            id: 'both', name: 'Overlap', emoji: '🧩', color: '#8b5cf6', type: 'group',
            excludeHolidays: false, childCategoryIds: ['work', 'feed'], dates: []
        }
    ],
    icsSubscriptions: [{ id: 'feed', url: 'https://example.com/f.ics', enabled: true, lastSyncAt: 123 }],
    icsProxyUrl: 'https://w.example/?url={url}',
    icsSyncIntervalMinutes: 30
};

const first = migrateConfig(structuredClone(V1));

check('migration reports a change', first.changed);
eq('version stamped', first.config.schemaVersion, SCHEMA_VERSION);
eq('all categories kept', first.config.eventCategories.length, 4);
eq('subscriptions untouched', first.config.icsSubscriptions, V1.icsSubscriptions);
eq('settings untouched', [first.config.icsProxyUrl, first.config.icsSyncIntervalMinutes],
    [V1.icsProxyUrl, V1.icsSyncIntervalMinutes]);

{
    const work = first.config.eventCategories.find(c => c.id === 'work');
    eq('unparseable entries dropped', work.dates.length, 3);
    check('every surviving entry is an object', work.dates.every(d => typeof d === 'object'));
    check('every surviving entry has start and end', work.dates.every(d => d.start && d.end));
    eq('bare date became a span', work.dates[0], { start: '2026-03-09', end: '2026-03-09' });
    eq('range preserved', work.dates[1], { start: '2026-03-11', end: '2026-03-13' });
    eq('details preserved through migration', work.dates[2].title, 'Review');
    eq('category fields preserved', [work.emoji, work.color, work.excludeHolidays], ['💼', '#3b82f6', true]);
}
{
    const feed = first.config.eventCategories.find(c => c.id === 'feed');
    eq('subscribed calendar keeps its detail map', feed.eventsByDate['2026-03-10'][0].title, 'Demo');
    eq('subscribed calendar keeps readOnly + sourceUrl', [feed.readOnly, feed.sourceUrl],
        [true, 'https://example.com/f.ics']);
}
{
    const group = first.config.eventCategories.find(c => c.id === 'both');
    eq('smart calendar keeps its children', group.childCategoryIds, ['work', 'feed']);
}

eq('drops are reported, not silent', first.report.entriesDropped, 2);
eq('dropped samples captured for the log', first.report.droppedSamples.length, 2);
check('summary reads sensibly', describeMigration(first.report).includes('dropped'),
    describeMigration(first.report));

// --- idempotency ----------------------------------------------------------
{
    const second = migrateConfig(structuredClone(first.config));
    check('second run reports no change', !second.changed);
    eq('second run is byte-identical', JSON.stringify(second.config), JSON.stringify(first.config));
    const third = migrateConfig(structuredClone(second.config));
    eq('third run still identical', JSON.stringify(third.config), JSON.stringify(first.config));
}

// --- behaviour must not change --------------------------------------------
// The point of migrating is that consumers see the same thing afterwards.
{
    const before = V1.eventCategories.find(c => c.id === 'work');
    const after = first.config.eventCategories.find(c => c.id === 'work');

    for (const date of ['2026-03-09', '2026-03-11', '2026-03-12', '2026-03-13', '2026-03-14', '2026-03-15']) {
        const coveredBefore = before.dates.some(e => {
            const s = entrySpan(e);
            return s && date >= s.start && date <= s.end;
        });
        const coveredAfter = after.dates.some(e => {
            const s = entrySpan(e);
            return s && date >= s.start && date <= s.end;
        });
        eq(`coverage unchanged on ${date}`, coveredAfter, coveredBefore);
    }

    eq('events on the detailed day unchanged',
        calendarEventsOnDate(after, '2026-03-14').map(e => `${e.time}|${e.title}`),
        calendarEventsOnDate(before, '2026-03-14').map(e => `${e.time}|${e.title}`));
}

// --- single-day entries must still render as single rows ------------------
// The editor decides row type from `end === start`; if migration broke that,
// every migrated single day would open as a range.
{
    const work = first.config.eventCategories.find(c => c.id === 'work');
    const single = work.dates[0];
    check('migrated single day is recognisable as single', single.end === single.start);
    const range = work.dates[1];
    check('a real range is still distinguishable', range.end !== range.start);
}

// --- total on garbage -----------------------------------------------------
for (const [label, bad] of [
    ['null', null], ['undefined', undefined], ['a string', 'nonsense'], ['a number', 7],
    ['empty object', {}], ['categories not an array', { eventCategories: 'oops' }]
]) {
    let ok = true, out = null;
    try { out = migrateConfig(bad); } catch (e) { ok = false; }
    check(`survives ${label}`, ok && out && Array.isArray(out.config.eventCategories),
        ok ? '' : 'threw');
}
{
    const weird = migrateConfig({ eventCategories: [null, 'x', { id: 'a', dates: 'not-an-array' }] });
    check('malformed categories do not crash', Array.isArray(weird.config.eventCategories));
    eq('category with bad dates gets an empty array',
        weird.config.eventCategories[2].dates, []);
}

done();
