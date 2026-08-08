import { startServer, launchBrowser, trackErrors } from '../helpers/browser.mjs';
import { createSuite } from '../helpers/assert.mjs';

const { check, done } = createSuite('holiday guard');
const server = await startServer();
const BASE = server.baseUrl;
const browser = await launchBrowser();

const page = await (await browser.newContext()).newPage();
await page.goto(BASE, { waitUntil: 'domcontentloaded' });
await page.evaluate(() => localStorage.setItem('calendar-walkthrough-v4-seen', '1'));

const year = new Date().getFullYear();
// A workdays-only category covering Mon-Fri of one week, plus a rival
// "Public Holidays" source. 2026-03-02..06 is Mon..Fri.
const seed = (holidayType) => ({
  eventCategories: [
    { id: 'work', name: 'Work', emoji: '💼', color: '#3b82f6', type: 'single',
      excludeHolidays: true, childCategoryIds: [],
      dates: [{ start: `${year}-03-02`, end: `${year}-03-06` }] },
    { id: 'hol', name: 'Public Holidays', emoji: '🎌', color: '#ef4444', type: holidayType,
      excludeHolidays: false, childCategoryIds: [], readOnly: holidayType === 'ics',
      dates: [`${year}-03-04`] }
  ]
});

const countFor = async (holidayType) => {
  await page.evaluate(cfg => localStorage.setItem('calendar-plan-config', JSON.stringify(cfg)), seed(holidayType));
  await page.goto(BASE, { waitUntil: 'networkidle' });
  await page.waitForTimeout(900);
  const card = page.locator('.stat-card').filter({ hasText: 'Work' }).first();
  const txt = await card.innerText();
  return parseInt((txt.match(/\d+/) || ['0'])[0], 10);
};

const withLocal = await countFor('single');
const withIcs = await countFor('ics');

console.log(`\nWork days counted with a LOCAL "Public Holidays" category: ${withLocal}`);
console.log(`Work days counted with an ICS  "Public Holidays" feed:     ${withIcs}\n`);

check('local holiday category IS used as the source (4 of 5 workdays)', withLocal === 4, `got ${withLocal}`);
check('ICS holiday feed is NOT used as the source (all 5 workdays)', withIcs === 5, `got ${withIcs}`);
check('the two differ, proving the guard fires', withLocal !== withIcs);

await browser.close();
await server.close();
done();
