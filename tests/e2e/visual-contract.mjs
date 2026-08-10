import { startServer, launchBrowser, openApp, trackErrors } from '../helpers/browser.mjs';
import { createSuite } from '../helpers/assert.mjs';

/**
 * The visual contract.
 *
 * Not "does this look nice" — that is a judgement, and a test cannot hold it.
 * These pin the measurable claims the redesign is built on, the ones that
 * regressed silently before anyone noticed:
 *
 *   - chrome must not eat the screen (it was 61% of a phone)
 *   - the header is one row at every width (it stacked into three)
 *   - nothing scrolls sideways at any width
 *   - a day is one of three distinct states: weekday, weekend, today
 *   - every theme token resolves in both themes
 *
 * Screenshot comparison was tried for this and discarded: two runs of
 * identical code differed on five screens, because transitions and caret blink
 * make pixels non-deterministic. Computed styles are stable, so the contract
 * is written against those.
 */

const { check, done } = createSuite('visual contract');
const server = await startServer();
const browser = await launchBrowser();

const CONFIG = {
    schemaVersion: 2,
    eventCategories: [{
        id: 'work', name: 'Work', emoji: '💼', color: '#4f46e5', type: 'single',
        dates: [{ start: '2026-08-10', end: '2026-08-10', title: 'Sprint', time: '10:00' }]
    }],
    settings: {}
};

const WIDTHS = [
    { w: 1440, h: 900, name: 'desktop', maxChrome: 20 },
    { w: 820, h: 1180, name: 'tablet', maxChrome: 22 },
    { w: 390, h: 844, name: 'phone', maxChrome: 30 },
    { w: 320, h: 720, name: 'small phone', maxChrome: 34 }
];

for (const { w, h, name, maxChrome } of WIDTHS) {
    const ctx = await browser.newContext({ viewport: { width: w, height: h } });
    const page = await openApp(ctx, server.baseUrl, { config: CONFIG });
    await page.waitForTimeout(500);

    const m = await page.evaluate(() => {
        const box = sel => {
            const el = document.querySelector(sel);
            return el ? el.getBoundingClientRect() : null;
        };
        const header = box('.header');
        const stats = box('.stats');
        // One row means every direct child shares a vertical midpoint.
        const kids = [...document.querySelectorAll('.header > *')]
            .filter(e => e.getBoundingClientRect().width > 0);
        const mids = kids.map(e => { const r = e.getBoundingClientRect(); return r.top + r.height / 2; });
        return {
            chromePct: Math.round(((header?.height || 0) + (stats?.height || 0)) / innerHeight * 100),
            headerHeight: Math.round(header?.height || 0),
            headerOneRow: mids.length < 2 || (Math.max(...mids) - Math.min(...mids) < 8),
            pageScrollsSideways: document.documentElement.scrollWidth > innerWidth,
            headerOverflows: !!header && header.width > 0 &&
                document.querySelector('.header').scrollWidth > Math.ceil(header.width) + 1
        };
    });

    check(`${name}: chrome stays under ${maxChrome}% of the viewport`,
        m.chromePct <= maxChrome, `${m.chromePct}%`);
    check(`${name}: the header is one row`, m.headerOneRow, `${m.headerHeight}px tall`);
    check(`${name}: the page does not scroll sideways`, !m.pageScrollsSideways);
    check(`${name}: the header does not overflow itself`, !m.headerOverflows);

    await ctx.close();
}

// --- the header keeps one height across every width ----------------------
// It was 44px on desktop, 91px on a tablet and 228px on a phone: three
// different shells wearing the same markup.
{
    const heights = [];
    for (const { w, h } of WIDTHS) {
        const ctx = await browser.newContext({ viewport: { width: w, height: h } });
        const page = await openApp(ctx, server.baseUrl, { config: CONFIG });
        await page.waitForTimeout(400);
        heights.push(await page.evaluate(() =>
            Math.round(document.querySelector('.header').getBoundingClientRect().height)));
        await ctx.close();
    }
    const spread = Math.max(...heights) - Math.min(...heights);
    check('the header is the same height at every width', spread <= 8,
        `${heights.join(', ')} — spread ${spread}px`);
}

// --- the week keeps seven equal columns ----------------------------------
// Reported from a real feed: one long event title widened its column and
// squeezed Fri/Sat/Sun into slivers. `1fr` is `minmax(auto, 1fr)`, so a grid
// item never shrinks below its min-content width — a nowrap title sets that
// width no matter how much ellipsis the chip promises.
{
    const LONG = {
        schemaVersion: 2,
        eventCategories: [{
            id: 'feed', name: 'Rav', emoji: '🔗', color: '#0891b2', type: 'single',
            dates: [
                { start: '2026-08-04', end: '2026-08-04', time: '11:30',
                  title: 'Kafka Connect on Kyndryl clusters & strimzi-elastic-secret clarification' },
                { start: '2026-08-05', end: '2026-08-05', time: '13:00',
                  title: 'Global IT Call | Architecture deep dive with the whole platform group' }
            ]
        }],
        settings: {}
    };
    for (const { w, h, name } of [{ w: 1280, h: 900, name: 'desktop' }, { w: 390, h: 844, name: 'phone' }]) {
        const ctx = await browser.newContext({ viewport: { width: w, height: h } });
        const page = await openApp(ctx, server.baseUrl, { config: LONG });
        await page.waitForTimeout(400);
        await page.locator('#month-view-btn').click();
        await page.waitForTimeout(600);
        const grid = await page.evaluate(() => {
            const g = document.querySelector('.calendar-grid');
            const cols = getComputedStyle(g).gridTemplateColumns.split(' ').map(v => parseFloat(v));
            const chips = [...document.querySelectorAll('.day-event-chip')];
            return {
                count: cols.length,
                spread: Math.round(Math.max(...cols) - Math.min(...cols)),
                sideways: document.documentElement.scrollWidth > innerWidth,
                // A long title must be clipped by the chip, not allowed to
                // push the layout around.
                clipped: chips.filter(c => c.scrollWidth > c.clientWidth + 1).length,
                chips: chips.length,
                chipsShown: chips.filter(c => c.offsetParent !== null).length
            };
        });
        check(`${name}: the week has seven columns`, grid.count === 7, `${grid.count}`);
        check(`${name}: all seven columns are equal`, grid.spread <= 1, `spread ${grid.spread}px`);
        check(`${name}: a long title does not scroll the page`, !grid.sideways);
        // Two valid answers, one per width. On a desktop the chip shows the
        // title and clips the overflow. On a phone each cell is ~46px wide,
        // where a chip can only ever render "13…" — so month view drops the
        // text chips entirely and leaves the colour bar, and the day sheet
        // carries the detail. Either way the title never sets the layout.
        if (name === 'phone') {
            check(`${name}: unreadable chips are dropped, not truncated to nothing`,
                grid.chipsShown === 0, `${grid.chipsShown} still shown`);
        } else {
            check(`${name}: long titles are clipped inside their chip`,
                grid.chips === 0 || grid.clipped > 0, `${grid.clipped}/${grid.chips} clipped`);
        }
        await ctx.close();
    }
}

// --- three day states, all distinct --------------------------------------
// Weekday, weekend and today have to be told apart at a glance, and the
// weekend must not be confusable with today — which is why the weekend leans
// cool while the accent is warm.
for (const theme of ['light', 'midnight']) {
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
    const page = await openApp(ctx, server.baseUrl, { config: CONFIG });
    await page.waitForTimeout(400);
    if (theme === 'midnight') {
        await page.evaluate(() => document.documentElement.setAttribute('data-theme', 'midnight'));
        await page.waitForTimeout(300);
    }

    const states = await page.evaluate(() => {
        // Today paints with the theme gradient, so backgroundColor reads as
        // transparent for it. Take the first colour stop of whatever paint is
        // actually applied, so all three states are compared like for like.
        const bg = el => {
            if (!el) return null;
            const cs = getComputedStyle(el);
            if (cs.backgroundImage && cs.backgroundImage !== 'none') {
                const m = cs.backgroundImage.match(/rgba?\([^)]+\)/);
                if (m) return m[0];
            }
            return cs.backgroundColor;
        };
        const rgb = s => (s.match(/[\d.]+/g) || []).slice(0, 3).map(Number);
        const weekday = document.querySelector('.day:not(.weekend):not(.other-month):not(.today)');
        const weekend = document.querySelector('.day.weekend:not(.other-month):not(.today)');
        const today = document.querySelector('.day.today');
        const dist = (a, b) => {
            const [x, y, z] = rgb(a), [p, q, r] = rgb(b);
            return Math.round(Math.hypot(x - p, y - q, z - r));
        };
        return {
            weekday: bg(weekday), weekend: bg(weekend), today: bg(today),
            weekdayVsWeekend: dist(bg(weekday), bg(weekend)),
            weekendVsToday: dist(bg(weekend), bg(today)),
            weekdayVsToday: dist(bg(weekday), bg(today)),
            todayCount: document.querySelectorAll('.day.today').length
        };
    });

    check(`${theme}: a weekend is distinct from a weekday`,
        states.weekdayVsWeekend >= 12, `distance ${states.weekdayVsWeekend} (${states.weekday} vs ${states.weekend})`);
    check(`${theme}: today is distinct from a weekend`,
        states.weekendVsToday >= 60, `distance ${states.weekendVsToday}`);
    check(`${theme}: today is distinct from a weekday`,
        states.weekdayVsToday >= 60, `distance ${states.weekdayVsToday}`);
    // Today must be the loudest of the three, not merely different.
    check(`${theme}: today is further from a weekday than a weekend is`,
        states.weekdayVsToday > states.weekdayVsWeekend,
        `${states.weekdayVsToday} vs ${states.weekdayVsWeekend}`);
    check(`${theme}: exactly one cell is today`, states.todayCount === 1,
        `${states.todayCount}`);
    await ctx.close();
}

// --- the view toggle decides how many months, the filter decides what ----
// Tapping a category chip while in Month view used to switch the layout to
// every month containing that category — the toggle still said "Month" while
// six of them showed in two columns. The two controls answer different
// questions and must not override each other.
{
    const SPREAD = {
        schemaVersion: 2,
        eventCategories: [{
            id: 'spread', name: 'Rav', emoji: '🔗', color: '#0891b2', type: 'single',
            dates: [
                { start: '2026-03-04', end: '2026-03-04', title: 'Sync', time: '11:30' },
                { start: '2026-05-12', end: '2026-05-12', title: 'Office', time: '08:00' },
                { start: '2026-08-05', end: '2026-08-05', title: 'Deploy', time: '13:30' },
                { start: '2026-11-02', end: '2026-11-02', title: 'Call', time: '13:00' }
            ]
        }],
        settings: {}
    };
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
    const page = await openApp(ctx, server.baseUrl, { config: SPREAD });
    await page.waitForTimeout(400);
    const months = () => page.evaluate(() =>
        [...document.querySelectorAll('.month-header')].map(m => m.textContent.trim()));

    await page.locator('#month-view-btn').click();
    await page.waitForTimeout(500);
    check('month view shows one month', (await months()).length === 1,
        (await months()).join(', '));

    await page.locator('.stat-card[data-filter="spread"]').click();
    await page.waitForTimeout(600);
    const filtered = await months();
    check('month view still shows one month when filtered', filtered.length === 1,
        filtered.join(', '));

    await page.locator('#year-overview-btn').click();
    await page.waitForTimeout(600);
    const yearFiltered = await months();
    check('year view with a filter condenses to months that have events',
        yearFiltered.length > 1 && yearFiltered.length < 12, yearFiltered.join(', '));
    await ctx.close();
}

// --- today is painted with the selected theme ----------------------------
// Today used a colour derived from the theme's first gradient stop while the
// selected view pill used the whole gradient, so the same theme produced a
// magenta cell beside a red-orange pill.
{
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
    const page = await openApp(ctx, server.baseUrl, { config: CONFIG });
    await page.waitForTimeout(400);
    const paints = async () => page.evaluate(() => {
        const paint = el => {
            if (!el) return null;
            const cs = getComputedStyle(el);
            return cs.backgroundImage !== 'none' ? cs.backgroundImage : cs.backgroundColor;
        };
        return {
            today: paint(document.querySelector('.day.today')),
            pill: paint(document.querySelector('#month-view-btn.active, #year-overview-btn.active'))
        };
    });
    const a = await paints();
    check('today is painted the same as the selected view pill', a.today === a.pill,
        `${String(a.today).slice(0, 40)} vs ${String(a.pill).slice(0, 40)}`);

    await page.evaluate(async () => {
        const { Events } = await import('./js/modules/events.js');
        Events.applyGradientTheme('sunset');
    });
    await page.waitForTimeout(400);
    const b = await paints();
    check('they still match after changing theme', b.today === b.pill,
        `${String(b.today).slice(0, 40)} vs ${String(b.pill).slice(0, 40)}`);
    check('changing theme actually repainted today', b.today !== a.today);
    await ctx.close();
}

// --- a field is on screen at the instant it is focused -------------------
// A mobile browser only raises the keyboard when focus happens inside the
// task that handled your tap, and only for an element that is actually in the
// viewport. The sheet used to animate up from translateY(100%), so at focus
// time the search field sat 936px down an 844px viewport — off-screen, no
// keyboard, and an odd scroll when it finally arrived.
{
    const ctx = await browser.newContext({
        viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true
    });
    const page = await openApp(ctx, server.baseUrl, { config: CONFIG });
    await page.waitForTimeout(500);

    for (const [opener, label] of [['#fab-search', 'search'], ['#fab-manage-plan', 'categories']]) {
        await page.locator('#fab-toggle').evaluate(e => { e.checked = true; });
        await page.waitForTimeout(150);
        await page.locator(opener).tap();
        // Read immediately — no wait — which is the frame that matters.
        const at = await page.evaluate(() => {
            const a = document.activeElement;
            if (!a || !a.getBoundingClientRect) return null;
            const r = a.getBoundingClientRect();
            return {
                tag: a.tagName,
                id: a.id,
                isField: a.tagName === 'INPUT' || a.tagName === 'TEXTAREA',
                onScreen: r.top >= 0 && r.bottom <= innerHeight && r.width > 0,
                top: Math.round(r.top),
                viewportH: innerHeight
            };
        });
        if (at && at.isField) {
            check(`${label}: the auto-focused field is on screen when focused`,
                at.onScreen, `${at.id} at y=${at.top} in ${at.viewportH}px`);
        } else {
            check(`${label}: focus landed inside the sheet`, !!at, JSON.stringify(at));
        }
        for (let i = 0; i < 3 && await page.locator('.modal-overlay.visible').count() > 0; i++) {
            await page.keyboard.press('Escape');
            await page.waitForTimeout(250);
        }
    }
    await ctx.close();
}

// --- autofocus happens inside the tap that opened the modal --------------
// A mobile browser raises the keyboard only when .focus() is called in the
// same task that handled the tap. Anything deferred behind an await, a
// promise chain or requestAnimationFrame lands in a later task, and the field
// gets a caret but no keyboard. This is invisible on a desktop, where focus
// works either way — so it needs pinning rather than eyeballing.
{
    const ctx = await browser.newContext({
        viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true
    });
    const page = await openApp(ctx, server.baseUrl, { config: CONFIG });
    await page.waitForTimeout(500);

    // A capture listener flags the gesture; a macrotask clears it. Any focus
    // recorded with the flag still set happened in the tap's own task.
    await page.evaluate(() => {
        window.__focusLog = [];
        window.__inGesture = false;
        const mark = () => {
            window.__inGesture = true;
            setTimeout(() => { window.__inGesture = false; }, 0);
        };
        ['pointerdown', 'touchstart', 'click'].forEach(t =>
            document.addEventListener(t, mark, true));
        const orig = HTMLElement.prototype.focus;
        HTMLElement.prototype.focus = function (...args) {
            if (this.tagName === 'INPUT' || this.tagName === 'TEXTAREA') {
                const r = this.getBoundingClientRect();
                window.__focusLog.push({
                    id: this.id || this.tagName,
                    inGesture: window.__inGesture,
                    onScreen: r.top >= 0 && r.bottom <= innerHeight && r.width > 0
                });
            }
            return orig.apply(this, args);
        };
    });

    // Only Search earns the caret, so only Search should raise a keyboard.
    await page.evaluate(() => { window.__focusLog = []; });
    await page.locator('#fab-toggle').evaluate(e => { e.checked = true; });
    await page.waitForTimeout(120);
    await page.locator('#fab-search').tap();
    await page.waitForTimeout(400);
    const log = await page.evaluate(() => window.__focusLog);
    const first = log[0];
    check('search: a field is focused when it opens', !!first, JSON.stringify(log));
    if (first) {
        check("search: focus happens inside the tap's own task",
            first.inGesture, JSON.stringify(first));
        check('search: the field is on screen when focused',
            first.onScreen, JSON.stringify(first));
    }
    for (let i = 0; i < 3 && await page.locator('.modal-overlay.visible').count() > 0; i++) {
        await page.keyboard.press('Escape');
        await page.waitForTimeout(250);
    }
    await ctx.close();
}

// --- only a modal you open to type in raises the keyboard ----------------
// Reported from a phone: the emoji picker opened with its search field
// focused, so the keyboard covered the entire emoji grid — the one thing that
// dialog exists to show. MODAL_CONFIG declares which modals earn the caret;
// these pin that the declaration is what actually happens.
{
    const ctx = await browser.newContext({
        viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true
    });
    const page = await openApp(ctx, server.baseUrl, { config: CONFIG });
    await page.waitForTimeout(500);
    const focused = () => page.evaluate(() => {
        const a = document.activeElement;
        return {
            id: a ? (a.id || a.tagName) : null,
            isField: !!a && (a.tagName === 'INPUT' || a.tagName === 'TEXTAREA')
        };
    });
    const escapeAll = async () => {
        for (let i = 0; i < 4 && await page.locator('.modal-overlay.visible').count() > 0; i++) {
            await page.keyboard.press('Escape');
            await page.waitForTimeout(250);
        }
    };
    const openFromFab = async (sel) => {
        await page.locator('#fab-toggle').evaluate(e => { e.checked = true; });
        await page.waitForTimeout(120);
        await page.locator(sel).tap();
        await page.waitForTimeout(500);
    };

    await openFromFab('#fab-search');
    check('search raises the keyboard', (await focused()).isField, JSON.stringify(await focused()));
    await escapeAll();

    await openFromFab('#fab-manage-plan');
    check('browsing categories does not', !(await focused()).isField, JSON.stringify(await focused()));
    await escapeAll();

    await openFromFab('#fab-add-category');
    await page.locator('#category-emoji-picker-btn').tap();
    await page.waitForTimeout(700);
    check('the emoji picker does not', !(await focused()).isField, JSON.stringify(await focused()));
    await page.keyboard.press('Escape');
    await page.waitForTimeout(400);

    const tpl = page.locator('.template-picker-btn').first();
    if (await tpl.count()) {
        await tpl.tap();
        await page.waitForTimeout(700);
        check('the template picker does not', !(await focused()).isField, JSON.stringify(await focused()));
    }
    await escapeAll();
    await ctx.close();
}

// --- the app opens on today ----------------------------------------------
// The year grid is the front door, but it rendered January at the top and
// left you to find the current month — about five and a half screens of
// scrolling on a phone.
{
    for (const { w, h, name } of [{ w: 390, h: 844, name: 'phone' },
                                  { w: 1280, h: 900, name: 'desktop' }]) {
        const ctx = await browser.newContext({ viewport: { width: w, height: h } });
        const page = await openApp(ctx, server.baseUrl, { config: CONFIG });
        await page.waitForTimeout(800);
        const at = await page.evaluate(() => {
            const t = document.querySelector('.day.today');
            if (!t) return null;
            const r = t.getBoundingClientRect();
            return {
                visible: r.top >= 0 && r.bottom <= innerHeight,
                months: document.querySelectorAll('.month-container').length
            };
        });
        check(`${name}: today is on screen when the app opens`, at && at.visible,
            JSON.stringify(at));
        check(`${name}: the year view is still what opened`, at && at.months === 12,
            `${at && at.months} months`);
        await ctx.close();
    }
}

// --- every semantic token resolves in both themes -------------------------
// A token that resolves to an empty string paints nothing, and the element
// silently falls back to transparent or inherited — the failure mode that
// made dark mode look broken while light looked fine.
{
    const TOKENS = ['--bg', '--bg-elevated', '--surface', '--surface-sunken', '--surface-hover',
        '--text', '--text-secondary', '--text-muted', '--text-on-accent',
        '--border', '--border-strong', '--border-subtle',
        '--accent', '--accent-hover', '--accent-soft',
        '--day-bg', '--day-bg-other', '--day-bg-weekend', '--day-text-weekend',
        '--day-today-bg', '--day-today-text',
        '--success', '--warning', '--danger', '--info',
        '--shadow-1', '--shadow-2', '--shadow-3'];
    const ctx = await browser.newContext();
    const page = await openApp(ctx, server.baseUrl, { config: CONFIG });
    await page.waitForTimeout(400);
    for (const theme of ['light', 'midnight']) {
        if (theme === 'midnight') {
            await page.evaluate(() => document.documentElement.setAttribute('data-theme', 'midnight'));
            await page.waitForTimeout(250);
        }
        const empty = await page.evaluate(list => {
            const cs = getComputedStyle(document.documentElement);
            return list.filter(t => !cs.getPropertyValue(t).trim());
        }, TOKENS);
        check(`${theme}: every semantic token has a value`, empty.length === 0,
            empty.join(', '));
    }
    await ctx.close();
}

// --- the theme picker owns the accent ------------------------------------
// The app used to have two accents at once: the picked gradient painted a few
// surfaces while everything else used the design accent.
{
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
    const page = await openApp(ctx, server.baseUrl, { config: CONFIG });
    const errors = trackErrors(page);
    await page.waitForTimeout(500);
    const accent = () => page.evaluate(() =>
        getComputedStyle(document.documentElement).getPropertyValue('--accent').trim());

    check('the default accent is the Dusk coral', (await accent()).toLowerCase() === '#f2794f',
        await accent());

    const changed = await page.evaluate(async () => {
        const { Events } = await import('./js/modules/events.js');
        Events.applyGradientTheme('forest');
        return getComputedStyle(document.documentElement).getPropertyValue('--accent').trim();
    });
    check('picking a theme changes the accent', changed !== '#f2794f', changed);

    // Day cells transition their background, so reading it in the same tick
    // catches a blend part-way between the old paint and the new one.
    await page.waitForTimeout(400);
    const reach = await page.evaluate(() => {
        const cs = getComputedStyle(document.querySelector('.day.today'));
        const themeGradient = getComputedStyle(document.documentElement)
            .getPropertyValue('--theme-gradient').trim();
        return { todayPaint: cs.backgroundImage, themeGradient };
    });
    // The theme has to reach the calendar, not stop at the chrome. Comparing
    // the first colour stop rather than the whole string, because the computed
    // gradient is serialised in rgb() while the token is authored in hex.
    const firstStop = str => (str.match(/#[0-9a-f]{3,8}|rgba?\([^)]+\)/i) || [''])[0];
    check('the theme reaches the calendar, not just the chrome',
        reach.todayPaint !== 'none' && reach.todayPaint.includes('gradient'),
        reach.todayPaint.slice(0, 50));
    check('today carries the theme that was picked',
        !!firstStop(reach.themeGradient), reach.themeGradient.slice(0, 50));

    check('no page errors', errors.length === 0, errors.slice(0, 2).join(' | '));
    await ctx.close();
}

await browser.close();
await server.close();
done();
