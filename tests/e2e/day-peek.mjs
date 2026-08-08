import { startServer, launchBrowser, trackErrors } from '../helpers/browser.mjs';
import { createSuite } from '../helpers/assert.mjs';

const { check, done } = createSuite('day peek');
const server = await startServer();
const BASE = server.baseUrl;
const browser = await launchBrowser();

const year = new Date().getFullYear();
const FEED = `BEGIN:VCALENDAR
VERSION:2.0
X-WR-CALNAME:Work
BEGIN:VEVENT
UID:k1
SUMMARY:Standup <b>meeting</b>
DESCRIPTION:Sprint <img src=x onerror=alert(2)> notes\nsecond line
LOCATION:Room 42
DTSTART:${year}0114T093000
DTEND:${year}0114T100000
END:VEVENT
BEGIN:VEVENT
UID:k2
SUMMARY:Design review
DTSTART:${year}0114T140000
DTEND:${year}0114T150000
END:VEVENT
BEGIN:VEVENT
UID:k3
SUMMARY:Offsite week
DTSTART;VALUE=DATE:${year}0114
DTEND;VALUE=DATE:${year}0116
END:VEVENT
END:VCALENDAR`;

const ctx = await browser.newContext();
const page = await ctx.newPage();
const errors = trackErrors(page);
await ctx.route('**/work-feed.ics', r => r.fulfill({ status: 200, contentType: 'text/calendar', body: FEED }));

await page.goto(BASE, { waitUntil: 'domcontentloaded' });
await page.evaluate(() => localStorage.setItem('calendar-walkthrough-v4-seen','1'));
await page.goto(BASE, { waitUntil: 'networkidle' });
await page.waitForTimeout(800);

await page.locator('#fab-subscriptions').dispatchEvent('click');
await page.waitForTimeout(600);
await page.locator('#add-subscription-btn').click();
await page.waitForTimeout(300);
await page.locator('#subscription-url-input').fill(`${BASE}/work-feed.ics`);
await page.locator('#subscription-save-btn').click();
await page.waitForTimeout(2000);
await page.keyboard.press('Escape');
await page.waitForTimeout(600);

// Navigate the calendar to January where the events are
await page.evaluate(() => {
  return import('./js/core/state.js').then(({ setState }) => {
    setState.currentMonth(0);
  });
});
await page.locator('#today-btn').click().catch(()=>{});
await page.waitForTimeout(400);
// Force month view january via nav: simplest — year overview shows all months
await page.locator('#year-overview-btn').click();
await page.waitForTimeout(800);

const day = page.locator(`.day[data-date="${year}-01-14"]:not(.other-month)`).first();
check('synced day present', await day.count() > 0);
check('tooltip lists times and titles', ((await day.getAttribute('title')) || '').includes('09:30 Standup'),
  (await day.getAttribute('title') || '').replace(/\n/g,' | '));

// Tap -> peek
await day.click();
await page.waitForTimeout(400);
const peek = page.locator('#day-peek');
check('peek opens on tap', await peek.count() === 1);
const txt = await peek.innerText().catch(()=> '');
check('peek shows calendar name', txt.includes('Work'), txt.replace(/\n/g,' | ').slice(0,120));
check('peek lists timed events in order', txt.indexOf('09:30') < txt.indexOf('14:00') && txt.includes('Design review'));
check('peek shows time range', txt.includes('09:30–10:00'), txt.slice(0,140));
check('peek shows location', txt.includes('📍 Room 42'));
check('peek shows description (hostile part inert)', txt.includes('Sprint <img') &&
  await peek.locator('img').count() === 0);
check('peek shows all-day event', txt.includes('Offsite week'));
check('hostile summary rendered as text', txt.includes('<b>meeting</b>') &&
  await peek.locator('b').count() === 0);

// Escape closes
await page.keyboard.press('Escape');
await page.waitForTimeout(300);
check('Escape closes peek', await page.locator('#day-peek').count() === 0);

// clicking a plain day closes it too
await day.click(); await page.waitForTimeout(300);
await page.locator(`.day[data-date="${year}-01-20"]`).first().click().catch(()=>{});
await page.waitForTimeout(300);
check('clicking elsewhere dismisses peek', await page.locator('#day-peek').count() === 0);

// multi-day: second covered day also has details
const day2 = page.locator(`.day[data-date="${year}-01-15"]:not(.other-month)`).first();
check('second day of span has tooltip too', ((await day2.getAttribute('title')) || '').includes('Offsite week'));

check('no page errors', errors.length === 0, errors.slice(0,2).join(' | '));
await browser.close();
await server.close();
done();
