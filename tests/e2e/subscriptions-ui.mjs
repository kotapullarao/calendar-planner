import { startServer, launchBrowser, trackErrors } from '../helpers/browser.mjs';
import { createSuite } from '../helpers/assert.mjs';

const { check, done } = createSuite('subscriptions ui');
const server = await startServer();
const BASE = server.baseUrl;
const browser = await launchBrowser();

const year = new Date().getFullYear();
const FEED = `BEGIN:VCALENDAR\nVERSION:2.0\nX-WR-CALNAME:Team <img src=x onerror=alert(1)> Cal\nBEGIN:VEVENT\nUID:p1\nSUMMARY:Standup\nDTSTART;VALUE=DATE:${year}0105\nEND:VEVENT\nEND:VCALENDAR`;
const GOOGLE = `BEGIN:VCALENDAR\nVERSION:2.0\nBEGIN:VEVENT\nUID:g1\nDTSTART;VALUE=DATE:${year}0704\nEND:VEVENT\nEND:VCALENDAR`;

const ctx = await browser.newContext();
const page = await ctx.newPage();
const errors = trackErrors(page);
page.on('dialog', d => { errors.push('DIALOG: ' + d.message()); d.dismiss(); });

await ctx.route('**/xss-feed.ics', r => r.fulfill({ status: 200, contentType: 'text/calendar', body: FEED }));
// Simulated worker proxy: only answers when the sample google URL arrives encoded
await ctx.route('**/fake-worker/**', r => {
  const u = new URL(r.request().url());
  const target = u.searchParams.get('url') || '';
  if (target.includes('calendar.google.com')) r.fulfill({ status: 200, contentType: 'text/calendar', body: GOOGLE });
  else r.fulfill({ status: 400, body: 'missing url' });
});

await page.goto(BASE, { waitUntil: 'domcontentloaded' });
await page.evaluate(() => localStorage.setItem('calendar-walkthrough-v4-seen','1'));
await page.goto(BASE, { waitUntil: 'networkidle' });
await page.waitForTimeout(800);

// --- subscribe to the hostile-name feed ---
await page.locator('#fab-subscriptions').dispatchEvent('click');
await page.waitForTimeout(600);
await page.locator('#add-subscription-btn').click();
await page.waitForTimeout(300);

// provider chips
check('provider chips render', await page.locator('.provider-chip').count() === 3);
await page.locator('.provider-chip[data-provider="google"]').click();
const hint = await page.locator('#subscription-url-hint').innerText();
check('google chip swaps hint', hint.includes('Secret address'), hint.slice(0, 60));

await page.locator('#subscription-url-input').fill(`${BASE}/xss-feed.ics`);
await page.locator('#subscription-save-btn').click();
await page.waitForTimeout(2000);

// --- XSS hardening: hostile name must render inert everywhere ---
check('no dialog / injected script fired', !errors.some(e => e.startsWith('DIALOG')), errors.join('|').slice(0,80));
const rowTxt = await page.locator('.subscription-item').first().innerText();
check('hostile name shown as text in list', rowTxt.includes('<img'), rowTxt.replace(/\n/g,' | ').slice(0,80));

await page.keyboard.press('Escape');
await page.waitForTimeout(700);
const cardHtml = await page.evaluate(() => {
  const card = [...document.querySelectorAll('.stat-card')].find(c => c.innerText.includes('Team'));
  return card ? { html: card.querySelector('.stat-label').innerHTML, badge: !!card.querySelector('.stat-sync-badge'), imgs: card.querySelectorAll('img').length } : null;
});
check('stat card renders hostile name escaped', cardHtml && cardHtml.imgs === 0 && cardHtml.html.includes('&lt;img'), cardHtml ? cardHtml.html.slice(0,80) : 'card missing');
check('stat card shows sync badge', cardHtml && cardHtml.badge);

// --- manage list: ICS row is read-only-ish ---
await page.locator('#fab-manage-plan').dispatchEvent('click');
await page.waitForTimeout(800);
const icsRow = page.locator('.category-list-item').filter({ hasText: 'Team' }).first();
check('list shows Synced tag', (await icsRow.innerText()).includes('Synced'));
check('no duplicate button on ICS row', await icsRow.locator('[data-duplicate-id]').count() === 0);
check('list renders hostile name escaped', await icsRow.locator('img').count() === 0);

// --- deleting from the list actually unsubscribes ---
await icsRow.hover(); await icsRow.locator('[data-delete-id]').dispatchEvent('click');
await page.waitForTimeout(700);
const after = await page.evaluate(() => {
  const cfg = JSON.parse(localStorage.getItem('calendar-plan-config'));
  return { subs: (cfg.icsSubscriptions||[]).length, cats: cfg.eventCategories.filter(c=>c.type==='ics').length };
});
check('list delete removes subscription too', after.subs === 0 && after.cats === 0, JSON.stringify(after));
const undoVisible = await page.locator('#undo-toast').isVisible().catch(()=>false);
check('undo offered', undoVisible);
if (undoVisible) {
  await page.locator('#undo-action').click();
  await page.waitForTimeout(600);
  const back = await page.evaluate(() => (JSON.parse(localStorage.getItem('calendar-plan-config')).icsSubscriptions||[]).length);
  check('undo restores subscription', back === 1);
}
await page.keyboard.press('Escape');
await page.waitForTimeout(500);

// --- proxy test button ---
await page.locator('#fab-subscriptions').dispatchEvent('click');
await page.waitForTimeout(600);
await page.locator('#subscription-settings-btn').click();
await page.waitForTimeout(400);
check('setup guide present', await page.locator('.proxy-setup-guide').count() === 1);

await page.locator('#subscription-proxy-input').fill(`${BASE}/fake-worker/?url={url}`);
await page.locator('#subscription-test-proxy-btn').click();
await page.waitForTimeout(1200);
let res = await page.locator('#proxy-test-result').innerText();
check('proxy test succeeds via {url} template', res.includes('✓'), res);

// The exact shape from the user's screenshot: bare worker base URL, trailing
// slash, no {url}. Must be treated as ?url=<encoded> automatically.
await page.locator('#subscription-proxy-input').fill(`${BASE}/fake-worker/`);
await page.locator('#subscription-test-proxy-btn').click();
await page.waitForTimeout(1200);
res = await page.locator('#proxy-test-result').innerText();
check('bare worker URL (no {url}) works', res.includes('✓'), res.slice(0,60));

await page.locator('#subscription-proxy-input').fill(`${BASE}/nonexistent-worker/?url={url}`);
await page.locator('#subscription-test-proxy-btn').click();
await page.waitForTimeout(1200);
res = await page.locator('#proxy-test-result').innerText();
check('proxy test reports failure clearly', /HTTP|reach/i.test(res), res.slice(0,70));

check('no page errors', errors.filter(e=>!e.includes('Failed to load resource')).length === 0, errors.slice(0,2).join(' | '));
await browser.close();
await server.close();
done();
