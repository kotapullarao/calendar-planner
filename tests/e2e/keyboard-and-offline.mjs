import { startServer, launchBrowser, trackErrors } from '../helpers/browser.mjs';
import { createSuite } from '../helpers/assert.mjs';

const { check, done } = createSuite('keyboard + offline');
const server = await startServer();
const BASE = server.baseUrl;
const browser = await launchBrowser();

const ctx = await browser.newContext();
const page = await ctx.newPage();

const pageErrors = trackErrors(page);

await page.goto(BASE, { waitUntil: 'networkidle' });
await page.waitForTimeout(800);

const navText = () => page.locator('#nav-display').innerText();
const focusBody = () => page.locator('body').click({ position: { x: 5, y: 5 } });

const start = await navText();
check('app loads, nav display populated', start.trim().length > 0, `nav="${start}"`);

const isYearView = await page.locator('#year-overview-btn.active').count() > 0;
check('default view detected', true, isYearView ? 'year overview' : 'month view');

// ---------- MONTH VIEW: arrows should move by MONTH (matching nav buttons) ----------
await focusBody();
const beforeKey = await navText();
await page.keyboard.press('ArrowRight');
await page.waitForTimeout(300);
const afterKey = await navText();
check('ArrowRight changes the nav display', beforeKey !== afterKey, `"${beforeKey}" -> "${afterKey}"`);

// compare against what the nav BUTTON does from the same starting point
await page.keyboard.press('ArrowLeft');
await page.waitForTimeout(300);
const backToStart = await navText();
check('ArrowLeft returns to the previous position', backToStart === beforeKey, `"${afterKey}" -> "${backToStart}"`);

await page.locator('#nav-next-btn').click();
await page.waitForTimeout(300);
const afterButton = await navText();
check('ArrowRight matches #nav-next-btn exactly', afterButton === afterKey, `button="${afterButton}" key="${afterKey}"`);
await page.locator('#nav-prev-btn').click();
await page.waitForTimeout(300);

// ---------- T = Today ----------
await page.keyboard.press('ArrowRight');
await page.keyboard.press('ArrowRight');
await page.waitForTimeout(300);
const wandered = await navText();
await page.keyboard.press('t');
await page.waitForTimeout(600);
const afterT = await navText();
const nowYear = String(new Date().getFullYear());
check('T returns to today', afterT !== wandered && afterT.includes(nowYear), `"${wandered}" -> "${afterT}"`);
check('T renders today cell', await page.locator('.day.today').count() > 0);

// ---------- YEAR OVERVIEW: arrows should move by YEAR ----------
await page.locator('#year-overview-btn').click();
await page.waitForTimeout(600);
await focusBody();
const yv1 = await navText();
await page.keyboard.press('ArrowRight');
await page.waitForTimeout(400);
const yv2 = await navText();
const y1 = parseInt((yv1.match(/\d{4}/) || [])[0], 10);
const y2 = parseInt((yv2.match(/\d{4}/) || [])[0], 10);
check('year view: ArrowRight advances one year', y2 === y1 + 1, `${y1} -> ${y2}`);
await page.keyboard.press('ArrowLeft');
await page.waitForTimeout(400);
await page.locator('#month-view-btn').click();
await page.waitForTimeout(500);

// ---------- suppression while typing ----------
await page.locator('#fab-manage-plan').dispatchEvent('click');
await page.waitForTimeout(900);
const modalOpen = await page.locator('#manage-plan-modal.visible').count() > 0;
check('manage modal opens', modalOpen);

if (modalOpen) {
  const searchBox = page.locator('#category-search-input');
  if (await searchBox.count()) {
    await searchBox.click();
    const navBefore = await navText();
    await page.keyboard.type('test');
    await page.keyboard.press('ArrowLeft');
    await page.keyboard.press('ArrowRight');
    await page.waitForTimeout(300);
    check('typing in search does not navigate', (await navText()) === navBefore, `nav stayed "${navBefore}"`);
    const typed = await searchBox.inputValue();
    check('search box captured the "t" keystroke', typed.includes('test'), `value="${typed}"`);
  }
  await page.keyboard.press('Escape');
  await page.waitForTimeout(600);
}
check('Escape closes modal', await page.locator('#manage-plan-modal.visible').count() === 0);

// ---------- shortcuts recover after modal closes ----------
await focusBody();
const r1 = await navText();
await page.keyboard.press('ArrowRight');
await page.waitForTimeout(400);
check('shortcuts work again after modal closes', (await navText()) !== r1, `"${r1}" -> "${await navText()}"`);

// ---------- Ctrl+Arrow must NOT hijack ----------
await focusBody();
const c1 = await navText();
await page.keyboard.press('Control+ArrowRight');
await page.waitForTimeout(300);
check('Ctrl+ArrowRight does not navigate', (await navText()) === c1, `nav stayed "${c1}"`);

check('no page errors during shortcut tests', pageErrors.length === 0, pageErrors.slice(0, 3).join(' | '));

// ---------- OFFLINE ----------
await page.goto(BASE, { waitUntil: 'networkidle' });
await page.waitForTimeout(1500);
const swReady = await page.evaluate(async () => {
  if (!('serviceWorker' in navigator)) return 'no-sw-support';
  const reg = await navigator.serviceWorker.ready.catch(() => null);
  return reg ? 'ready' : 'not-ready';
});
check('service worker registers', swReady === 'ready', swReady);

await page.waitForTimeout(2500);
const cached = await page.evaluate(async () => {
  const names = await caches.keys();
  const out = {};
  for (const n of names) {
    const c = await caches.open(n);
    out[n] = (await c.keys()).length;
  }
  return out;
});
check('static cache populated', Object.values(cached).some(v => v > 10), JSON.stringify(cached));

const offErrors = [];
const off = await ctx.newPage();
off.on('pageerror', e => offErrors.push(e.message));
await ctx.setOffline(true);

await off.goto(BASE, { waitUntil: 'load' }).catch(e => offErrors.push('nav: ' + e.message));
await off.waitForTimeout(1500);
const offlineTitle = await off.title().catch(() => '');
const offlineCals = await off.locator('.month-container').count().catch(() => 0);
check('offline: page loads', offlineTitle.includes('Calendar'), `title="${offlineTitle}"`);
check('offline: calendar renders', offlineCals > 0, `${offlineCals} month containers`);
check('offline: Sortable.js available', await off.evaluate(() => typeof window.Sortable !== 'undefined').catch(() => false));

// the actual bug fixed: query-string PWA shortcut URL offline
await off.goto(BASE + '/?action=today', { waitUntil: 'load' }).catch(e => offErrors.push('nav?action: ' + e.message));
await off.waitForTimeout(1500);
const qsCals = await off.locator('.month-container').count().catch(() => 0);
const qsTitle = await off.title().catch(() => '');
check('offline: ?action=today loads (the SW fix)', qsTitle.includes('Calendar') && qsCals > 0, `title="${qsTitle}", ${qsCals} months`);

// ?action=today must actually navigate to today, not just render
await off.waitForTimeout(1200);
const qsNav = await off.locator('#nav-display').innerText().catch(() => '');
check('offline: ?action=today actually jumps to today',
  qsNav.includes(String(new Date().getFullYear())), `nav="${qsNav}"`);
check('offline: ?action=today strips the query param',
  !(await off.evaluate(() => location.search)).includes('action'),
  `search="${await off.evaluate(() => location.search)}"`);

check('offline: no page errors', offErrors.length === 0, offErrors.slice(0, 3).join(' | '));

await ctx.setOffline(false);
await browser.close();
await server.close();
done();
