/**
 * Focus and grid-navigation arithmetic.
 *
 * The date maths is the part that goes wrong — month ends, week boundaries,
 * year rollover — and it is much cheaper to pin here than through a browser.
 * The DOM-dependent half (focus traps, roving tabindex) is covered by the
 * accessibility e2e suite.
 */

import { nextDateForKey, dayCellLabel, GRID_KEYS, FOCUSABLE_SELECTOR } from '../../js/core/a11y.js';
import { createSuite } from '../helpers/assert.mjs';

const { check, eq, done } = createSuite('a11y');

// --- single steps ---------------------------------------------------------
eq('left goes back a day',     nextDateForKey('2026-03-10', 'ArrowLeft'),  '2026-03-09');
eq('right goes forward a day', nextDateForKey('2026-03-10', 'ArrowRight'), '2026-03-11');
eq('up goes back a week',      nextDateForKey('2026-03-10', 'ArrowUp'),    '2026-03-03');
eq('down goes forward a week', nextDateForKey('2026-03-10', 'ArrowDown'),  '2026-03-17');

// --- crossing boundaries --------------------------------------------------
eq('left across a month start', nextDateForKey('2026-03-01', 'ArrowLeft'),  '2026-02-28');
eq('right across a month end',  nextDateForKey('2026-01-31', 'ArrowRight'), '2026-02-01');
eq('up across a month start',   nextDateForKey('2026-03-03', 'ArrowUp'),    '2026-02-24');
eq('left across a year start',  nextDateForKey('2026-01-01', 'ArrowLeft'),  '2025-12-31');
eq('right across a year end',   nextDateForKey('2025-12-31', 'ArrowRight'), '2026-01-01');
eq('a leap day is reachable',   nextDateForKey('2024-02-28', 'ArrowRight'), '2024-02-29');
eq('and passable',              nextDateForKey('2024-02-29', 'ArrowRight'), '2024-03-01');

// --- week ends, Monday-first to match the column headers ------------------
// 2026-03-10 is a Tuesday.
eq('Home goes to Monday of that week', nextDateForKey('2026-03-10', 'Home'), '2026-03-09');
eq('End goes to Sunday of that week',  nextDateForKey('2026-03-10', 'End'),  '2026-03-15');
eq('Home on a Monday stays put',       nextDateForKey('2026-03-09', 'Home'), '2026-03-09');
eq('End on a Sunday stays put',        nextDateForKey('2026-03-15', 'End'),  '2026-03-15');
// 2026-03-01 is a Sunday: with weeks starting Monday it belongs to February's
// last week, which is exactly the trap a Sunday-first implementation falls in.
eq('Home from a Sunday reaches back into the previous month',
    nextDateForKey('2026-03-01', 'Home'), '2026-02-23');

// --- month paging ---------------------------------------------------------
eq('PageDown advances a month', nextDateForKey('2026-03-10', 'PageDown'), '2026-04-10');
eq('PageUp goes back a month',  nextDateForKey('2026-03-10', 'PageUp'),   '2026-02-10');
// The bug this app already fixed once, in recurrence: stepping from a clamped
// date drifts. Jan 31 + one month must not land in March.
eq('PageDown from a month end clamps instead of drifting',
    nextDateForKey('2026-01-31', 'PageDown'), '2026-02-28');
eq('PageDown into a leap February', nextDateForKey('2024-01-31', 'PageDown'), '2024-02-29');
eq('PageUp across a year start',    nextDateForKey('2026-01-15', 'PageUp'),   '2025-12-15');
eq('PageDown across a year end',    nextDateForKey('2025-12-15', 'PageDown'), '2026-01-15');

// --- keys that do nothing -------------------------------------------------
eq('Enter does not move',  nextDateForKey('2026-03-10', 'Enter'), null);
eq('a letter does not move', nextDateForKey('2026-03-10', 'a'),   null);
eq('a malformed date yields nothing', nextDateForKey('not-a-date', 'ArrowLeft'), null);

check('every moving key is declared in GRID_KEYS',
    ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End', 'PageUp', 'PageDown']
        .every(k => GRID_KEYS.has(k)));
check('GRID_KEYS declares nothing that does not move',
    [...GRID_KEYS].every(k => nextDateForKey('2026-03-10', k) !== null));

// --- spoken labels --------------------------------------------------------
// A cell announcing "3" is useless in a list of 42 cells.
{
    const plain = dayCellLabel('2026-03-10');
    check('a label names the weekday, day, month and year',
        /Tuesday/.test(plain) && /10/.test(plain) && /March/.test(plain) && /2026/.test(plain), plain);
    check('an empty day says so', /no events/.test(plain), plain);

    const withCats = dayCellLabel('2026-03-10', { categoryNames: ['Work', 'Leave'] });
    check('categories are named', /Work/.test(withCats) && /Leave/.test(withCats), withCats);
    check('a day with events does not also claim to be empty',
        !/no events/.test(withCats), withCats);

    const withEvents = dayCellLabel('2026-03-10', {
        categoryNames: ['Work'], eventTitles: ['Dentist', 'Standup']
    });
    check('event titles win over category names',
        /Dentist/.test(withEvents) && /Standup/.test(withEvents) && !/Work/.test(withEvents),
        withEvents);

    check('today is announced as today', /^Today,/.test(dayCellLabel('2026-03-10', { isToday: true })));
    eq('a malformed date falls back to itself', dayCellLabel('nope'), 'nope');
}

// --- the focusable selector -----------------------------------------------
// tabindex="-1" is how day cells are held out of the tab order; a trap that
// treated them as stops would put 504 cells inside the dialog cycle.
check('programmatic focus targets are not tab stops',
    !FOCUSABLE_SELECTOR.includes('[tabindex="-1"]:not') &&
    FOCUSABLE_SELECTOR.includes('[tabindex]:not([tabindex="-1"])'));
check('disabled controls are excluded', FOCUSABLE_SELECTOR.includes('button:not([disabled])'));

done();
