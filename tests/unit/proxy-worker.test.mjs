/**
 * Exercise the Cloudflare Worker proxy module directly in Node.
 *
 * The worker is a plain `export default { fetch(request) }`, so it can be
 * invoked without deploying. Upstream `fetch` is stubbed, keeping the suite
 * deterministic and offline — the security guards are what matter here, and
 * they must not depend on a live network.
 */

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import worker from '../../proxy/cloudflare-worker.js';
import { createSuite } from '../helpers/assert.mjs';

const { check, done } = createSuite('proxy worker');

const FIXTURE = readFileSync(
    fileURLToPath(new URL('../fixtures/google-us-holidays.ics', import.meta.url)), 'utf-8');

const WORKER = 'https://example-worker.workers.dev';
const APP = 'https://kotapullarao.github.io';
const FEED = 'https://calendar.google.com/calendar/ical/x%40group.calendar.google.com/public/basic.ics';

// Record what the worker tries to fetch upstream, and answer without a network.
let lastUpstream = null;
globalThis.fetch = async (url) => {
    lastUpstream = String(url);
    if (String(url).includes('not-a-calendar')) {
        return new Response('<html>hello</html>', { status: 200 });
    }
    if (String(url).includes('missing')) {
        return new Response('nope', { status: 404, statusText: 'Not Found' });
    }
    return new Response(FIXTURE, { status: 200 });
};

const req = (url, origin) =>
    new Request(url, { headers: origin ? { Origin: origin } : {} });

const call = (query, origin) =>
    worker.fetch(req(`${WORKER}/${query}`, origin));

// --- the happy path -------------------------------------------------------
{
    const res = await call(`?url=${encodeURIComponent(FEED)}`, APP);
    const body = await res.text();
    check('allowed origin gets the feed', res.status === 200 && /BEGIN:VCALENDAR/.test(body),
        `HTTP ${res.status}, ${body.length} bytes`);
    check('CORS header echoes the caller origin',
        res.headers.get('Access-Control-Allow-Origin') === APP);
    check('calendar content type set',
        (res.headers.get('Content-Type') || '').includes('text/calendar'));
}

// --- no Origin (browser tab, curl) ---------------------------------------
{
    const res = await call('');
    const body = await res.text();
    check('bare visit shows usage instead of an error',
        res.status === 200 && body.includes('?url={url}'), `HTTP ${res.status}`);

    const withUrl = await call(`?url=${encodeURIComponent(FEED)}`);
    check('no-Origin client can still proxy', withUrl.status === 200, `HTTP ${withUrl.status}`);
}

// --- origin allowlist -----------------------------------------------------
{
    const res = await call(`?url=${encodeURIComponent(FEED)}`, 'https://evil.example');
    check('foreign origin rejected', res.status === 403, `HTTP ${res.status}`);
}

// --- webcal:// conversion -------------------------------------------------
{
    const res = await call(`?url=${encodeURIComponent(FEED.replace('https://', 'webcal://'))}`, APP);
    check('webcal:// accepted', res.status === 200, `HTTP ${res.status}`);
    check('webcal:// fetched over https', lastUpstream.startsWith('https://'), lastUpstream.slice(0, 24));
}

// --- SSRF guards ----------------------------------------------------------
for (const [label, bad] of [
    ['loopback IP', 'https://127.0.0.1/x.ics'],
    ['localhost', 'https://localhost/x.ics'],
    ['.internal TLD', 'https://foo.internal/x.ics'],
    ['.local TLD', 'https://printer.local/x.ics'],
    ['plain http', 'http://calendar.google.com/x.ics']
]) {
    const res = await call(`?url=${encodeURIComponent(bad)}`, APP);
    check(`blocked: ${label}`, res.status === 400, `HTTP ${res.status}`);
}

// --- upstream failures surface honestly -----------------------------------
{
    const notCal = await call(`?url=${encodeURIComponent('https://example.com/not-a-calendar')}`, APP);
    check('non-calendar upstream rejected', notCal.status === 422, `HTTP ${notCal.status}`);

    const missing = await call(`?url=${encodeURIComponent('https://example.com/missing.ics')}`, APP);
    check('upstream 404 propagated', missing.status === 404, `HTTP ${missing.status}`);
}

// --- preflight ------------------------------------------------------------
{
    const res = await worker.fetch(new Request(`${WORKER}/`, {
        method: 'OPTIONS', headers: { Origin: APP }
    }));
    check('preflight answered 204', res.status === 204, `HTTP ${res.status}`);
    check('preflight advertises GET',
        (res.headers.get('Access-Control-Allow-Methods') || '').includes('GET'));
}

// --- method guard ---------------------------------------------------------
{
    const res = await worker.fetch(new Request(`${WORKER}/?url=${encodeURIComponent(FEED)}`, {
        method: 'POST', headers: { Origin: APP }
    }));
    check('POST rejected', res.status === 405, `HTTP ${res.status}`);
}

done();
