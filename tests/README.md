# Tests

212 checks across 10 suites. No test framework — the app ships zero runtime
dependencies and the test layer keeps that spirit; the only devDependency is
Playwright, and only the end-to-end suites need it.

```bash
npm test          # unit suites only — no browser, ~250ms
npm run test:e2e  # browser suites — needs Chromium
npm run test:all  # everything
npm run lint      # project checks (no dependencies)
npm run check     # lint + all tests, what CI runs

node tests/run.mjs day-peek   # run suites matching a name
```

## Layout

| Path | What |
|---|---|
| `unit/` | Pure-module suites. No browser, no network. |
| `e2e/` | Browser suites driven by Playwright. Each starts its own server on a random port. |
| `fixtures/` | Real `.ics` responses captured from live providers. |
| `helpers/` | Shared assertion, server, and browser setup. |
| `run.mjs` | Runner. Executes each suite in its own process and tallies results. |
| `lint.mjs` | Dependency-free project checks. |

## Why these tests exist

Each suite traces to a bug that actually shipped, which is the standard for
adding to them:

- **`unit/ics-parser.test.mjs`** — monthly recurrence drifted (`Jan 31` repeated
  to `Mar 28`) because each occurrence advanced from the previously *clamped*
  date instead of the `DTSTART` anchor.
- **`unit/real-feeds.test.mjs`** — parses genuine Google, gov.uk, and
  calendarlabs responses. Hand-written fixtures agree with your assumptions;
  real ones disagree, which is the point. Covers line folding, escaped text,
  non-ASCII titles, and exclusive `DTEND`.
- **`unit/proxy-worker.test.mjs`** — the proxy rejected browser tabs (no
  `Origin` header) with a 403 that looked like a broken deploy. Also pins the
  SSRF guards, which must never regress.
- **`e2e/keyboard-and-offline.mjs`** — `?action=today` failed offline because
  `caches.match` uses exact URL matching, so query-string URLs never matched.
- **`e2e/ics-sync.mjs`** — end-to-end subscribe, sync, failure handling,
  unsubscribe with undo, and offline rendering from cache.
- **`e2e/day-peek.mjs`**, **`e2e/local-events.mjs`**, **`e2e/chips-strip-search.mjs`**
  — event details round-tripping from editor to storage to calendar surfaces.
- **`e2e/holiday-guard.mjs`** — a subscribed feed named "Public Holidays" must
  not silently become the holiday source and change every other category's
  counts.
- **`e2e/subscriptions-ui.mjs`** — proxy setup flow, and XSS hardening for feed
  names, which are attacker-controlled input.

## Conventions

Suites are plain ES modules with top-level `await`. They import
`createSuite()` for `check`/`eq`/`done`, and end with `done()`, which prints the
tally and exits non-zero on any failure.

End-to-end suites call `startServer()` (port 0, so suites never collide) and
`launchBrowser()`. Set `PLAYWRIGHT_CHROMIUM_PATH` to use a pre-installed
Chromium instead of Playwright's own.

Untrusted-input assertions are deliberate: several suites feed in titles like
`<script>alert(1)</script>` and assert they render as literal text. Feed content
is remote input, so keep those when touching rendering.

## The dangling-id ratchet

`lint.mjs` fails on JavaScript referencing element ids that exist nowhere — the
class of dead code that let a 257-line unreachable date picker survive. Existing
offenders are frozen in a `KNOWN_DANGLING` list so *new* ones fail the build.
That list may shrink, never grow; a separate check fails if an entry becomes
stale.
