import { parseICS, eventsToDates, eventsToDetails } from '../../js/modules/ics.js';
import { createSuite } from '../helpers/assert.mjs';

const { eq, done } = createSuite('ics parser');

const wrap = body => `BEGIN:VCALENDAR\nVERSION:2.0\n${body}\nEND:VCALENDAR`;

// --- all-day event: DTEND is exclusive and must be pulled back a day ---
{
  const { events } = parseICS(wrap(
    `BEGIN:VEVENT\nUID:1\nSUMMARY:Trip\nDTSTART;VALUE=DATE:20260310\nDTEND;VALUE=DATE:20260313\nEND:VEVENT`));
  eq('all-day span start', events[0].start, '2026-03-10');
  eq('all-day DTEND exclusive -> inclusive', events[0].end, '2026-03-12');
  eq('all-day flagged', events[0].allDay, true);
  eq('multi-day becomes a range', eventsToDates(events, '2026-01-01', '2026-12-31'),
     [{ start: '2026-03-10', end: '2026-03-12' }]);
}

// --- single all-day event ---
{
  const { events } = parseICS(wrap(
    `BEGIN:VEVENT\nUID:2\nDTSTART;VALUE=DATE:20260401\nDTEND;VALUE=DATE:20260402\nEND:VEVENT`));
  eq('single all-day collapses to a string', eventsToDates(events, '2026-01-01', '2026-12-31'), ['2026-04-01']);
}

// --- missing DTEND falls back to DTSTART ---
{
  const { events } = parseICS(wrap(`BEGIN:VEVENT\nUID:3\nDTSTART;VALUE=DATE:20260505\nEND:VEVENT`));
  eq('no DTEND -> same day', eventsToDates(events, '2026-01-01', '2026-12-31'), ['2026-05-05']);
}

// --- timed event, UTC ---
{
  const { events } = parseICS(wrap(
    `BEGIN:VEVENT\nUID:4\nDTSTART:20260610T140000Z\nDTEND:20260610T150000Z\nEND:VEVENT`),
    { timeZone: 'UTC' });
  eq('timed UTC event date', events[0].start, '2026-06-10');
  eq('timed event is not allDay', events[0].allDay, false);
}

// --- line folding ---
{
  const { events } = parseICS(wrap(
    `BEGIN:VEVENT\nUID:5\nSUMMARY:A very long title that got\n  folded across lines\nDTSTART;VALUE=DATE:20260707\nEND:VEVENT`));
  eq('folded line rejoined', events[0].summary, 'A very long title that got folded across lines');
}

// --- escaped text ---
{
  const { events } = parseICS(wrap(
    `BEGIN:VEVENT\nUID:6\nSUMMARY:Lunch\\, then gym\\; later\nDTSTART;VALUE=DATE:20260808\nEND:VEVENT`));
  eq('escaped comma and semicolon', events[0].summary, 'Lunch, then gym; later');
}

// --- calendar name ---
{
  const { calendarName } = parseICS(`BEGIN:VCALENDAR\nX-WR-CALNAME:Team Calendar\nEND:VCALENDAR`);
  eq('X-WR-CALNAME extracted', calendarName, 'Team Calendar');
}

// --- RRULE: weekly with COUNT ---
{
  const { events } = parseICS(wrap(
    `BEGIN:VEVENT\nUID:7\nDTSTART;VALUE=DATE:20260105\nRRULE:FREQ=WEEKLY;COUNT=3\nEND:VEVENT`));
  eq('weekly COUNT=3', eventsToDates(events, '2026-01-01', '2026-12-31'),
     ['2026-01-05', '2026-01-12', '2026-01-19']);
}

// --- RRULE: daily with UNTIL ---
{
  const { events } = parseICS(wrap(
    `BEGIN:VEVENT\nUID:8\nDTSTART;VALUE=DATE:20260201\nRRULE:FREQ=DAILY;UNTIL=20260204T000000Z\nEND:VEVENT`));
  eq('daily UNTIL', eventsToDates(events, '2026-01-01', '2026-12-31'),
     ['2026-02-01', '2026-02-02', '2026-02-03', '2026-02-04']);
}

// --- RRULE: weekly BYDAY ---
{
  // 2026-03-02 is a Monday
  const { events } = parseICS(wrap(
    `BEGIN:VEVENT\nUID:9\nDTSTART;VALUE=DATE:20260302\nRRULE:FREQ=WEEKLY;BYDAY=MO,WE;COUNT=4\nEND:VEVENT`));
  eq('weekly BYDAY MO,WE', eventsToDates(events, '2026-01-01', '2026-12-31'),
     ['2026-03-02', '2026-03-04', '2026-03-09', '2026-03-11']);
}

// --- RRULE: monthly clamps short months ---
{
  const { events } = parseICS(wrap(
    `BEGIN:VEVENT\nUID:10\nDTSTART;VALUE=DATE:20260131\nRRULE:FREQ=MONTHLY;COUNT=3\nEND:VEVENT`));
  eq('monthly clamps Jan 31 -> Feb 28', eventsToDates(events, '2026-01-01', '2026-12-31'),
     ['2026-01-31', '2026-02-28', '2026-03-31']);
}

// --- RRULE: interval ---
{
  const { events } = parseICS(wrap(
    `BEGIN:VEVENT\nUID:11\nDTSTART;VALUE=DATE:20260601\nRRULE:FREQ=DAILY;INTERVAL=3;COUNT=3\nEND:VEVENT`));
  eq('daily INTERVAL=3', eventsToDates(events, '2026-01-01', '2026-12-31'),
     ['2026-06-01', '2026-06-04', '2026-06-07']);
}

// --- EXDATE removes an occurrence ---
{
  const { events } = parseICS(wrap(
    `BEGIN:VEVENT\nUID:12\nDTSTART;VALUE=DATE:20260105\nRRULE:FREQ=WEEKLY;COUNT=3\nEXDATE;VALUE=DATE:20260112\nEND:VEVENT`));
  eq('EXDATE excluded', eventsToDates(events, '2026-01-01', '2026-12-31'),
     ['2026-01-05', '2026-01-19']);
}

// --- window filtering ---
{
  const { events } = parseICS(wrap(
    `BEGIN:VEVENT\nUID:13\nDTSTART;VALUE=DATE:20200101\nEND:VEVENT`));
  eq('event outside window dropped', eventsToDates(events, '2026-01-01', '2026-12-31'), []);
}

// --- unbounded RRULE stays bounded by the window ---
{
  const { events } = parseICS(wrap(
    `BEGIN:VEVENT\nUID:14\nDTSTART;VALUE=DATE:20260101\nRRULE:FREQ=DAILY\nEND:VEVENT`));
  const dates = eventsToDates(events, '2026-01-01', '2026-12-31');
  eq('unbounded daily is capped', dates.length <= 500, true);
  eq('unbounded daily starts correctly', dates[0], '2026-01-01');
}

// --- DURATION ---
{
  const { events } = parseICS(wrap(
    `BEGIN:VEVENT\nUID:15\nDTSTART;VALUE=DATE:20260901\nDURATION:P3D\nEND:VEVENT`));
  eq('DURATION P3D -> 3-day inclusive range', eventsToDates(events, '2026-01-01', '2026-12-31'),
     [{ start: '2026-09-01', end: '2026-09-03' }]);
}

// --- quoted param containing a colon must not split the line ---
{
  const { events } = parseICS(wrap(
    `BEGIN:VEVENT\nUID:16\nDTSTART;TZID="Weird:Zone":20261101T090000\nEND:VEVENT`));
  eq('quoted TZID param survives', events[0].start, '2026-11-01');
}

// --- CRLF line endings ---
{
  const { events } = parseICS(
    `BEGIN:VCALENDAR\r\nBEGIN:VEVENT\r\nUID:17\r\nDTSTART;VALUE=DATE:20261225\r\nEND:VEVENT\r\nEND:VCALENDAR`);
  eq('CRLF parsed', events[0].start, '2026-12-25');
}

// --- garbage input degrades gracefully ---
{
  eq('empty string', parseICS('').events, []);
  eq('null', parseICS(null).events, []);
  eq('non-calendar text', parseICS('hello world').events, []);
}

// --- end before start is corrected ---
{
  const { events } = parseICS(wrap(
    `BEGIN:VEVENT\nUID:18\nDTSTART;VALUE=DATE:20260510\nDTEND;VALUE=DATE:20260501\nEND:VEVENT`));
  eq('end<start corrected', events[0].end, '2026-05-10');
}

// --- duplicate occurrences deduped ---
{
  const { events } = parseICS(wrap(
    `BEGIN:VEVENT\nUID:19\nDTSTART;VALUE=DATE:20260601\nEND:VEVENT\n` +
    `BEGIN:VEVENT\nUID:20\nDTSTART;VALUE=DATE:20260601\nEND:VEVENT`));
  eq('identical dates deduped', eventsToDates(events, '2026-01-01', '2026-12-31'), ['2026-06-01']);
}


// ---------- details: titles and times ----------
{
  const { events } = parseICS(wrap(
    `BEGIN:VEVENT\nUID:t1\nSUMMARY:Standup\nDTSTART:20260310T093000\nDTEND:20260310T100000\nEND:VEVENT\n` +
    `BEGIN:VEVENT\nUID:t2\nSUMMARY:Offsite\nDTSTART;VALUE=DATE:20260310\nDTEND;VALUE=DATE:20260312\nEND:VEVENT`));
  eq('floating time kept', events[0].time, '09:30');
  eq('all-day has no time', events[1].time, null);

  const byDate = eventsToDetails(events, '2026-01-01', '2026-12-31');
  eq('both events on shared day, timed first',
     byDate['2026-03-10'].map(e => `${e.time || ''}|${e.title}`),
     ['09:30|Standup', '|Offsite']);
  eq('multi-day event appears on second day', byDate['2026-03-11'][0].title, 'Offsite');
}
{
  const { events } = parseICS(wrap(
    `BEGIN:VEVENT\nUID:t3\nSUMMARY:UTC meeting\nDTSTART:20260610T140000Z\nEND:VEVENT`), { timeZone: 'UTC' });
  eq('zulu time resolved in zone', events[0].time, '14:00');
}
{
  const { events } = parseICS(wrap(
    `BEGIN:VEVENT\nUID:t4\nDTSTART;VALUE=DATE:20260701\nEND:VEVENT`));
  const byDate = eventsToDetails(events, '2026-01-01', '2026-12-31');
  eq('missing summary falls back', byDate['2026-07-01'][0].title, 'Untitled event');
}
{
  const { events } = parseICS(wrap(
    `BEGIN:VEVENT\nUID:t5\nSUMMARY:Daily\nDTSTART;VALUE=DATE:20260101\nRRULE:FREQ=DAILY\nEND:VEVENT`));
  const byDate = eventsToDetails(events, '2026-01-01', '2039-12-31');
  eq('details map is bounded', Object.keys(byDate).length <= 4000, true);
}

// ---------- full details: description, location, end time ----------
{
  const { events } = parseICS(wrap(
    `BEGIN:VEVENT\nUID:f1\nSUMMARY:Standup\nDESCRIPTION:Daily sync\\nwith the team\nLOCATION:Room 4\\, HQ\nDTSTART:20260310T093000\nDTEND:20260310T101500\nEND:VEVENT`));
  eq('description unescaped', events[0].description, 'Daily sync\nwith the team');
  eq('location unescaped', events[0].location, 'Room 4, HQ');
  eq('end time kept', events[0].endTime, '10:15');

  const byDate = eventsToDetails(events, '2026-01-01', '2026-12-31');
  const e0 = byDate['2026-03-10'][0];
  eq('detail entry carries range + loc + desc',
     { t: e0.title, a: e0.time, b: e0.endTime, l: e0.location, d: e0.desc },
     { t: 'Standup', a: '09:30', b: '10:15', l: 'Room 4, HQ', d: 'Daily sync with the team' });
}
{
  // Optional fields absent -> compact entries
  const { events } = parseICS(wrap(
    `BEGIN:VEVENT\nUID:f2\nSUMMARY:Holiday\nDTSTART;VALUE=DATE:20260401\nEND:VEVENT`));
  const e0 = eventsToDetails(events, '2026-01-01', '2026-12-31')['2026-04-01'][0];
  eq('no optional keys when absent', Object.keys(e0).sort(), ['time', 'title']);
}
{
  // Caps hold
  const long = 'x'.repeat(500);
  const { events } = parseICS(wrap(
    `BEGIN:VEVENT\nUID:f3\nSUMMARY:S\nDESCRIPTION:${long}\nLOCATION:${long}\nDTSTART;VALUE=DATE:20260402\nEND:VEVENT`));
  const e0 = eventsToDetails(events, '2026-01-01', '2026-12-31')['2026-04-02'][0];
  eq('description capped at 280', e0.desc.length, 280);
  eq('location capped at 80', e0.location.length, 80);
}

done();
