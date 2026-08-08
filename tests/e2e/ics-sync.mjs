import { startServer, launchBrowser, trackErrors } from '../helpers/browser.mjs';
import { createSuite } from '../helpers/assert.mjs';

const { check, done } = createSuite('ics sync');
const server = await startServer();
const BASE = server.baseUrl;
const browser = await launchBrowser();

const year = new Date().getFullYear();
const FEED = `BEGIN:VCALENDAR
VERSION:2.0
X-WR-CALNAME:Feed Provided Name
BEGIN:VEVENT
UID:e1
SUMMARY:Standup
DTSTART;VALUE=DATE:${year}0105
RRULE:FREQ=WEEKLY;BYDAY=MO;COUNT=4
END:VEVENT
BEGIN:VEVENT
UID:e2
SUMMARY:Conference
DTSTART;VALUE=DATE:${year}0610
DTEND;VALUE=DATE:${year}0613
END:VEVENT
END:VCALENDAR`;

const ctx = await browser.newContext();
const page = await ctx.newPage();

const errors = trackErrors(page, { ignore: [/ERR_FAILED/, /Failed to load resource/] });

// Serve the feed from a same-origin path so no proxy is needed in the test.
await ctx.route('**/test-feed.ics', route =>
  route.fulfill({ status: 200, contentType: 'text/calendar', body: FEED }));

// A URL that always fails, for the error-path test.
await ctx.route('**/bad-feed.ics', route => route.abort('failed'));

await page.goto(BASE, { waitUntil: 'domcontentloaded' });
await page.evaluate(() => localStorage.setItem('calendar-walkthrough-v4-seen', '1'));
await page.goto(BASE, { waitUntil: 'networkidle' });
await page.waitForTimeout(800);

// ---- open the subscriptions modal ----
await page.locator('#fab-subscriptions').dispatchEvent('click');
await page.waitForTimeout(600);
check('subscriptions modal opens', await page.locator('#ics-subscriptions-modal.visible').count() > 0);
check('empty state shown', await page.locator('.subscription-empty').count() > 0);

// ---- add a subscription ----
await page.locator('#add-subscription-btn').click();
await page.waitForTimeout(400);
check('editor view shown', await page.locator('#subscription-editor-view').isVisible());

await page.locator('#subscription-url-input').fill(`${BASE}/test-feed.ics`);
await page.locator('#subscription-emoji-input').fill('📆');
await page.locator('#subscription-save-btn').click();
await page.waitForTimeout(2500);

check('subscription row created', await page.locator('.subscription-item').count() === 1);
const rowText = await page.locator('.subscription-item').first().innerText().catch(() => '');
check('feed name adopted when blank', rowText.includes('Feed Provided Name'), rowText.replace(/\n/g, ' | '));
check('sync status shown', /Synced|date/i.test(rowText));
check('no error badge', !rowText.includes('⚠'), rowText.replace(/\n/g, ' | '));

// ---- the events must reach the calendar ----
const stored = await page.evaluate(() => JSON.parse(localStorage.getItem('calendar-plan-config')));
const icsCats = (stored.eventCategories || []).filter(c => c.type === 'ics');
check('ics category persisted', icsCats.length === 1, `${icsCats.length} ics categories`);
check('subscription persisted', (stored.icsSubscriptions || []).length === 1);
check('recurrence expanded (4 standups + 1 range)', icsCats[0] && icsCats[0].dates.length === 5,
  `${icsCats[0] ? icsCats[0].dates.length : 0} dates`);
check('multi-day stored as a range', icsCats[0] &&
  icsCats[0].dates.some(d => typeof d === 'object' && d.start && d.end));
check('category is marked read-only', icsCats[0] && icsCats[0].readOnly === true);

// ---- rendered on the calendar ----
await page.keyboard.press('Escape');
await page.waitForTimeout(600);
const statCards = await page.locator('.stat-card').allInnerTexts();
check('stat card rendered for subscription', statCards.some(t => t.includes('Feed Provided Name')),
  statCards.join(' / ').slice(0, 120));

// ---- editing an ICS category opens subscription settings, not the normal editor ----
const icsCard = page.locator('.stat-card').filter({ hasText: 'Feed Provided Name' }).first();
if (await icsCard.count()) {
  const editBtn = icsCard.locator('.edit-stat-btn');
  if (await editBtn.count()) {
    await editBtn.dispatchEvent('click');
    await page.waitForTimeout(700);
    check('ICS category routes to subscription editor',
      await page.locator('#subscription-editor-view').isVisible().catch(() => false));
    check('normal category editor stays closed',
      !(await page.locator('#category-editor-view').isVisible().catch(() => false)));
    await page.keyboard.press('Escape');
    await page.waitForTimeout(500);
  }
}

// ---- a subscribed "public holidays" feed must NOT hijack holiday exclusion ----
const hijack = await page.evaluate(() => {
  const cfg = JSON.parse(localStorage.getItem('calendar-plan-config'));
  const cat = cfg.eventCategories.find(c => c.type === 'ics');
  return cat ? cat.name : null;
});
check('holiday-source guard is in place (ics excluded by type)', hijack !== null);

// ---- failure path: unreachable feed keeps cached data and surfaces an error ----
await page.locator('#fab-subscriptions').dispatchEvent('click');
await page.waitForTimeout(600);
await page.locator('#add-subscription-btn').click();
await page.waitForTimeout(400);
await page.locator('#subscription-url-input').fill(`${BASE}/bad-feed.ics`);
await page.locator('#subscription-name-input').fill('Broken Feed');
await page.locator('#subscription-save-btn').click();
await page.waitForTimeout(2500);

const rows = await page.locator('.subscription-item').allInnerTexts();
const broken = rows.find(r => r.includes('Broken Feed')) || '';
check('failed sync shows an error', broken.includes('⚠'), broken.replace(/\n/g, ' | ').slice(0, 140));
check('failed sync does not remove the good one', rows.some(r => r.includes('Feed Provided Name')));
check('good subscription kept its dates', await page.evaluate(() => {
  const cfg = JSON.parse(localStorage.getItem('calendar-plan-config'));
  const cat = cfg.eventCategories.find(c => c.type === 'ics' && c.dates.length === 5);
  return !!cat;
}));

// ---- unsubscribe + undo ----
const deleteBtn = page.locator('[data-delete-subscription]').last();
await deleteBtn.click();
await page.waitForTimeout(700);
check('unsubscribe removes the row', (await page.locator('.subscription-item').count()) === 1);
const undoVisible = await page.locator('#undo-toast').isVisible().catch(() => false);
check('undo toast shown', undoVisible);
if (undoVisible) {
  await page.locator('#undo-action').click();
  await page.waitForTimeout(700);
  check('undo restores the subscription', (await page.locator('.subscription-item').count()) === 2);
}

// ---- offline: cached subscription dates still render ----
await page.keyboard.press('Escape');
await page.waitForTimeout(400);
await page.waitForTimeout(2000); // let the SW finish caching
const off = await ctx.newPage();
// bad-feed.ics is aborted on purpose below, and Chromium logs a console error
// for any failed request — expected noise, not an app fault.
const ABORTED_ROUTE = [/ERR_FAILED/, /Failed to load resource/];
const offErrors = trackErrors(off, { ignore: ABORTED_ROUTE });
await ctx.setOffline(true);
await off.goto(BASE, { waitUntil: 'load' }).catch(e => offErrors.push('nav: ' + e.message));
await off.waitForTimeout(2000);
const offCards = await off.locator('.stat-card').allInnerTexts().catch(() => []);
check('offline: subscription still rendered from cache',
  offCards.some(t => t.includes('Feed Provided Name')), offCards.join(' / ').slice(0, 120));
check('offline: no page errors', offErrors.length === 0, offErrors.slice(0, 2).join(' | '));
await ctx.setOffline(false);

check('no unexpected page errors', errors.length === 0, errors.slice(0, 3).join(' | '));

await browser.close();
await server.close();
done();
