/**
 * The model is the one place that understands the two date-entry shapes, so
 * these tests pin that behaviour precisely — every consumer inherits it.
 */

import {
    entrySpan, entryCoversDate, entryOverlaps, toEvent, byStartTime,
    isSubscribed, isSmart, calendarEvents, calendarEventsOnDate,
    allEvents, eventsOnDate
} from '../../js/core/model.js';
import { createSuite } from '../helpers/assert.mjs';

const { check, eq, done } = createSuite('model');

// --- entrySpan ------------------------------------------------------------
eq('string entry spans one day', entrySpan('2026-03-10'), { start: '2026-03-10', end: '2026-03-10' });
eq('object entry keeps its span', entrySpan({ start: '2026-03-10', end: '2026-03-12' }),
    { start: '2026-03-10', end: '2026-03-12' });
eq('missing end falls back to start', entrySpan({ start: '2026-03-10' }),
    { start: '2026-03-10', end: '2026-03-10' });
eq('null entry', entrySpan(null), null);
eq('empty string entry', entrySpan(''), null);
eq('object without start', entrySpan({ end: '2026-03-10' }), null);

// --- coverage / overlap ---------------------------------------------------
check('covers its own day', entryCoversDate('2026-03-10', '2026-03-10'));
check('does not cover the next day', !entryCoversDate('2026-03-10', '2026-03-11'));
check('range covers its interior', entryCoversDate({ start: '2026-03-10', end: '2026-03-12' }, '2026-03-11'));
check('range covers both ends', entryCoversDate({ start: '2026-03-10', end: '2026-03-12' }, '2026-03-10') &&
    entryCoversDate({ start: '2026-03-10', end: '2026-03-12' }, '2026-03-12'));
check('range excludes just outside', !entryCoversDate({ start: '2026-03-10', end: '2026-03-12' }, '2026-03-13'));
check('overlap detects a straddling window',
    entryOverlaps({ start: '2026-03-10', end: '2026-03-20' }, '2026-03-15', '2026-03-16'));
check('overlap rejects a disjoint window',
    !entryOverlaps({ start: '2026-03-10', end: '2026-03-12' }, '2026-04-01', '2026-04-30'));
check('overlap includes touching edges',
    entryOverlaps('2026-03-10', '2026-03-10', '2026-03-10'));

// --- toEvent --------------------------------------------------------------
eq('bare date is not an event', toEvent('2026-03-10'), null);
eq('span without details is not an event', toEvent({ start: '2026-03-10', end: '2026-03-12' }), null);
eq('detailed entry becomes an event',
    toEvent({ start: '2026-03-10', end: '2026-03-10', title: 'Standup', time: '09:30', endTime: '10:00', location: 'HQ', notes: 'n' }),
    { start: '2026-03-10', end: '2026-03-10', title: 'Standup', time: '09:30', endTime: '10:00', location: 'HQ', notes: 'n' });
eq('time alone makes an event, title defaults',
    toEvent({ start: '2026-03-10', time: '09:30' }),
    { start: '2026-03-10', end: '2026-03-10', title: 'Untitled event', time: '09:30', endTime: null, location: null, notes: null });
eq('title alone makes an all-day event',
    toEvent({ start: '2026-03-10', title: 'Trip' }).time, null);

// --- ordering -------------------------------------------------------------
{
    const evs = [
        { title: 'all day', time: null },
        { title: 'late', time: '16:00' },
        { title: 'early', time: '08:00' }
    ].sort(byStartTime);
    eq('timed first in clock order, all-day last', evs.map(e => e.title), ['early', 'late', 'all day']);
}

// --- calendar kinds -------------------------------------------------------
check('ics is subscribed', isSubscribed({ type: 'ics' }));
check('single is not subscribed', !isSubscribed({ type: 'single' }));
check('group is smart', isSmart({ type: 'group' }));
check('null is neither', !isSubscribed(null) && !isSmart(null));

// --- calendarEvents -------------------------------------------------------
const local = {
    id: 'work', name: 'Work', emoji: '💼', color: '#3b82f6', type: 'single',
    dates: [
        '2026-03-09',                                                   // bare day
        { start: '2026-03-10', end: '2026-03-10', title: 'Standup', time: '09:30' },
        { start: '2026-03-11', end: '2026-03-13', title: 'Offsite' },   // multi-day
        { start: '2026-03-14', end: '2026-03-14' }                      // span, no details
    ]
};
const subscribed = {
    id: 'feed', name: 'Team', emoji: '🔗', color: '#0891b2', type: 'ics', readOnly: true,
    dates: ['2026-03-10'],
    eventsByDate: {
        '2026-03-10': [
            { title: 'Sprint demo', time: '15:00' },
            { title: 'Retro', time: '16:30', desc: 'notes here' }
        ]
    }
};
const smart = { id: 'both', name: 'Both', type: 'group', childCategoryIds: ['work', 'feed'], dates: [] };

eq('local calendar yields only detailed entries', calendarEvents(local).map(e => e.title),
    ['Standup', 'Offsite']);
eq('subscribed calendar flattens its date map', calendarEvents(subscribed).map(e => e.title),
    ['Sprint demo', 'Retro']);
eq('subscribed desc maps to notes', calendarEvents(subscribed)[1].notes, 'notes here');
eq('smart calendar owns no events', calendarEvents(smart), []);
eq('null calendar is safe', calendarEvents(null), []);

// --- calendarEventsOnDate -------------------------------------------------
eq('single-day event found on its date', calendarEventsOnDate(local, '2026-03-10').map(e => e.title), ['Standup']);
eq('bare date yields no events', calendarEventsOnDate(local, '2026-03-09'), []);
eq('multi-day event appears on an interior day',
    calendarEventsOnDate(local, '2026-03-12').map(e => e.title), ['Offsite']);
eq('multi-day event appears on its last day',
    calendarEventsOnDate(local, '2026-03-13').map(e => e.title), ['Offsite']);
eq('nothing on the day after it ends', calendarEventsOnDate(local, '2026-03-14'), []);
eq('subscribed lookup is date-keyed',
    calendarEventsOnDate(subscribed, '2026-03-10').map(e => e.title), ['Sprint demo', 'Retro']);
eq('subscribed miss returns empty', calendarEventsOnDate(subscribed, '2026-03-11'), []);

// --- across calendars -----------------------------------------------------
const calendars = [local, subscribed, smart];

eq('allEvents spans calendars and tags each', allEvents(calendars).map(e => `${e.calendar.id}:${e.title}`),
    ['work:Standup', 'work:Offsite', 'feed:Sprint demo', 'feed:Retro']);
eq('allEvents can be restricted', allEvents(calendars, ['feed']).map(e => e.title),
    ['Sprint demo', 'Retro']);

{
    const groups = eventsOnDate(calendars, '2026-03-10');
    eq('grouped by calendar in order', groups.map(g => g.calendar.id), ['work', 'feed']);
    eq('local group is editable', groups[0].editable, true);
    eq('subscribed group is not editable', groups[1].editable, false);
    eq('empty calendars are omitted', eventsOnDate(calendars, '2026-03-09'), []);
    eq('restriction is honoured',
        eventsOnDate(calendars, '2026-03-10', ['feed']).map(g => g.calendar.id), ['feed']);
}

// --- ordering within a day ------------------------------------------------
{
    const busy = {
        id: 'x', type: 'single', dates: [
            { start: '2026-05-01', title: 'Late', time: '17:00' },
            { start: '2026-05-01', title: 'All day' },
            { start: '2026-05-01', title: 'Early', time: '07:15' }
        ]
    };
    eq('day events sorted, all-day last',
        calendarEventsOnDate(busy, '2026-05-01').map(e => e.title), ['Early', 'Late', 'All day']);
}

// --- resilience -----------------------------------------------------------
eq('missing dates array', calendarEvents({ id: 'a', type: 'single' }), []);
eq('malformed entries skipped',
    calendarEvents({ id: 'a', type: 'single', dates: [null, {}, '', { end: '2026-01-01' }] }), []);
eq('subscribed without a map', calendarEvents({ id: 'a', type: 'ics' }), []);
eq('allEvents with no calendars', allEvents(null), []);
eq('eventsOnDate with no calendars', eventsOnDate(null, '2026-01-01'), []);

done();
