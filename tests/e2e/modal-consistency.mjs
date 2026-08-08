import { startServer, launchBrowser, trackErrors } from '../helpers/browser.mjs';
import { createSuite } from '../helpers/assert.mjs';

/**
 * Modal behaviour and sizing.
 *
 * Written from a real report: pressing Cancel went *back* to the previous view
 * instead of dismissing, and modals were visibly different widths. In the
 * category editor ×, ← and Cancel had all been wired to the same handler, so ×
 * never closed and Cancel never cancelled out.
 *
 * The contract these pin down:
 *   ×       dismiss everything, return to the calendar
 *   Cancel  dismiss everything, return to the calendar
 *   ←       one step back: to the root view, else close
 *   Escape  the same as ←
 */

const { check, done } = createSuite('modal consistency');
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

const openCount = () => page.locator('.modal-overlay.visible').count();
const visible = sel => page.locator(sel).isVisible().catch(() => false);
const openManage = async () => {
    await page.locator('#fab-manage-plan').dispatchEvent('click');
    await page.waitForTimeout(600);
};
const openEditor = async () => {
    await openManage();
    await page.locator('#add-new-category-btn').click();
    await page.waitForTimeout(500);
};

// --- Cancel dismisses everything (the reported bug) -----------------------
await openEditor();
check('editor is open', await visible('#category-editor-view'));
await page.locator('#editor-cancel-btn').click();
await page.waitForTimeout(500);
check('Cancel closes every modal, not just the view', await openCount() === 0,
    `${await openCount()} still open`);

// --- × dismisses everything ----------------------------------------------
await openEditor();
await page.locator('#editor-close-btn').click();
await page.waitForTimeout(500);
check('× closes every modal', await openCount() === 0, `${await openCount()} still open`);

// --- ← steps back to the list, keeping the modal open --------------------
await openEditor();
await page.locator('#category-editor-back-btn').click();
await page.waitForTimeout(500);
check('← returns to the category list', await visible('#category-list-view'));
check('← keeps the modal open', await openCount() === 1, `${await openCount()} open`);

// --- ← from the root view closes the modal -------------------------------
await page.locator('#manage-categories-back-btn').click();
await page.waitForTimeout(500);
check('← from the root view closes the modal', await openCount() === 0);

// --- Escape behaves exactly like ← ---------------------------------------
await openEditor();
await page.keyboard.press('Escape');
await page.waitForTimeout(500);
check('Escape steps back to the list', await visible('#category-list-view'));
await page.keyboard.press('Escape');
await page.waitForTimeout(500);
check('Escape again closes the modal', await openCount() === 0);

// --- a modal reopens on its root view ------------------------------------
await openEditor();
check('editor showing', await visible('#category-editor-view'));
await page.locator('#editor-close-btn').click();
await page.waitForTimeout(400);
await openManage();
check('reopening shows the list, not the editor left behind',
    await visible('#category-list-view') && !(await visible('#category-editor-view')));
await page.keyboard.press('Escape');
await page.waitForTimeout(400);

// --- subscriptions modal follows the same contract -----------------------
await page.locator('#fab-subscriptions').dispatchEvent('click');
await page.waitForTimeout(600);
await page.locator('#add-subscription-btn').click();
await page.waitForTimeout(400);
check('subscription editor open', await visible('#subscription-editor-view'));
await page.locator('#subscription-editor-back-btn').click();
await page.waitForTimeout(400);
check('← returns to the subscription list', await visible('#subscription-list-view'));
await page.locator('#subscription-cancel-btn').click().catch(() => {});
await page.waitForTimeout(400);
if (await openCount() > 0) { await page.keyboard.press('Escape'); await page.waitForTimeout(400); }


// --- a nested picker must not lose your place ----------------------------
// Opening the emoji picker from the editor and closing it used to reveal the
// parent as a *fresh* open, resetting it to the category list and discarding
// what was being edited.
await openEditor();
await page.locator('#category-name-input').fill('Half typed');
await page.locator('#category-emoji-picker-btn').dispatchEvent('click');
await page.waitForTimeout(700);
check('emoji picker opened over the editor',
    await page.locator('#emoji-picker-modal.visible').count() === 1);
await page.keyboard.press('Escape');
await page.waitForTimeout(600);
check('closing the picker returns to the editor, not the list',
    await visible('#category-editor-view'));
check('the half-typed name survived',
    (await page.locator('#category-name-input').inputValue()) === 'Half typed',
    await page.locator('#category-name-input').inputValue());
await page.locator('#editor-close-btn').click();
await page.waitForTimeout(400);

// --- no modal changes width while open -----------------------------------
await openManage();
const listWidth = await page.locator('#manage-plan-modal .modal-content').evaluate(el => el.getBoundingClientRect().width);
await page.locator('#add-new-category-btn').click();
await page.waitForTimeout(500);
const editorWidth = await page.locator('#manage-plan-modal .modal-content').evaluate(el => el.getBoundingClientRect().width);
check('modal keeps its width moving between views', Math.abs(listWidth - editorWidth) < 1,
    `${Math.round(listWidth)}px -> ${Math.round(editorWidth)}px`);
await page.locator('#editor-close-btn').click();
await page.waitForTimeout(400);

// --- every modal uses a declared size token ------------------------------
const sizes = await page.evaluate(() => {
    const out = {};
    document.querySelectorAll('.modal-overlay').forEach(m => {
        const content = m.querySelector('.modal-content');
        if (!content) return;
        const token = [...content.classList].find(c => c.startsWith('modal-') && c !== 'modal-content');
        out[m.id] = token || null;
    });
    return out;
});
// Tokens are applied on open, so check the ones this suite has opened.
const opened = ['manage-plan-modal', 'ics-subscriptions-modal'];
check('opened modals carry a size token',
    opened.every(id => sizes[id] && /^modal-(sm|md|lg)$/.test(sizes[id])),
    JSON.stringify(Object.fromEntries(opened.map(id => [id, sizes[id]]))));

// --- widths come from a three-value scale --------------------------------
const scale = await page.evaluate(() => {
    const probe = document.createElement('div');
    probe.className = 'modal-content';
    document.body.appendChild(probe);
    const read = (cls) => {
        probe.className = `modal-content ${cls}`;
        return getComputedStyle(probe).maxWidth;
    };
    const out = { sm: read('modal-sm'), md: read('modal-md'), lg: read('modal-lg') };
    probe.remove();
    return out;
});
check('three distinct sizes are defined',
    new Set(Object.values(scale)).size === 3, JSON.stringify(scale));

check('no page errors', errors.length === 0, errors.slice(0, 2).join(' | '));

await browser.close();
await server.close();
done();
