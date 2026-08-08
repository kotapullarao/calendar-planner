import { startServer, launchBrowser, trackErrors } from '../helpers/browser.mjs';
import { createSuite } from '../helpers/assert.mjs';

/**
 * Covers click routes the other suites never exercise — the bulk date helpers,
 * the emoji and template pickers, the expand toggle, and category duplicate.
 *
 * Written because converting the 400-line if-chain into a route table touched
 * ~50 branches, and the existing suites only reached about half of them.
 */

const { check, done } = createSuite('editor interactions');
const server = await startServer();
const BASE = server.baseUrl;
const browser = await launchBrowser();

const ctx = await browser.newContext();
const page = await ctx.newPage();
const errors = trackErrors(page);

await page.goto(BASE, { waitUntil: 'domcontentloaded' });
await page.evaluate(() => localStorage.setItem('calendar-walkthrough-v4-seen', '1'));
await page.goto(BASE, { waitUntil: 'networkidle' });
await page.waitForTimeout(700);

const openEditor = async () => {
    await page.locator('#fab-add-category').dispatchEvent('click');
    await page.waitForTimeout(700);
};

// --- the editor opens (route: #add-new-category-btn / fab) ----------------
await openEditor();
check('category editor opens', await page.locator('#category-editor-view').isVisible());

// --- bulk date helpers (routes: BULK_DATE_ACTIONS) ------------------------
const countRows = () => page.locator('.date-entry-item').count();

await page.locator('.add-single-date-btn').first().click();
await page.waitForTimeout(250);
check('add single date adds a row', await countRows() === 1, `${await countRows()} rows`);

await page.locator('.add-date-range-btn').first().click();
await page.waitForTimeout(250);
check('add range adds a range row',
    await page.locator('.date-entry-item.range').count() === 1);

// The expand toggle reveals the bulk helpers.
const expandBtn = page.locator('.date-expand-btn').first();
if (await expandBtn.count()) {
    const labelBefore = (await expandBtn.textContent()).trim();
    await expandBtn.click();
    await page.waitForTimeout(300);
    const labelAfter = (await expandBtn.textContent()).trim();
    check('expand toggle flips its label', labelBefore !== labelAfter, `${labelBefore} -> ${labelAfter}`);
    check('expanded section is shown',
        await page.locator('.date-buttons-expanded').first().isVisible());
}

const before = await countRows();
const weekdays = page.locator('.bulk-add-weekdays-btn').first();
if (await weekdays.count() && await weekdays.isVisible()) {
    await weekdays.click();
    await page.waitForTimeout(400);
    check('bulk "weekdays" adds rows', await countRows() > before,
        `${before} -> ${await countRows()}`);
}

const beforeMonday = await countRows();
const monday = page.locator('.bulk-add-every-monday-btn').first();
if (await monday.count() && await monday.isVisible()) {
    await monday.click();
    await page.waitForTimeout(400);
    check('bulk "every Monday" adds rows', await countRows() > beforeMonday,
        `${beforeMonday} -> ${await countRows()}`);
}

// --- clear all (route: .clear-all-dates-btn) ------------------------------
const clearBtn = page.locator('.clear-all-dates-btn').first();
if (await clearBtn.count() && await clearBtn.isVisible()) {
    await clearBtn.click();
    await page.waitForTimeout(400);
    check('clear all empties the rows', await countRows() === 0, `${await countRows()} rows`);
    check('clearing offers an undo', await page.locator('#undo-toast').isVisible().catch(() => false));
}

// --- remove one row (route: .remove-date-btn) -----------------------------
await page.locator('.add-single-date-btn').first().click();
await page.waitForTimeout(250);
const rowsBeforeRemove = await countRows();
await page.locator('.remove-date-btn').first().click();
await page.waitForTimeout(300);
check('remove drops a single row', await countRows() === rowsBeforeRemove - 1,
    `${rowsBeforeRemove} -> ${await countRows()}`);

// --- details toggle (route: .date-details-toggle) -------------------------
await page.locator('.add-single-date-btn').first().click();
await page.waitForTimeout(250);
const row = page.locator('.date-entry-item').last();
const detailsPanel = row.locator('.date-entry-details');
check('details panel starts hidden', !(await detailsPanel.isVisible()));
await row.locator('.date-details-toggle').click();
await page.waitForTimeout(250);
check('details toggle reveals the panel', await detailsPanel.isVisible());
check('toggle reports expanded state',
    (await row.locator('.date-details-toggle').getAttribute('aria-expanded')) === 'true');
await row.locator('.date-details-toggle').click();
await page.waitForTimeout(250);
check('details toggle hides it again', !(await detailsPanel.isVisible()));


// --- the date row keeps its controls on one line ------------------------
// The row is a grid whose columns must match the children it renders. Adding
// the details toggle without updating them pushed remove onto its own line.
{
    const geom = await page.evaluate(() => {
        const row = document.querySelector('.date-entry-item');
        if (!row) return null;
        const kids = [...row.children].filter(c => !c.classList.contains('date-entry-details'));
        return {
            cols: getComputedStyle(row).gridTemplateColumns.split(' ').length,
            controls: kids.length,
            // Centre-aligned controls have different heights, so compare
            // vertical midpoints rather than tops.
            sameLine: (() => {
                const mids = kids.map(c => { const r = c.getBoundingClientRect(); return r.top + r.height / 2; });
                return Math.max(...mids) - Math.min(...mids) < 6;
            })()
        };
    });
    check('date row grid has a column per control',
        geom && geom.cols === geom.controls, JSON.stringify(geom));
    check('date row controls share one line', geom && geom.sameLine, JSON.stringify(geom));
}

// --- the emoji picker builds only what is shown -------------------------
// It used to render every category up front: ~1600 buttons for ~60 visible.
{
    await page.locator('#category-emoji-picker-btn').dispatchEvent('click');
    await page.waitForTimeout(700);
    const onOpen = await page.locator('#emoji-picker-modal .emoji-btn').count();
    check('picker renders only the active category on open', onOpen < 200, `${onOpen} buttons`);

    const tabs = page.locator('.emoji-tab-item');
    if (await tabs.count() > 1) {
        await tabs.nth(1).click();
        await page.waitForTimeout(400);
        const filled = await page.evaluate(() => [...document.querySelectorAll('#emoji-picker-modal .emoji-btn')]
            .filter(b => b.offsetParent !== null).length);
        check('switching tab fills that category', filled > 0, `${filled} visible`);
    }

    await page.locator('#emoji-search-input').fill('heart');
    await page.waitForTimeout(800);
    const results = await page.evaluate(() => [...document.querySelectorAll('#emoji-picker-modal .emoji-btn')]
        .filter(b => b.offsetParent !== null).length);
    check('search still finds emoji across all categories', results > 0, `${results} results`);
    await page.keyboard.press('Escape');
    await page.waitForTimeout(500);
}

// --- category type toggle (route: .segmented-control button) --------------
const groupBtn = page.locator('#category-type-toggle button[data-type="group"]');
if (await groupBtn.count()) {
    await groupBtn.click();
    await page.waitForTimeout(400);
    check('switching to Group swaps the editor view',
        await page.locator('#category-group-categories-group').isVisible().catch(() => false));
    await page.locator('#category-type-toggle button[data-type="single"]').click();
    await page.waitForTimeout(300);
    check('switching back restores the dates view',
        await page.locator('#category-dates-group').isVisible().catch(() => false));
}

// --- emoji picker (routes: .emoji-picker-btn, .emoji-btn) -----------------
const emojiPickerBtn = page.locator('#category-emoji-picker-btn');
if (await emojiPickerBtn.count()) {
    await emojiPickerBtn.click();
    await page.waitForTimeout(600);
    check('emoji picker opens', await page.locator('#emoji-picker-modal.visible').count() === 1);

    const anyEmoji = page.locator('#emoji-picker-modal .emoji-btn').first();
    if (await anyEmoji.count()) {
        const chosen = (await anyEmoji.getAttribute('data-emoji')) || '';
        await anyEmoji.click();
        await page.waitForTimeout(500);
        check('picking an emoji closes the picker',
            await page.locator('#emoji-picker-modal.visible').count() === 0);
        const value = await page.locator('#category-emoji-input').inputValue();
        check('the chosen emoji lands in the field', value.includes(chosen), `"${value}"`);
    }
}

// --- template picker (routes: .template-picker-btn, .template-picker-card) ---
const templateBtn = page.locator('.template-picker-btn').first();
if (await templateBtn.count()) {
    await templateBtn.click();
    await page.waitForTimeout(600);
    check('template picker opens', await page.locator('#template-picker-modal.visible').count() === 1);
    const card = page.locator('.template-picker-card').first();
    if (await card.count()) {
        await card.click();
        await page.waitForTimeout(500);
        check('choosing a template closes the picker',
            await page.locator('#template-picker-modal.visible').count() === 0);
        check('template filled the name field',
            (await page.locator('#category-name-input').inputValue()).length > 0);
    }
}

// --- save, then duplicate (route: [data-duplicate-id]) --------------------
await page.locator('#category-name-input').fill('Routing Test');
await page.locator('.add-single-date-btn').first().click();
await page.waitForTimeout(200);
const dateInput = page.locator('.date-entry-item .date-display-input').first();
const d = new Date();
await dateInput.fill(`${String(d.getDate()).padStart(2, '0')}-${String(d.getMonth() + 1).padStart(2, '0')}-${d.getFullYear()}`);
await dateInput.blur();
await page.waitForTimeout(300);
await page.locator('button[form="category-editor-form"]').first().click();
await page.waitForTimeout(800);

check('category saved from the editor',
    (await page.evaluate(() => JSON.parse(localStorage.getItem('calendar-plan-config'))
        .eventCategories.some(c => c.name === 'Routing Test'))));

await page.locator('#fab-manage-plan').dispatchEvent('click');
await page.waitForTimeout(700);
const listRow = page.locator('.category-list-item').filter({ hasText: 'Routing Test' }).first();
await listRow.hover();
await listRow.locator('[data-duplicate-id]').dispatchEvent('click');
await page.waitForTimeout(700);
check('duplicate opens the editor prefilled with a copy',
    (await page.locator('#category-name-input').inputValue()).includes('Copy'),
    await page.locator('#category-name-input').inputValue());

check('no page errors', errors.length === 0, errors.slice(0, 2).join(' | '));

await browser.close();
await server.close();
done();
