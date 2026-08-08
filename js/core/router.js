/**
 * Ordered click routing.
 *
 * Event handling grew into one 400-line function containing ~40 sequential
 * `if (closest(...))` branches and 78 `closest()` calls — a hand-written
 * router with no routing table. Order mattered (some branches returned, others
 * fell through) but that was implicit, adding a route meant editing the
 * monolith, and nothing could be torn down or inspected.
 *
 * A route is `{ match, run, stop?, when? }`:
 *   match  CSS selector tested with `closest()` from the event target
 *   run    (element, event) => void
 *   stop   whether matching ends dispatch; defaults to true. `false`
 *          reproduces the branches that deliberately fell through.
 *   when   extra predicate, for branches guarded by more than a selector
 *
 * Routes are tried in array order, so the table reads as the if-chain did and
 * the ordering is now data rather than control flow.
 */

/**
 * Run the first matching route (and any later ones it does not stop).
 * Returns the number of routes that ran, which the tests assert on.
 */
export function dispatch(routes, event, target = event.target) {
    if (!target || typeof target.closest !== 'function') return 0;
    let ran = 0;

    for (const route of routes) {
        const element = target.closest(route.match);
        if (!element) continue;
        if (route.when && !route.when(element, event)) continue;

        route.run(element, event);
        ran++;
        if (route.stop !== false) break;
    }
    return ran;
}

/**
 * Build a listener for a route table.
 * `before` runs on every click regardless of routing — for the handful of
 * behaviours that are about where the click was *not* (dismissing a popover,
 * closing an open dropdown).
 */
export function createClickHandler(routes, { before = null, skip = null } = {}) {
    return (event) => {
        if (skip && skip(event)) return;
        if (before) before(event);
        dispatch(routes, event);
    };
}

/**
 * Report selectors that can never match because an earlier stopping route
 * already covers them. Used by the tests to keep the table honest as it grows.
 */
export function findShadowedRoutes(routes) {
    const shadowed = [];
    const stoppers = [];
    for (const route of routes) {
        const duplicate = stoppers.find(s => s.match === route.match);
        if (duplicate) shadowed.push(route.match);
        if (route.stop !== false) stoppers.push(route);
    }
    return shadowed;
}
