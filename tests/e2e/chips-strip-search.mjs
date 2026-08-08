import { startServer, launchBrowser, trackErrors } from '../helpers/browser.mjs';
import { createSuite } from '../helpers/assert.mjs';

const { check, done } = createSuite('chips, strip, search');
const server = await startServer();
const BASE = server.baseUrl;
const browser = await launchBrowser();

const iso = d => d.toISOString().slice(0, 10);
const today = new Date();
const soon = new Date(today.getTime() + 3 * 86400000);
const SOON = iso(soon), TODAY = iso(today);

const ctx = await browser.newContext();
const page = await ctx.newPage();
const errors = trackErrors(page);

const CONFIG = {
  eventCategories: [
    { id: 'work', name: 'Work', emoji: '💼', color: '#3b82f6', type: 'single', excludeHolidays: false,
      childCategoryIds: [], dates: [
        { start: SOON, end: SOON, title: 'Board <script>alert(1)</script> review', time: '09:00', endTime: '10:30', location: 'HQ 5F', notes: 'Bring slides' },
        { start: TODAY, end: TODAY, title: 'Standup', time: '08:45' },
        TODAY /* plain date, no details */
      ]},
    { id: 'ics-x', name: 'Team Feed', emoji: '🔗', color: '#0891b2', type: 'ics', readOnly: true,
      excludeHolidays: false, childCategoryIds: [], dates: [SOON],
      eventsByDate: { [SOON]: [{ title: 'Sprint demo', time: '15:00' }] } }
  ],
  icsSubscriptions: []
};

await page.goto(BASE, { waitUntil: 'domcontentloaded' });
await page.evaluate(cfg => {
  localStorage.setItem('calendar-walkthrough-v4-seen', '1');
  localStorage.setItem('calendar-plan-config', JSON.stringify(cfg));
}, CONFIG);
await page.goto(BASE, { waitUntil: 'networkidle' });
await page.waitForTimeout(900);

// ---------- upcoming strip ----------
const strip = page.locator('#upcoming-strip');
check('upcoming strip visible', await strip.isVisible());
const stripTxt = await strip.innerText();
check('strip lists todays standup first', stripTxt.indexOf('Standup') < stripTxt.indexOf('Board'), stripTxt.replace(/\n/g,' | ').slice(0,120));
check('strip includes synced event', stripTxt.includes('Sprint demo'));
check('strip renders hostile title inert', stripTxt.includes('<script>') &&
  await strip.locator('script').count() === 0);

// ---------- month view chips ----------
const inMonth = await page.locator('#month-view-btn.active').count() > 0;
if (!inMonth) { await page.locator('#month-view-btn').click(); await page.waitForTimeout(700); }
check('calendars container has month-mode class', await page.locator('.calendars.month-mode').count() === 1);

// today is in the visible month by default
const todayCell = page.locator(`.day[data-date="${TODAY}"]:not(.other-month)`).first();
const chipTxt = await todayCell.locator('.day-event-chips').innerText().catch(()=> '');
check('month view: chip shows time + title', chipTxt.includes('08:45') && chipTxt.includes('Standup'), chipTxt);
check('chips escape hostile markup', await page.locator('.day-event-chip script').count() === 0);

// year overview: no chips
await page.locator('#year-overview-btn').click();
await page.waitForTimeout(800);
check('year overview has no chips', await page.locator('.day-event-chips').count() === 0);
await page.locator('#month-view-btn').click();
await page.waitForTimeout(700);

// ---------- upcoming chip click jumps + opens peek ----------
await page.locator('.upcoming-chip', { hasText: 'Sprint demo' }).first().click();
await page.waitForTimeout(900);
let peek = page.locator('#day-peek');
check('strip click opens peek on the date', await peek.count() === 1 &&
  (await peek.innerText()).includes('Sprint demo'), (await peek.innerText().catch(()=>'')).replace(/\n/g,' | ').slice(0,100));

// ---------- + Add event from peek ----------
await peek.locator('.day-peek-add').click();
await page.waitForTimeout(900);
check('+Add opens editor', await page.locator('#category-editor-view').isVisible());
const prefDate = await page.locator('.date-entry-item .date-display-input').first().inputValue();
const [yy, mm, dd] = SOON.split('-');
check('+Add prefills the peek date', prefDate === `${dd}-${mm}-${yy}`, prefDate);
check('+Add opens the details panel', await page.locator('.date-entry-details').first().isVisible());
await page.keyboard.press('Escape');
await page.waitForTimeout(400);
await page.keyboard.press('Escape');
await page.waitForTimeout(400);

// ---------- search ----------
await page.locator('#fab-search').dispatchEvent('click');
await page.waitForTimeout(600);
check('search modal opens', await page.locator('#event-search-modal.visible').count() === 1);
await page.locator('#event-search-input').fill('sli');   // matches notes "Bring slides"
await page.waitForTimeout(300);
let rows = await page.locator('.event-search-row').allInnerTexts();
check('search matches notes', rows.some(r => r.includes('Board')), rows.join(' / ').slice(0,100));

await page.locator('#event-search-input').fill('HQ 5F'); // matches location
await page.waitForTimeout(300);
rows = await page.locator('.event-search-row').allInnerTexts();
check('search matches location', rows.length === 1 && rows[0].includes('📍 HQ 5F'), rows.join(' / ').slice(0,100));
check('search result title inert', await page.locator('.event-search-row script').count() === 0);

await page.locator('.event-search-row').first().click();
await page.waitForTimeout(900);
check('result click closes modal', await page.locator('#event-search-modal.visible').count() === 0);
peek = page.locator('#day-peek');
check('result click opens peek on event day', await peek.count() === 1 &&
  (await peek.innerText()).includes('09:00–10:30'));

check('no page errors', errors.length === 0, errors.slice(0,2).join(' | '));
await browser.close();
await server.close();
done();
