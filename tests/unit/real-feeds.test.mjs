/**
 * Parse real calendar feeds captured from live providers.
 *
 * These fixtures are genuine responses from Google Calendar, gov.uk, and
 * calendarlabs — not hand-written samples. They cover line folding, escaped
 * text, non-ASCII titles, and the exclusive-DTEND convention as those services
 * actually emit them, which is where hand-written fixtures tend to be wrong.
 */

import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';
import { parseICS, eventsToDates, eventsToDetails } from '../../js/modules/ics.js';
import { createSuite } from '../helpers/assert.mjs';

const { check, eq, done } = createSuite('real feeds');
const FIXTURES = fileURLToPath(new URL('../fixtures', import.meta.url));

const isDate = v => /^\d{4}-\d{2}-\d{2}$/.test(v);

let totalEvents = 0;

for (const file of readdirSync(FIXTURES).filter(f => f.endsWith('.ics')).sort()) {
    const raw = readFileSync(join(FIXTURES, file), 'utf-8');
    const declared = (raw.match(/BEGIN:VEVENT/g) || []).length;
    const { events, calendarName } = parseICS(raw);
    const dates = eventsToDates(events, '2015-01-01', '2035-12-31');
    totalEvents += events.length;

    check(`${file}: every VEVENT parsed`, events.length === declared,
        `${events.length}/${declared}`);
    check(`${file}: all start/end dates well-formed`,
        events.every(e => isDate(e.start) && isDate(e.end)));
    check(`${file}: no inverted spans`, events.every(e => e.end >= e.start));
    check(`${file}: expanded dates well-formed`,
        dates.every(d => typeof d === 'string'
            ? isDate(d)
            : isDate(d.start) && isDate(d.end)));
    check(`${file}: calendar name or graceful blank`, typeof calendarName === 'string');
}

check('fixtures cover a meaningful corpus', totalEvents > 200, `${totalEvents} real events`);

// Non-ASCII titles must survive parsing intact.
{
    const jp = parseICS(readFileSync(join(FIXTURES, 'google-japan-holidays.ics'), 'utf-8'));
    const de = parseICS(readFileSync(join(FIXTURES, 'google-germany-holidays.ics'), 'utf-8'));
    check('japanese feed keeps titles', jp.events.every(e => e.summary.length > 0));
    check('german feed keeps titles', de.events.every(e => e.summary.length > 0));
    check('german feed has a name', de.calendarName.length > 0, de.calendarName);
}

// Google emits all-day holidays with an exclusive DTEND; a single-day holiday
// must therefore collapse to one day, not two.
{
    const us = parseICS(readFileSync(join(FIXTURES, 'google-us-holidays.ics'), 'utf-8'));
    const singleDay = us.events.filter(e => e.start === e.end);
    check('exclusive DTEND collapses single-day holidays', singleDay.length > 0,
        `${singleDay.length} single-day events`);
    check('all-day events carry no time', us.events.every(e => !e.allDay || e.time === null));

    const details = eventsToDetails(us.events, '2015-01-01', '2035-12-31');
    const withDesc = Object.values(details).flat().filter(e => e.desc);
    check('descriptions captured from a real feed', withDesc.length > 0,
        `${withDesc.length} entries with a description`);
}

// Folded lines: Google wraps long DESCRIPTION values, which must rejoin without
// leaving the continuation space behind.
{
    const us = readFileSync(join(FIXTURES, 'google-us-holidays.ics'), 'utf-8');
    check('fixture genuinely contains folded lines', /\n[ \t]/.test(us));
    const { events } = parseICS(us);
    const broken = events.filter(e => /\n /.test(e.summary) || /^\s/.test(e.summary));
    eq('no unfolding artifacts in titles', broken.length, 0);
}

done();
