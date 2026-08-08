/**
 * Router tests.
 *
 * Ordering and stop semantics are what the old if-chain encoded implicitly, so
 * they are what a table has to reproduce exactly. These use a tiny fake element
 * rather than a DOM, keeping the suite in the fast, browser-free tier.
 */

import { dispatch, createClickHandler, findShadowedRoutes } from '../../js/core/router.js';
import { createSuite } from '../helpers/assert.mjs';

const { check, eq, done } = createSuite('router');

/** Minimal stand-in for an event target: `closest` matches against a tag list. */
function fakeTarget(selectors) {
    const owned = new Set(selectors);
    const el = {
        closest: (query) => query.split(',').some(s => owned.has(s.trim())) ? el : null,
        tag: selectors[0]
    };
    return el;
}
const evt = (selectors, extra = {}) => ({ target: fakeTarget(selectors), ...extra });

// --- basic matching -------------------------------------------------------
{
    const hit = [];
    const routes = [{ match: '#a', run: () => hit.push('a') }];
    eq('a matching route runs', dispatch(routes, evt(['#a'])), 1);
    eq('it ran once', hit, ['a']);
    eq('a non-matching event runs nothing', dispatch(routes, evt(['#zzz'])), 0);
}

// --- order and stopping ---------------------------------------------------
{
    const hit = [];
    const routes = [
        { match: '#a', run: () => hit.push('first') },
        { match: '#a', run: () => hit.push('second') }
    ];
    dispatch(routes, evt(['#a']));
    eq('the first matching route wins and stops', hit, ['first']);
}
{
    const hit = [];
    const routes = [
        { match: '#a', stop: false, run: () => hit.push('first') },
        { match: '#a', run: () => hit.push('second') },
        { match: '#a', run: () => hit.push('third') }
    ];
    eq('stop:false falls through to the next match', dispatch(routes, evt(['#a'])), 2);
    eq('and stops at the next stopping route', hit, ['first', 'second']);
}
{
    // The exact shape the old chain relied on: several fall-through branches
    // followed by a stopping one.
    const hit = [];
    const routes = [
        { match: '#nav', stop: false, run: () => hit.push('nav') },
        { match: '#other', run: () => hit.push('other') },
        { match: '#nav', run: () => hit.push('nav-stop') }
    ];
    dispatch(routes, evt(['#nav']));
    eq('non-matching routes are skipped while falling through', hit, ['nav', 'nav-stop']);
}

// --- the `when` predicate -------------------------------------------------
{
    const hit = [];
    const routes = [
        { match: '#a', when: () => false, run: () => hit.push('blocked') },
        { match: '#a', run: () => hit.push('allowed') }
    ];
    dispatch(routes, evt(['#a']));
    eq('a failing predicate skips to the next route', hit, ['allowed']);
}
{
    let seen = null;
    const routes = [{ match: '.emoji-input', when: (el, e) => e.detail === 2, run: () => { seen = 'opened'; } }];
    dispatch(routes, evt(['.emoji-input'], { detail: 1 }));
    eq('single click does not open the picker', seen, null);
    dispatch(routes, evt(['.emoji-input'], { detail: 2 }));
    eq('double click does', seen, 'opened');
}

// --- multi-selector matches -----------------------------------------------
{
    const hit = [];
    const routes = [{ match: '#prev-year-btn, #nav-prev-btn', run: () => hit.push('prev') }];
    dispatch(routes, evt(['#nav-prev-btn']));
    eq('a comma-separated selector matches either side', hit, ['prev']);
}

// --- handler arguments ----------------------------------------------------
{
    let element = null, event = null;
    const routes = [{ match: '#a', run: (el, e) => { element = el; event = e; } }];
    const e = evt(['#a']);
    dispatch(routes, e);
    check('run receives the matched element', element && element.tag === '#a');
    check('run receives the event', event === e);
}

// --- createClickHandler ---------------------------------------------------
{
    const order = [];
    const handler = createClickHandler(
        [{ match: '#a', run: () => order.push('route') }],
        { before: () => order.push('before') }
    );
    handler(evt(['#a']));
    eq('before runs ahead of routing', order, ['before', 'route']);
}
{
    const order = [];
    const handler = createClickHandler(
        [{ match: '#a', run: () => order.push('route') }],
        { before: () => order.push('before') }
    );
    handler(evt(['#nothing']));
    eq('before runs even when no route matches', order, ['before']);
}
{
    const order = [];
    const handler = createClickHandler(
        [{ match: '#a', run: () => order.push('route') }],
        { before: () => order.push('before'), skip: () => true }
    );
    handler(evt(['#a']));
    eq('skip short-circuits before and routing alike', order, []);
}

// --- resilience -----------------------------------------------------------
eq('no routes is safe', dispatch([], evt(['#a'])), 0);
eq('a target without closest is safe', dispatch([{ match: '#a', run: () => {} }], { target: {} }), 0);
eq('a null target is safe', dispatch([{ match: '#a', run: () => {} }], { target: null }), 0);

// --- shadow detection -----------------------------------------------------
{
    eq('an unreachable duplicate is reported',
        findShadowedRoutes([
            { match: '#a', run: () => {} },
            { match: '#a', run: () => {} }
        ]), ['#a']);
    eq('a duplicate after a fall-through route is fine',
        findShadowedRoutes([
            { match: '#a', stop: false, run: () => {} },
            { match: '#a', run: () => {} }
        ]), []);
    eq('distinct selectors are fine',
        findShadowedRoutes([
            { match: '#a', run: () => {} },
            { match: '#b', run: () => {} }
        ]), []);
}

done();
