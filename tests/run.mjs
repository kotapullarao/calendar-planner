/**
 * Test runner.
 *
 *   node tests/run.mjs          all suites
 *   node tests/run.mjs unit     unit suites only (fast, no browser)
 *   node tests/run.mjs e2e      browser suites only
 *   node tests/run.mjs day-peek run suites whose filename matches
 *
 * Unit suites are separated deliberately: they need no browser, run in about a
 * second, and can therefore gate every commit. The e2e suites need Chromium and
 * are slower, so they run in CI and on demand.
 */

import { readdirSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';
import { spawn } from 'node:child_process';

const TESTS = fileURLToPath(new URL('.', import.meta.url));
const arg = (process.argv[2] || '').trim();

const groups = { unit: [], e2e: [] };
for (const group of Object.keys(groups)) {
    const dir = join(TESTS, group);
    if (!existsSync(dir)) continue;
    groups[group] = readdirSync(dir)
        .filter(f => f.endsWith('.mjs'))
        .sort()
        .map(f => ({ group, name: f, path: join(dir, f) }));
}

let selected;
if (arg === 'unit' || arg === 'e2e') {
    selected = groups[arg];
} else if (arg) {
    selected = [...groups.unit, ...groups.e2e].filter(s => s.name.includes(arg));
} else {
    selected = [...groups.unit, ...groups.e2e];
}

if (!selected.length) {
    console.error(`No suites matched "${arg}".`);
    process.exit(1);
}

/** Run one suite as a child process so a crash can't take the runner down. */
function runSuite(suite) {
    return new Promise(resolve => {
        const started = Date.now();
        const child = spawn(process.execPath, [suite.path], {
            stdio: ['ignore', 'pipe', 'pipe']
        });
        let out = '';
        child.stdout.on('data', d => { out += d; });
        child.stderr.on('data', d => { out += d; });
        child.on('close', code => {
            const tally = (out.match(/^(\d+)\/(\d+) passed/m) || []);
            resolve({
                ...suite,
                code,
                passed: Number(tally[1] || 0),
                total: Number(tally[2] || 0),
                ms: Date.now() - started,
                output: out
            });
        });
    });
}

console.log(`Running ${selected.length} suite${selected.length === 1 ? '' : 's'}\n`);

const results = [];
for (const suite of selected) {
    const r = await runSuite(suite);
    results.push(r);
    const status = r.code === 0 ? 'ok  ' : 'FAIL';
    const tally = r.total ? `${r.passed}/${r.total}` : '—';
    console.log(`${status} ${r.group}/${r.name.padEnd(28)} ${tally.padStart(7)}  ${String(r.ms).padStart(6)}ms`);
    // Only surface full output for failures; green runs stay quiet.
    if (r.code !== 0) {
        console.log('\n' + r.output.split('\n').map(l => '    ' + l).join('\n'));
    }
}

const failed = results.filter(r => r.code !== 0);
const checks = results.reduce((n, r) => n + r.total, 0);
const passed = results.reduce((n, r) => n + r.passed, 0);

console.log('\n' + '-'.repeat(60));
console.log(`${passed}/${checks} checks across ${results.length} suites` +
            (failed.length ? `  ·  ${failed.length} SUITE(S) FAILED` : '  ·  all green'));

process.exit(failed.length ? 1 : 0);
