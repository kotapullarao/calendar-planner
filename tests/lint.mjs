/**
 * Project checks that need no dependencies.
 *
 * Not a general-purpose linter — it encodes the specific mistakes this project
 * has actually shipped, so each rule exists because something broke once.
 */

import { readFileSync, readdirSync, existsSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join, relative } from 'node:path';
import { createSuite } from './helpers/assert.mjs';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const { check, done } = createSuite('project checks');

const read = p => readFileSync(join(ROOT, p), 'utf-8');

/** Every .js file under a directory, recursively, excluding vendor code. */
function jsFiles(dir) {
    const out = [];
    const walk = d => {
        for (const entry of readdirSync(join(ROOT, d))) {
            const rel = join(d, entry);
            if (rel.includes('vendor') || rel.includes('node_modules')) continue;
            if (statSync(join(ROOT, rel)).isDirectory()) walk(rel);
            else if (entry.endsWith('.js')) out.push(rel);
        }
    };
    walk(dir);
    return out;
}

const appFiles = jsFiles('js');

// --- syntax ---------------------------------------------------------------
// `node --check` doesn't accept ESM, so parse via dynamic import instead:
// a syntax error rejects, and these modules are side-effect-free at import.
for (const file of appFiles) {
    let ok = true, err = '';
    try {
        await import(join(ROOT, file));
    } catch (e) {
        // A missing DOM at import time is fine; a SyntaxError is not.
        ok = !(e instanceof SyntaxError);
        err = e.message.split('\n')[0];
    }
    check(`parses: ${file}`, ok, ok ? '' : err);
}

// --- service worker cache discipline --------------------------------------
// Shipping changed precached files without bumping the cache version served
// stale JavaScript to a real user during this project's history.
{
    const sw = read('sw.js');
    const versions = [...sw.matchAll(/calendar-planner(?:-static|-dynamic)?-v(\d+)/g)].map(m => m[1]);
    check('sw.js declares cache versions', versions.length >= 3, versions.join(', '));
    check('sw.js cache versions agree', new Set(versions).size === 1,
        new Set(versions).size === 1 ? `all v${versions[0]}` : `mismatched: ${versions.join(', ')}`);

    // Every app module must be precached, or it 404s offline.
    const precached = [...sw.matchAll(/'\.\/([^']+)'/g)].map(m => m[1]);
    const missing = appFiles
        .map(f => f.split(/[\\/]/).join('/'))
        .filter(f => !precached.includes(f));
    check('every js module is precached', missing.length === 0,
        missing.length ? `missing: ${missing.join(', ')}` : `${appFiles.length} modules`);
}

// --- manifest / json ------------------------------------------------------
for (const file of ['manifest.json', 'package.json']) {
    let ok = true, err = '';
    try { JSON.parse(read(file)); } catch (e) { ok = false; err = e.message; }
    check(`valid JSON: ${file}`, ok, err);
}

// --- required files -------------------------------------------------------
for (const file of ['index.html', 'sw.js', 'manifest.json', 'proxy/cloudflare-worker.js']) {
    check(`present: ${file}`, existsSync(join(ROOT, file)));
}

// --- html/js agreement ----------------------------------------------------
// Catch the "JS reaches for an element the HTML doesn't define" class of dead
// code — how a 257-line unreachable date picker survived in this repo.
{
    const html = read('index.html');
    // An element can be defined in the HTML *or* built at runtime, so collect
    // both before deciding a reference dangles.
    const defined = new Set([...html.matchAll(/\bid="([^"]+)"/g)].map(m => m[1]));

    // Editor fields are injected from one template reused under several
    // prefixes (`id="${prefix}-name-input"`), so record the suffix and treat
    // any id ending in it as defined.
    const suffixes = new Set();
    const referenced = new Map();   // id -> first file that reads it

    for (const file of appFiles) {
        const src = read(file);
        for (const m of src.matchAll(/\.id\s*=\s*['"]([^'"]+)['"]/g)) defined.add(m[1]);
        for (const m of src.matchAll(/\bid=["']([^"'${]+)["']/g)) defined.add(m[1]);
        for (const m of src.matchAll(/\bid=["']\$\{[^}]+\}([\w-]+)["']/g)) suffixes.add(m[1]);
        for (const m of src.matchAll(/getElementById\(['"]([^'"]+)['"]\)/g)) {
            if (!referenced.has(m[1])) referenced.set(m[1], file);
        }
        for (const m of src.matchAll(/\$\(['"]#([a-zA-Z][\w-]*)['"]\)/g)) {
            if (!referenced.has(m[1])) referenced.set(m[1], file);
        }
    }

    /**
     * Pre-existing dangling references, all null-guarded, left over from the
     * modern-UI redesign renaming elements and from the unreachable custom
     * date picker. Frozen here as a ratchet: the list may shrink, never grow.
     * Removing these is part of the planned dead-code phase.
     */
    const KNOWN_DANGLING = new Set([
        'home-year-btn', 'theme-toggle-btn', 'help-btn', 'stats-btn-text',
        'backup-details', 'backup-preview', 'backup-warning',
        'custom-date-picker', 'date-picker-cancel', 'date-picker-days',
        'date-picker-month-btn', 'date-picker-month-selector',
        'date-picker-next-month', 'date-picker-prev-month', 'date-picker-today',
        'date-picker-year-btn', 'date-picker-year-selector', 'date-picker-years'
    ]);

    const dangling = [...referenced.entries()]
        .filter(([id]) => !defined.has(id))
        .filter(([id]) => ![...suffixes].some(s => id.endsWith(s)))
        .filter(([id]) => !KNOWN_DANGLING.has(id));

    check('no NEW references to ids that exist nowhere', dangling.length === 0,
        dangling.length
            ? dangling.map(([id, f]) => `${id} (${f})`).sort().join(', ')
            : `${referenced.size} references checked, ${KNOWN_DANGLING.size} known-dangling frozen`);

    // The ratchet only tightens if stale entries are noticed when they go away.
    const stale = [...KNOWN_DANGLING].filter(id => defined.has(id)).sort();
    check('known-dangling list has no stale entries', stale.length === 0,
        stale.length ? `now defined, remove from list: ${stale.join(', ')}` : '');
}

// --- css tokens -----------------------------------------------------------
{
    const cssDir = join(ROOT, 'css');
    const files = readdirSync(cssDir).filter(f => f.endsWith('.css'));
    check('css files present', files.length > 0, `${files.length} files`);
}

done();
