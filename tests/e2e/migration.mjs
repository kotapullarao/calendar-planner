import { startServer, launchBrowser, trackErrors } from '../helpers/browser.mjs';
import { createSuite } from '../helpers/assert.mjs';

const { check, done } = createSuite('migration in the browser');
const server = await startServer();
const BASE = server.baseUrl;
const browser = await launchBrowser();

const CONFIG_KEY = 'calendar-plan-config';
const BACKUP_KEY = 'calendar-plan-config-backup';

const year = new Date().getFullYear();

/** An unversioned config in the original shape, as a real user would have. */
const LEGACY = {
    eventCategories: [
        {
            id: 'work', name: 'Work', emoji: '💼', color: '#3b82f6', type: 'single',
            excludeHolidays: false, childCategoryIds: [],
            dates: [
                `${year}-03-09`,                                          // bare string
                { start: `${year}-03-11`, end: `${year}-03-13` },          // range
                { start: `${year}-03-16`, end: `${year}-03-16`, title: 'Review', time: '11:00' }
            ]
        },
        {
            id: 'feed', name: 'Team Feed', emoji: '🔗', color: '#0891b2', type: 'ics',
            readOnly: true, sourceUrl: 'https://example.com/f.ics',
            excludeHolidays: false, childCategoryIds: [],
            dates: [`${year}-03-10`],
            eventsByDate: { [`${year}-03-10`]: [{ title: 'Sprint demo', time: '15:00' }] }
        }
    ],
    icsSubscriptions: [{ id: 'feed', url: 'https://example.com/f.ics', enabled: true }],
    icsProxyUrl: 'https://worker.example/?url={url}',
    icsSyncIntervalMinutes: 30
};

const ctx = await browser.newContext();
const page = await ctx.newPage();
// The seeded subscription URL is unreachable by design, and Chromium logs a
// console error for the failed fetch — expected noise for this scenario.
const errors = trackErrors(page, {
    ignore: [/ERR_CONNECTION_RESET/, /ERR_FAILED/, /Failed to load resource/]
});

// Seed the legacy config, then load the app so migration runs on startup.
await page.goto(BASE, { waitUntil: 'domcontentloaded' });
await page.evaluate(([key, cfg]) => {
    localStorage.setItem('calendar-walkthrough-v4-seen', '1');
    localStorage.setItem(key, JSON.stringify(cfg));
}, [CONFIG_KEY, LEGACY]);

await page.goto(BASE, { waitUntil: 'networkidle' });
await page.waitForTimeout(1200);

const stored = await page.evaluate(k => JSON.parse(localStorage.getItem(k)), CONFIG_KEY);

check('config is versioned after load', stored.schemaVersion === 2, `v${stored.schemaVersion}`);
check('no categories lost', stored.eventCategories.length === 2, `${stored.eventCategories.length}`);

const work = stored.eventCategories.find(c => c.id === 'work');
check('every date entry is now an object',
    work.dates.every(d => typeof d === 'object' && d.start && d.end),
    JSON.stringify(work.dates[0]));
check('bare date became a one-day span',
    work.dates[0].start === `${year}-03-09` && work.dates[0].end === `${year}-03-09`);
check('range survived', work.dates[1].end === `${year}-03-13`);
check('event details survived', work.dates[2].title === 'Review' && work.dates[2].time === '11:00');

const feed = stored.eventCategories.find(c => c.id === 'feed');
check('subscribed calendar keeps its detail map',
    feed.eventsByDate[`${year}-03-10`][0].title === 'Sprint demo');
check('subscription settings survived',
    stored.icsProxyUrl === LEGACY.icsProxyUrl && stored.icsSyncIntervalMinutes === 30);
check('subscription list survived', (stored.icsSubscriptions || []).length === 1);

// --- the backup ----------------------------------------------------------
const backup = await page.evaluate(k => JSON.parse(localStorage.getItem(k) || 'null'), BACKUP_KEY);
check('a pre-migration backup was written', !!backup);
check('backup holds the ORIGINAL shape (bare string intact)',
    backup && typeof backup.config.eventCategories[0].dates[0] === 'string',
    backup ? JSON.stringify(backup.config.eventCategories[0].dates[0]) : 'no backup');
check('backup records when and why', !!(backup && backup.savedAt && backup.reason), backup?.reason);

// --- the app still works on migrated data --------------------------------
check('calendar rendered', await page.locator('.month-container').count() > 0);
const cards = await page.locator('.stat-card').allInnerTexts();
check('both calendars have stat cards',
    cards.some(t => t.includes('Work')) && cards.some(t => t.includes('Team Feed')),
    cards.join(' / ').slice(0, 100));

// Counts must be unchanged by migration: Work covers 1 + 3 + 1 = 5 days.
const workCard = cards.find(t => t.includes('Work')) || '';
check('day count preserved through migration', /\b5\b/.test(workCard), workCard.replace(/\n/g, ' '));

// A migrated single-day entry must still open as a single row, not a range.
await page.locator('#fab-manage-plan').dispatchEvent('click');
await page.waitForTimeout(800);
const row = page.locator('.category-list-item').filter({ hasText: 'Work' }).first();
await row.hover();
await row.locator('[data-edit-id]').dispatchEvent('click');
await page.waitForTimeout(800);
check('editor opened', await page.locator('#category-editor-view').isVisible());
const singles = await page.locator('.date-entry-item.single').count();
const ranges = await page.locator('.date-entry-item.range').count();
check('migrated single days render as single rows', singles === 2 && ranges === 1,
    `${singles} single, ${ranges} range`);
const titles = await page.locator('.event-title-input').evaluateAll(
    els => els.map(el => el.value));
check('the migrated event title reaches the editor', titles.includes('Review'),
    JSON.stringify(titles));
await page.keyboard.press('Escape');
await page.waitForTimeout(400);

// --- idempotency across reloads ------------------------------------------
const before = JSON.stringify(stored);
await page.goto(BASE, { waitUntil: 'networkidle' });
await page.waitForTimeout(1000);
const after = await page.evaluate(k => localStorage.getItem(k), CONFIG_KEY);
check('reloading does not rewrite the config', JSON.parse(after).schemaVersion === 2);
check('migrated config is stable across reloads',
    JSON.stringify(JSON.parse(after)) === before);

// A second migration must not clobber the original backup.
const backup2 = await page.evaluate(k => JSON.parse(localStorage.getItem(k) || 'null'), BACKUP_KEY);
check('backup still holds the pre-migration original',
    backup2 && typeof backup2.config.eventCategories[0].dates[0] === 'string');

check('no page errors', errors.length === 0, errors.slice(0, 2).join(' | '));

await browser.close();
await server.close();
done();
