/**
 * Minimal assertion + reporting helpers.
 *
 * Deliberately dependency-free: the app ships zero runtime dependencies and the
 * test layer should not be the thing that drags a framework in.
 */

export function createSuite(name) {
    const results = [];

    /** Record a boolean check. `detail` is printed on both pass and fail. */
    const check = (label, passed, detail = '') => {
        results.push({ label, passed: !!passed, detail });
        console.log(`${passed ? 'PASS' : 'FAIL'}  ${label}${detail ? ` — ${detail}` : ''}`);
        return !!passed;
    };

    /** Deep-equality check via JSON, which is enough for our plain data. */
    const eq = (label, actual, expected) => {
        const a = JSON.stringify(actual);
        const e = JSON.stringify(expected);
        const passed = a === e;
        results.push({ label, passed, detail: passed ? '' : `expected ${e}, got ${a}` });
        console.log(passed
            ? `PASS  ${label}`
            : `FAIL  ${label}\n        expected ${e}\n        actual   ${a}`);
        return passed;
    };

    /**
     * Print the tally and exit non-zero on any failure, so `npm test` and CI
     * fail loudly rather than printing red text and returning success.
     */
    const done = () => {
        const failed = results.filter(r => !r.passed);
        console.log(`\n${results.length - failed.length}/${results.length} passed${name ? `  (${name})` : ''}`);
        if (failed.length) {
            console.log('FAILURES:');
            failed.forEach(f => console.log(`  - ${f.label}${f.detail ? `: ${f.detail}` : ''}`));
            process.exit(1);
        }
        return results;
    };

    return { check, eq, done, results };
}
