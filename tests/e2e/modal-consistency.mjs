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
// Dismiss whatever is open, whichever modal it is.
const UI_close = async () => {
    while (await openCount() > 0) {
        await page.keyboard.press('Escape');
        await page.waitForTimeout(350);
    }
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


// --- the quick-actions panel stays compact -------------------------------
// Ten 48px circles each trailing a floating label pill came to 682px: 85% of
// a desktop viewport, 81% of a phone's. A menu should not cover the app.
{
    await page.locator('.fab-main').click();
    await page.waitForTimeout(500);
    const panel = await page.evaluate(() => {
        const menu = document.querySelector('.fab-menu');
        const r = menu.getBoundingClientRect();
        const rows = [...document.querySelectorAll('.fab-item-row')];
        return {
            heightPct: Math.round(r.height / innerHeight * 100),
            inViewport: r.top >= 0 && r.left >= 0 && r.right <= innerWidth && r.bottom <= innerHeight,
            rows: rows.length,
            allVisible: rows.every(row => row.offsetParent !== null),
            clipped: rows.filter(row => {
                const l = row.querySelector('.fab-label');
                return l && l.scrollWidth > l.clientWidth + 1;
            }).length
        };
    });
    check('quick actions fit in a third of the viewport', panel.heightPct <= 40, `${panel.heightPct}%`);
    check('panel is fully on screen', panel.inViewport);
    check('all ten actions present and visible', panel.rows === 10 && panel.allVisible, `${panel.rows} rows`);
    check('no label is clipped', panel.clipped === 0, `${panel.clipped} clipped`);
    await page.keyboard.press('Escape');
    await page.waitForTimeout(300);
    await page.locator('body').click({ position: { x: 5, y: 5 } });
    await page.waitForTimeout(300);
}

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

// --- a footer is Cancel plus one primary action --------------------------
// The subscriptions footer carried four buttons and the category footer four
// more; below laptop width they wrapped into ragged two-row blocks. Actions
// that operate on the list moved next to the list, where they belong.
for (const [modal, opener] of [['manage-plan-modal', openManage],
                               ['ics-subscriptions-modal', async () => {
                                   await page.locator('#fab-subscriptions').dispatchEvent('click');
                                   await page.waitForTimeout(600);
                               }]]) {
    await opener();
    const footer = await page.evaluate(id => {
        const view = [...document.querySelectorAll(`#${id} .modal-view`)]
            .find(v => v.offsetParent !== null);
        const shown = [...view.querySelectorAll('.modal-actions .modal-btn')]
            .filter(b => b.offsetParent !== null);
        const toolbar = view.querySelectorAll('.list-toolbar .toolbar-btn');
        return {
            buttons: shown.map(b => b.textContent.trim()),
            rows: new Set(shown.map(b => Math.round(b.getBoundingClientRect().top))).size,
            toolbar: toolbar.length,
            // A toolbar button with no border means the stylesheet never
            // landed — the markup shipped ahead of the CSS once already.
            styled: toolbar.length === 0 ||
                getComputedStyle(toolbar[0]).borderTopWidth !== '0px'
        };
    }, modal);
    check(`${modal} footer is two buttons`, footer.buttons.length === 2,
        JSON.stringify(footer.buttons));
    check(`${modal} footer sits on one row`, footer.rows === 1, `${footer.rows} rows`);
    check(`${modal} list actions moved to a toolbar`, footer.toolbar === 2,
        `${footer.toolbar} toolbar buttons`);
    check(`${modal} toolbar buttons are styled`, footer.styled);
    await UI_close();
}

// --- a dismiss button keeps the label the markup gave it -----------------
// Every .btn-cancel had its text overwritten with the word "Cancel", so the
// subscriptions footer's "Close" and the help footer's "Got it!" both
// rendered as "Cancel".
{
    await page.locator('#fab-subscriptions').dispatchEvent('click');
    await page.waitForTimeout(600);
    const label = await page.locator('#subscription-list-view .modal-actions .btn-cancel')
        .textContent();
    check('subscriptions footer still says Close', label.trim() === 'Close', label.trim());
    await UI_close();

    await page.locator('#fab-help').dispatchEvent('click');
    await page.waitForTimeout(600);
    const help = await page.locator('#help-modal .modal-actions .btn-cancel').textContent();
    check('help footer still says Got it!', help.trim() === 'Got it!', help.trim());
    await UI_close();
}

// --- the event details panel holds together on a phone -------------------
// The time row was a flex row with two fixed 110px inputs. Inside a
// phone-width modal it wrapped mid-range: the end time dropped to its own
// line, stranding the "–" beside the start time as a stray character.
for (const width of [390, 320]) {
    await page.setViewportSize({ width, height: 780 });
    await openEditor();
    await page.locator('.add-single-date-btn').first().click();
    await page.waitForTimeout(250);
    await page.locator('.date-entry-item').last().locator('.date-details-toggle').click();
    await page.waitForTimeout(300);
    const panel = await page.evaluate(() => {
        const det = document.querySelector('.date-entry-details');
        const box = det.getBoundingClientRect();
        const mid = el => { const r = el.getBoundingClientRect(); return r.top + r.height / 2; };
        const start = det.querySelector('.event-time-input');
        const dash = det.querySelector('.event-time-row > span');
        const end = det.querySelector('.event-end-time-input');
        return {
            dashWithStart: Math.abs(mid(dash) - mid(start)) < 6,
            dashWithEnd: Math.abs(mid(dash) - mid(end)) < 6,
            overflow: [...det.querySelectorAll('input, textarea')]
                .filter(el => el.getBoundingClientRect().right > box.right - 4).length,
            pageScrolls: document.documentElement.scrollWidth > window.innerWidth
        };
    });
    check(`${width}px: start time, dash and end time stay on one line`,
        panel.dashWithStart && panel.dashWithEnd, JSON.stringify(panel));
    check(`${width}px: no field escapes the details panel`, panel.overflow === 0,
        `${panel.overflow} overflowing`);
    check(`${width}px: the page does not scroll sideways`, !panel.pageScrolls);
    await UI_close();
}
await page.setViewportSize({ width: 1280, height: 780 });

// --- on a phone a dialog is a sheet --------------------------------------
// A centred card with a margin all round wastes the two edges a thumb can
// reach, and it floats with nothing to anchor it to. Below 640px it rises
// from the bottom edge, matching the day view — one idiom, not two.
{
    await page.setViewportSize({ width: 390, height: 844 });
    await page.waitForTimeout(300);
    await openManage();
    const sheet = await page.evaluate(() => {
        const c = document.querySelector('#manage-plan-modal .modal-content');
        const r = c.getBoundingClientRect();
        return {
            fullWidth: Math.round(r.width) === innerWidth,
            bottomAnchored: Math.abs(r.bottom - innerHeight) < 2,
            onScreen: r.left >= -1 && r.right <= innerWidth + 1 && r.top >= 0
        };
    });
    check('the dialog spans the width on a phone', sheet.fullWidth, JSON.stringify(sheet));
    check('the dialog is anchored to the bottom edge', sheet.bottomAnchored);
    check('the dialog is fully on screen', sheet.onScreen);
    await UI_close();
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.waitForTimeout(300);
}

// --- the primary action wears the accent ---------------------------------
// Buttons carry classes from two button systems; the categories primary is
// `modal-btn btn-save btn btn-outline btn-green`, and the last class won — so
// the main action was green while the app's accent is coral.
{
    await openManage();
    const primary = await page.evaluate(() => {
        const btn = document.querySelector('#manage-plan-modal .modal-actions .btn-save');
        const accent = getComputedStyle(document.documentElement)
            .getPropertyValue('--accent').trim();
        const probe = document.createElement('span');
        probe.style.color = accent;
        document.body.appendChild(probe);
        const accentRgb = getComputedStyle(probe).color;
        probe.remove();
        return { bg: getComputedStyle(btn).backgroundColor, accentRgb };
    });
    check('the primary action is painted with the accent',
        primary.bg === primary.accentRgb, `${primary.bg} vs ${primary.accentRgb}`);
    await UI_close();
}

check('no page errors', errors.length === 0, errors.slice(0, 2).join(' | '));

await browser.close();
await server.close();
done();
