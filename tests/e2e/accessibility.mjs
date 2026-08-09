import { startServer, launchBrowser, trackErrors } from '../helpers/browser.mjs';
import { createSuite } from '../helpers/assert.mjs';

/**
 * Keyboard and assistive-technology access.
 *
 * Written from an audit rather than a bug report, because the people this
 * affects were not able to file one. Before this, no modal carried
 * role="dialog" or trapped focus — Tab walked straight out of an open dialog
 * into the calendar behind it — and day cells were bare divs with no role, no
 * tabindex and no name, so the calendar grid could not be reached by keyboard
 * at all.
 *
 * The contract these pin down:
 *   dialogs   announce themselves, name themselves after the visible view,
 *             take focus on open, hold it, and hand it back on close
 *   the grid  is reachable, arrow-navigable, and every cell says what it is
 *   toasts    announce themselves
 */

const { check, done } = createSuite('accessibility');
const server = await startServer();
const BASE = server.baseUrl;
const browser = await launchBrowser();

const ctx = await browser.newContext();
const page = await ctx.newPage();
const errors = trackErrors(page);

await page.goto(BASE, { waitUntil: 'domcontentloaded' });
await page.evaluate(() => localStorage.setItem('calendar-walkthrough-v4-seen', '1'));
await page.goto(BASE, { waitUntil: 'networkidle' });
await page.waitForTimeout(800);

const active = () => page.evaluate(() =>
    document.activeElement.id || document.activeElement.className || document.activeElement.tagName);
const closeAll = async () => {
    for (let i = 0; i < 4 && await page.locator('.modal-overlay.visible').count() > 0; i++) {
        await page.keyboard.press('Escape');
        await page.waitForTimeout(300);
    }
};

// --- the calendar is a grid, and says so ---------------------------------
// role="gridcell" is invalid outside a row, so the weeks are real elements
// carrying `display: contents` — the seven-column layout must be untouched.
{
    const cdp = await ctx.newCDPSession(page);
    await cdp.send('Accessibility.enable');
    const { nodes } = await cdp.send('Accessibility.getFullAXTree');
    const roles = nodes.reduce((m, n) => {
        const r = n.role?.value;
        if (r) m[r] = (m[r] || 0) + 1;
        return m;
    }, {});
    check('grids are exposed', (roles.grid || 0) >= 1, `${roles.grid || 0} grids`);
    check('rows are exposed', (roles.row || 0) >= 6, `${roles.row || 0} rows`);
    check('day cells are exposed as gridcells', (roles.gridcell || 0) >= 42,
        `${roles.gridcell || 0} gridcells`);
    check('weekday headers are exposed', (roles.columnheader || 0) >= 7,
        `${roles.columnheader || 0} columnheaders`);

    const layout = await page.evaluate(() => {
        const cells = [...document.querySelectorAll('.calendar-grid .day')];
        const left = els => els.map(c => Math.round(c.getBoundingClientRect().left));
        return {
            cells: cells.length,
            columns: new Set(left(cells.slice(0, 7))).size,
            aligned: JSON.stringify(left(cells.slice(0, 7))) === JSON.stringify(left(cells.slice(7, 14)))
        };
    });
    check('rows did not disturb the seven-column layout',
        layout.columns === 7 && layout.aligned, JSON.stringify(layout));
}

// --- every cell has a name, and one per month is a tab stop --------------
{
    const cells = await page.evaluate(() => {
        const all = [...document.querySelectorAll('.day')];
        return {
            total: all.length,
            named: all.filter(c => (c.getAttribute('aria-label') || '').length > 6).length,
            tabStops: all.filter(c => c.tabIndex === 0).length,
            grids: document.querySelectorAll('.calendar-grid').length,
            sample: all[10]?.getAttribute('aria-label'),
            todayMarked: document.querySelector('.day.today')?.getAttribute('aria-current')
        };
    });
    check('every day cell is named', cells.named === cells.total,
        `${cells.named}/${cells.total}`);
    check('a name is more than the day number', /\d{4}/.test(cells.sample), cells.sample);
    // Roving tabindex: tabbing past a year view should cost twelve stops, not 504.
    check('one tab stop per month grid', cells.tabStops === cells.grids,
        `${cells.tabStops} stops / ${cells.grids} grids`);
    check('today is marked as current', cells.todayMarked === 'date');

    // Every month renders 42 cells, so today also falls in a neighbouring
    // month's leading or trailing week. Marking both put aria-current="date"
    // on two cells and let the roving tabindex land on the out-of-month copy.
    const todays = await page.evaluate(() => {
        const t = [...document.querySelectorAll('.day.today')];
        return {
            marked: t.length,
            current: document.querySelectorAll('[aria-current="date"]').length,
            anyOutOfMonth: t.some(e => e.classList.contains('other-month'))
        };
    });
    check('exactly one cell is today', todays.marked === 1, `${todays.marked} cells`);
    check('exactly one cell is aria-current', todays.current === 1, `${todays.current} cells`);
    check('today is never an out-of-month cell', !todays.anyOutOfMonth);
}

// --- arrow keys move a day at a time ------------------------------------
{
    await page.locator('.day[tabindex="0"]').first().focus();
    const read = () => page.evaluate(() => document.activeElement.dataset.date);
    const start = await read();
    check('a day cell can hold focus', !!start, String(start));

    await page.keyboard.press('ArrowRight');
    const right = await read();
    await page.keyboard.press('ArrowDown');
    const down = await read();
    await page.keyboard.press('ArrowLeft');
    const back = await read();

    const days = (a, b) => Math.round((new Date(b) - new Date(a)) / 86400000);
    check('right moves one day on', days(start, right) === 1, `${start} -> ${right}`);
    check('down moves one week on', days(right, down) === 7, `${right} -> ${down}`);
    check('left moves one day back', days(down, back) === -1, `${down} -> ${back}`);

    // Focus must follow, not merely change: a roving tabindex that updates the
    // attribute without moving focus looks right and is useless.
    check('the focused cell is the tab stop', await page.evaluate(() =>
        document.activeElement.tabIndex === 0));
}

// --- Enter opens the day, Escape returns focus to the cell ---------------
{
    const withDetails = page.locator('.day[data-has-details]').first();
    if (await withDetails.count()) {
        await withDetails.focus();
        const from = await page.evaluate(() => document.activeElement.dataset.date);
        await page.keyboard.press('Enter');
        await page.waitForTimeout(400);
        check('Enter opens the day peek', await page.locator('#day-peek').count() === 1);
        check('the peek announces itself as a dialog',
            await page.locator('#day-peek').getAttribute('role') === 'dialog');
        check('focus moved into the peek', await page.evaluate(() =>
            document.getElementById('day-peek')?.contains(document.activeElement)));
        await page.keyboard.press('Escape');
        await page.waitForTimeout(400);
        check('closing the peek returns focus to the day', await page.evaluate(
            d => document.activeElement.dataset.date === d, from));
    }
}

// --- a modal is a dialog: named, focused, trapped ------------------------
{
    // The quick-actions panel has to be open for its buttons to take focus.
    await page.locator('.fab-main').click();
    await page.waitForTimeout(400);
    await page.locator('#fab-manage-plan').focus();
    const opener = await active();
    check('a quick action can hold focus', opener === 'fab-manage-plan', opener);
    await page.keyboard.press('Enter');
    await page.waitForTimeout(600);

    const dialog = await page.evaluate(() => {
        const c = document.querySelector('#manage-plan-modal .modal-content');
        const labelId = c.getAttribute('aria-labelledby');
        return {
            role: c.getAttribute('role'),
            modal: c.getAttribute('aria-modal'),
            label: labelId ? document.getElementById(labelId)?.textContent.trim() : null,
            focusInside: c.contains(document.activeElement),
            backdropInert: document.querySelector('.container').hasAttribute('inert')
        };
    });
    check('the modal is a dialog', dialog.role === 'dialog' && dialog.modal === 'true',
        JSON.stringify(dialog));
    check('it is named after its heading', dialog.label === 'Manage Categories', String(dialog.label));
    check('focus moves into it on open', dialog.focusInside);
    // The calendar behind is still scrollable and clickable; it must at least
    // be out of the tab order and out of the accessibility tree.
    check('the page behind is inert', dialog.backdropInert);

    let escaped = null;
    for (let i = 0; i < 40; i++) {
        await page.keyboard.press('Tab');
        const inside = await page.evaluate(() =>
            document.querySelector('#manage-plan-modal .modal-content').contains(document.activeElement));
        if (!inside) { escaped = i; break; }
    }
    check('Tab never leaves the dialog', escaped === null, `escaped after ${escaped} tabs`);

    // Shift+Tab wraps the other way.
    escaped = null;
    for (let i = 0; i < 20; i++) {
        await page.keyboard.press('Shift+Tab');
        const inside = await page.evaluate(() =>
            document.querySelector('#manage-plan-modal .modal-content').contains(document.activeElement));
        if (!inside) { escaped = i; break; }
    }
    check('Shift+Tab never leaves either', escaped === null, `escaped after ${escaped} tabs`);

    await page.keyboard.press('Escape');
    await page.waitForTimeout(500);
    check('the page behind is interactive again', !(await page.evaluate(() =>
        document.querySelector('.container').hasAttribute('inert'))));
    // The opener here lives in the quick-actions panel, which closes as it
    // launches the modal — so focus cannot go back to it. What matters is that
    // it lands somewhere usable rather than on the body at the top of the page.
    const landed = await page.evaluate(() => ({
        onBody: document.activeElement === document.body,
        where: document.activeElement.dataset?.date || document.activeElement.id ||
               document.activeElement.tagName
    }));
    check('focus is not dumped on the body when the dialog closes',
        !landed.onBody, JSON.stringify(landed));
    check('it lands back in the calendar', /^\d{4}-\d{2}-\d{2}$/.test(landed.where) ||
        landed.where === 'today-btn', landed.where);
}

// --- the dialog renames itself when the view changes --------------------
{
    await page.locator('#fab-manage-plan').dispatchEvent('click');
    await page.waitForTimeout(600);
    const listLabel = await page.evaluate(() => {
        const c = document.querySelector('#manage-plan-modal .modal-content');
        return document.getElementById(c.getAttribute('aria-labelledby'))?.textContent.trim();
    });
    await page.locator('#add-new-category-btn').click();
    await page.waitForTimeout(500);
    const editorState = await page.evaluate(() => {
        const c = document.querySelector('#manage-plan-modal .modal-content');
        const el = document.getElementById(c.getAttribute('aria-labelledby'));
        return {
            label: el?.textContent.trim(),
            // The name must come from the view on screen, not one hidden behind it.
            labelVisible: !!el && el.offsetParent !== null,
            focusInside: c.contains(document.activeElement),
            focused: document.activeElement.id
        };
    });
    check('changing view renames the dialog', editorState.label !== listLabel,
        `${listLabel} -> ${editorState.label}`);
    check('the name comes from the visible view', editorState.labelVisible);
    // Chrome blurs a hidden element only after the current task, so a check of
    // "is focus still inside?" reads as true while pointing at the view that
    // just went away — which left the editor opening with nothing focused.
    check('focus follows into the new view', editorState.focusInside, editorState.focused);
    await closeAll();
}

// --- the quick actions are real buttons ---------------------------------
// They were div[role=button] wrapping a second button, with hand-written key
// handling — a control invented to imitate one the platform provides.
{
    const fab = await page.evaluate(() => {
        const rows = [...document.querySelectorAll('.fab-item-row')];
        return {
            count: rows.length,
            allButtons: rows.every(r => r.tagName === 'BUTTON'),
            noNestedButtons: rows.every(r => !r.querySelector('button')),
            named: rows.every(r => (r.textContent || '').trim().length > 0)
        };
    });
    check('every quick action is a real button', fab.allButtons && fab.count === 10,
        `${fab.count} rows, buttons=${fab.allButtons}`);
    check('no button nested inside a button', fab.noNestedButtons);
    check('each has an accessible name', fab.named);

    await page.locator('.fab-main').click();
    await page.waitForTimeout(400);
    await page.locator('#fab-search').focus();
    await page.keyboard.press('Enter');
    await page.waitForTimeout(600);
    check('Enter on a quick action runs it',
        await page.locator('#event-search-modal.visible').count() === 1);
    await closeAll();
}

// --- row actions are reachable without a pointer -------------------------
// Edit, Duplicate and Delete were `opacity: 0; visibility: hidden`, revealed
// only on :hover — so on a phone or tablet three of the six things you can do
// to a category could not be done at all, and a keyboard user tabbing into
// one had no idea where focus had gone.
{
    const touchCtx = await browser.newContext({
        viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true
    });
    const touchPage = await touchCtx.newPage();
    await touchPage.goto(BASE, { waitUntil: 'domcontentloaded' });
    // A category has to exist for there to be a row to act on.
    await touchPage.evaluate(() => {
        localStorage.setItem('calendar-walkthrough-v4-seen', '1');
        localStorage.setItem('calendar-plan-config', JSON.stringify({
            schemaVersion: 2,
            eventCategories: [{
                id: 'touch-test', name: 'Work', emoji: '💼', color: '#4f46e5',
                type: 'single', dates: [{ start: '2026-08-10', end: '2026-08-10' }]
            }],
            settings: {}
        }));
    });
    await touchPage.goto(BASE, { waitUntil: 'networkidle' });
    await touchPage.waitForTimeout(700);
    await touchPage.locator('#fab-manage-plan').dispatchEvent('click');
    await touchPage.waitForTimeout(700);

    const actions = await touchPage.evaluate(() => {
        const group = document.querySelector('.category-list-item-actions');
        if (!group) return null;
        const btns = [...group.querySelectorAll('button')];
        const cs = getComputedStyle(group);
        return {
            opacity: Number(cs.opacity),
            visibility: cs.visibility,
            count: btns.length,
            allLaidOut: btns.every(b => b.offsetParent !== null),
            smallestTarget: Math.min(...btns.map(b => Math.round(b.getBoundingClientRect().height)))
        };
    });
    check('row actions exist on touch', actions && actions.count >= 2,
        JSON.stringify(actions));
    check('row actions are fully opaque without hovering',
        actions && actions.opacity === 1 && actions.visibility === 'visible',
        JSON.stringify(actions));
    check('row actions are laid out', actions && actions.allLaidOut);
    check('row actions meet the touch target', actions && actions.smallestTarget >= 38,
        `${actions && actions.smallestTarget}px`);

    // Keyboard users get them too — focus inside the row reveals them.
    const focusReveals = await touchPage.evaluate(() => {
        const row = document.querySelector('.category-list-item');
        const btn = row.querySelector('.category-list-item-actions button');
        btn.focus();
        return getComputedStyle(row.querySelector('.category-list-item-actions')).opacity;
    });
    check('focusing a row action reveals the group', Number(focusReveals) === 1, focusReveals);
    await touchCtx.close();
}

// --- the undo toast announces itself ------------------------------------
// A destructive delete and its one chance to undo were silent to a screen
// reader, and the toast dismisses itself.
{
    const toast = await page.evaluate(() => {
        const t = document.getElementById('undo-toast');
        return { role: t.getAttribute('role'), live: t.getAttribute('aria-live') };
    });
    check('the undo toast is a live region',
        toast.role === 'status' && toast.live === 'polite', JSON.stringify(toast));
}

check('no page errors', errors.length === 0, errors.slice(0, 2).join(' | '));

await browser.close();
await server.close();
done();
