/**
 * State notification tests.
 *
 * The batching is the subtle part: setters must coalesce within a task so a
 * burst produces one repaint, and a thrown listener must not silence the ones
 * after it.
 */

import { getState, setState, subscribe, notifyChange, silently } from '../../js/core/state.js';
import { createSuite } from '../helpers/assert.mjs';

const { check, eq, done } = createSuite('state');

/** Notifications land in a microtask; wait for the queue to drain. */
const flush = () => new Promise(resolve => setTimeout(resolve, 0));

// --- getters and setters still work ---------------------------------------
setState.currentYear(2031);
eq('setter and getter round-trip', getState.currentYear(), 2031);

// --- a subscriber is called ------------------------------------------------
{
    let calls = 0;
    const off = subscribe(() => calls++);
    setState.currentYear(2032);
    eq('notification is deferred, not synchronous', calls, 0);
    await flush();
    eq('subscriber ran once after the task', calls, 1);
    off();
}

// --- unsubscribe ----------------------------------------------------------
{
    let calls = 0;
    const off = subscribe(() => calls++);
    off();
    setState.currentYear(2033);
    await flush();
    eq('unsubscribed listener is not called', calls, 0);
}

// --- batching -------------------------------------------------------------
{
    let calls = 0;
    const off = subscribe(() => calls++);
    setState.currentYear(2034);
    setState.currentMonth(5);
    setState.activeFilter('work');
    await flush();
    eq('a burst of setters produces one notification', calls, 1);
    off();
}

// --- reasons --------------------------------------------------------------
{
    let seen = null;
    const off = subscribe(reasons => { seen = reasons; });
    setState.config({ eventCategories: [] });
    await flush();
    check('config change reports "data"', seen && seen.has('data'), [...(seen || [])].join(','));
    off();
}
{
    let seen = null;
    const off = subscribe(reasons => { seen = reasons; });
    setState.activeFilter('all');
    await flush();
    check('filter change reports "view"', seen && seen.has('view'), [...(seen || [])].join(','));
    off();
}
{
    let seen = null;
    const off = subscribe(reasons => { seen = reasons; });
    setState.config({ eventCategories: [] });
    setState.currentYear(2035);
    await flush();
    check('a mixed burst reports both reasons',
        seen && seen.has('data') && seen.has('view'), [...(seen || [])].join(','));
    off();
}

// --- transient state must not repaint -------------------------------------
{
    let calls = 0;
    const off = subscribe(() => calls++);
    setState.isDragging(true);
    setState.undoState({ type: 'x' });
    setState.parsedCategoriesCache([]);
    setState.pendingBackupData({});
    await flush();
    eq('transient setters do not notify', calls, 0);
    setState.isDragging(false);
    setState.undoState(null);
    off();
}

// --- listener isolation ---------------------------------------------------
{
    const order = [];
    const originalError = console.error;
    console.error = () => {};                 // the failure is expected here
    const offA = subscribe(() => { order.push('a'); throw new Error('boom'); });
    const offB = subscribe(() => order.push('b'));
    setState.currentYear(2036);
    await flush();
    console.error = originalError;
    eq('a throwing listener does not stop the next one', order, ['a', 'b']);
    offA(); offB();
}

// --- multiple subscribers -------------------------------------------------
{
    let a = 0, b = 0;
    const offA = subscribe(() => a++);
    const offB = subscribe(() => b++);
    setState.currentYear(2037);
    await flush();
    eq('every subscriber is notified', [a, b], [1, 1]);
    offA(); offB();
}

// --- silently -------------------------------------------------------------
{
    let calls = 0;
    const off = subscribe(() => calls++);
    silently(() => {
        setState.currentYear(2038);
        setState.currentMonth(1);
    });
    await flush();
    eq('silently() suppresses notification', calls, 0);
    eq('but the state still changed', getState.currentYear(), 2038);
    off();
}

// --- notifyChange directly ------------------------------------------------
{
    let seen = null;
    const off = subscribe(reasons => { seen = reasons; });
    notifyChange('custom');
    await flush();
    check('an explicit reason is delivered', seen && seen.has('custom'));
    off();
}

// --- no subscribers is safe -----------------------------------------------
{
    let threw = false;
    try {
        setState.currentYear(2039);
        await flush();
    } catch (e) { threw = true; }
    check('notifying with no subscribers is harmless', !threw);
}

done();
