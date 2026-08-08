/**
 * Browser + static-server helpers for the end-to-end suites.
 *
 * Each e2e suite starts its own server on its own port so suites can run
 * independently (and in parallel) without assuming something is already
 * listening, and closes it on exit.
 */

import { chromium } from 'playwright';
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';

export const REPO_ROOT = fileURLToPath(new URL('../..', import.meta.url));

const MIME = {
    '.html': 'text/html; charset=utf-8',
    '.js': 'text/javascript; charset=utf-8',
    '.mjs': 'text/javascript; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.svg': 'image/svg+xml',
    '.woff2': 'font/woff2',
    '.ics': 'text/calendar; charset=utf-8'
};

/**
 * Serve the repository root over HTTP.
 * Port 0 lets the OS pick a free port, so concurrent suites never collide.
 */
export async function startServer() {
    const server = createServer(async (req, res) => {
        try {
            const url = new URL(req.url, 'http://localhost');
            let path = decodeURIComponent(url.pathname);
            if (path.endsWith('/')) path += 'index.html';
            // Contain traversal: resolve inside the repo or 403.
            const full = join(REPO_ROOT, normalize(path).replace(/^(\.\.[/\\])+/, ''));
            if (!full.startsWith(REPO_ROOT)) {
                res.writeHead(403).end('Forbidden');
                return;
            }
            if (!existsSync(full)) {
                res.writeHead(404).end('Not found');
                return;
            }
            const body = await readFile(full);
            res.writeHead(200, {
                'Content-Type': MIME[extname(full)] || 'application/octet-stream',
                'Cache-Control': 'no-store'
            }).end(body);
        } catch (err) {
            res.writeHead(500).end(String(err));
        }
    });

    await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
    const { port } = server.address();
    return {
        baseUrl: `http://127.0.0.1:${port}`,
        close: () => new Promise(resolve => server.close(resolve))
    };
}

/**
 * Launch Chromium.
 *
 * Playwright resolves its own bundled browser normally; PLAYWRIGHT_CHROMIUM_PATH
 * overrides it for environments that pre-install one at a fixed location
 * (this sandbox, some CI images) rather than via `playwright install`.
 */
export async function launchBrowser() {
    const executablePath = process.env.PLAYWRIGHT_CHROMIUM_PATH || undefined;
    return chromium.launch(executablePath ? { executablePath } : {});
}

/**
 * Open a page with first-run UI suppressed.
 *
 * The walkthrough offer overlays the undo toast and other controls, so every
 * suite would otherwise have to work around it. Seeding localStorage requires
 * an initial navigation to get an origin.
 */
export async function openApp(context, baseUrl, { config = null } = {}) {
    const page = await context.newPage();
    await page.goto(baseUrl, { waitUntil: 'domcontentloaded' });
    await page.evaluate(cfg => {
        localStorage.setItem('calendar-walkthrough-v4-seen', '1');
        if (cfg) localStorage.setItem('calendar-plan-config', JSON.stringify(cfg));
    }, config);
    await page.goto(baseUrl, { waitUntil: 'networkidle' });
    await page.waitForTimeout(700);
    return page;
}

/** Collect page errors and genuine console errors for a blanket assertion. */
export function trackErrors(page, { ignore = [] } = {}) {
    const errors = [];
    const keep = msg => !ignore.some(pattern => pattern.test(msg));
    page.on('pageerror', e => { if (keep(e.message)) errors.push(e.message); });
    page.on('console', m => {
        if (m.type() === 'error' && keep(m.text())) errors.push('console: ' + m.text());
    });
    return errors;
}
