import { startServer, launchBrowser, trackErrors } from '../helpers/browser.mjs';
import { createSuite } from '../helpers/assert.mjs';

const { check, done } = createSuite('local events');
const server = await startServer();
const BASE = server.baseUrl;
const browser = await launchBrowser();

const ctx = await browser.newContext();
const page = await ctx.newPage();
const errors = trackErrors(page);

await page.goto(BASE, { waitUntil: 'domcontentloaded' });
await page.evaluate(() => localStorage.setItem('calendar-walkthrough-v4-seen','1'));
await page.goto(BASE, { waitUntil: 'networkidle' });
await page.waitForTimeout(800);

const year = new Date().getFullYear();
const D = `14-01-${year}`;                 // display format DD-MM-YYYY
const ISO = `${year}-01-14`;

// ---- create a category with a titled, timed event via the real editor UI ----
await page.locator('#fab-add-category').dispatchEvent('click');
await page.waitForTimeout(700);
await page.locator('#category-name-input').fill('Doctor');
await page.locator('#category-emoji-input').fill('🩺');

// add a single date row
await page.locator('.add-single-date-btn').first().click();
await page.waitForTimeout(400);
const row = page.locator('.date-entry-item').last();
await row.locator('.date-display-input').first().fill(D);
await row.locator('.date-display-input').first().blur();
await page.waitForTimeout(400);

// open the details panel and fill it
await row.locator('.date-details-toggle').click();
await page.waitForTimeout(200);
check('details panel opens', await row.locator('.date-entry-details').isVisible());
await row.locator('.event-title-input').fill('Dentist appointment');
await row.locator('.event-time-input').fill('11:30');
await row.locator('.event-end-time-input').fill('12:15');
await row.locator('.event-location-input').fill('Smile Clinic');
await row.locator('.event-notes-input').fill('Bring insurance card');

await page.locator('#manage-plan-modal button[type="submit"], button[form="category-editor-form"]').first().click();
await page.waitForTimeout(900);

// ---- storage shape ----
const stored = await page.evaluate(() => JSON.parse(localStorage.getItem('calendar-plan-config')));
const cat = stored.eventCategories.find(c => c.name === 'Doctor');
check('category saved', !!cat);
const entry = cat && cat.dates[0];
check('event stored as object with details', entry && typeof entry === 'object' &&
  entry.start === ISO && entry.end === ISO && entry.title === 'Dentist appointment' &&
  entry.time === '11:30' && entry.endTime === '12:15' &&
  entry.location === 'Smile Clinic' && entry.notes === 'Bring insurance card',
  JSON.stringify(entry));

// a details-free date must stay a compact string: add one via the editor again
await page.keyboard.press('Escape');
await page.waitForTimeout(400);

// ---- calendar surfaces it ----
await page.locator('#year-overview-btn').click();
await page.waitForTimeout(900);
const day = page.locator(`.day[data-date="${ISO}"]:not(.other-month)`).first();
check('day cell has tooltip', ((await day.getAttribute('title')) || '').includes('11:30 Dentist appointment'),
  await day.getAttribute('title'));

await day.click();
await page.waitForTimeout(400);
let peek = page.locator('#day-peek');
check('peek opens for local event', await peek.count() === 1);
let txt = await peek.innerText();
check('peek shows time range + title', txt.includes('11:30–12:15') && txt.includes('Dentist appointment'), txt.replace(/\n/g,' | ').slice(0,120));
check('peek shows location and notes', txt.includes('📍 Smile Clinic') && txt.includes('Bring insurance card'));
check('peek offers Edit for local category', await peek.locator('.day-peek-edit').count() === 1);

// ---- day navigation from the peek ----
await peek.locator('.day-peek-nav').last().click(); // next day
await page.waitForTimeout(400);
peek = page.locator('#day-peek');
txt = await peek.innerText();
check('nav › moves to Jan 15', txt.includes('Jan 15'), txt.split('\n')[0]);
check('empty day says so', txt.includes('No events this day'));
await peek.locator('.day-peek-nav').first().click(); // back
await page.waitForTimeout(400);
txt = await page.locator('#day-peek').innerText();
check('nav ‹ returns to the event day', txt.includes('Dentist appointment'));

// ---- edit from the peek ----
await page.locator('#day-peek .day-peek-edit').click();
await page.waitForTimeout(900);
check('edit opens the category editor', await page.locator('#category-editor-view').isVisible());
check('peek closed by modal', await page.locator('#day-peek').count() === 0);
const title = await page.locator('.event-title-input').first().inputValue();
const time = await page.locator('.event-time-input').first().inputValue();
check('editor round-trips details', title === 'Dentist appointment' && time === '11:30', `${title} @ ${time}`);
check('details panel auto-open when populated', await page.locator('.date-entry-details').first().isVisible());

check('no page errors', errors.length === 0, errors.slice(0,2).join(' | '));
await browser.close();
await server.close();
done();
