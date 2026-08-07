/**
 * ICS Subscription Sync Module
 *
 * Fetches subscribed .ics feeds, parses them, and materialises them as
 * read-only categories in the normal category list so the rest of the app
 * renders them without special-casing.
 *
 * Subscriptions live in `config.icsSubscriptions`; the categories they produce
 * live in `config.eventCategories` with `type: 'ics'` and the same id, so the
 * two stay linked. Because config is persisted wholesale to localStorage, the
 * last successful sync is available offline for free.
 */

import { getState, setState } from '../core/state.js';
import { Store } from './store.js';
import { parseICS, eventsToDates } from './ics.js';

// How far around today to materialise occurrences. Recurring events are
// expanded once at sync time rather than on every render.
const YEARS_BACK = 1;
const YEARS_FORWARD = 3;

// Refuse absurd payloads rather than blowing the localStorage quota.
const MAX_FEED_BYTES = 5 * 1024 * 1024;
const MAX_DATES_PER_SUBSCRIPTION = 2000;

const DEFAULT_INTERVAL_MINUTES = 30;

let autoSyncTimer = null;
let inFlight = new Set();

/** Subscriptions array, tolerating older configs that predate the feature. */
export function getSubscriptions() {
    const config = getState.config();
    if (!Array.isArray(config.icsSubscriptions)) config.icsSubscriptions = [];
    return config.icsSubscriptions;
}

/**
 * Normalise a user-entered feed URL.
 * webcal:// is the scheme calendar apps hand out; it is HTTPS underneath.
 */
export function normalizeUrl(url) {
    const trimmed = String(url || '').trim();
    if (!trimmed) return '';
    if (/^webcal:\/\//i.test(trimmed)) return trimmed.replace(/^webcal:\/\//i, 'https://');
    if (!/^https?:\/\//i.test(trimmed)) return `https://${trimmed}`;
    return trimmed;
}

/**
 * Build the proxied request URL from the configured template.
 *
 * Accepted template shapes, in order:
 *   …/?url={url}   placeholder — substituted with the encoded feed URL
 *   …?url=         ends in '=' or '?' — encoded URL appended
 *   …workers.dev/  bare base URL — '?url=' + encoded URL added, since pasting
 *                  the worker address without the suffix is the natural thing
 *                  to do and appending to the path is almost never right
 */
export function buildProxyUrl(feedUrl, proxy) {
    if (!proxy) return feedUrl;
    const template = String(proxy).trim();
    if (!template) return feedUrl;

    const encoded = encodeURIComponent(feedUrl);
    if (template.includes('{url}')) return template.replace('{url}', encoded);
    if (template.endsWith('=') || template.endsWith('?')) return template + encoded;
    return template + (template.includes('?') ? '&' : '?') + 'url=' + encoded;
}

/** The active proxy template, or '' for direct fetches. */
export function getProxyUrl() {
    const config = getState.config();
    return typeof config.icsProxyUrl === 'string' ? config.icsProxyUrl.trim() : '';
}

/** Configured auto-refresh interval in minutes. */
export function getSyncIntervalMinutes() {
    const config = getState.config();
    const n = parseInt(config.icsSyncIntervalMinutes, 10);
    return Number.isFinite(n) && n >= 5 ? n : DEFAULT_INTERVAL_MINUTES;
}

/**
 * Fetch a feed's raw text.
 * Tries the URL directly first so a CORS-enabled feed needs no proxy at all,
 * then retries through the proxy when one is configured.
 */
async function fetchFeed(url) {
    const proxy = getProxyUrl();
    const attempts = proxy ? [url, buildProxyUrl(url, proxy)] : [url];
    let lastError = null;

    for (const attempt of attempts) {
        try {
            const response = await fetch(attempt, {
                redirect: 'follow',
                headers: { 'Accept': 'text/calendar, text/plain, */*' }
            });
            if (!response.ok) {
                lastError = new Error(`HTTP ${response.status} ${response.statusText}`.trim());
                continue;
            }
            const text = await response.text();
            if (text.length > MAX_FEED_BYTES) {
                throw new Error('Feed is too large to store (over 5 MB).');
            }
            if (!/BEGIN:VCALENDAR/i.test(text)) {
                lastError = new Error('That URL did not return calendar data.');
                continue;
            }
            return text;
        } catch (err) {
            lastError = err;
        }
    }

    // A bare "Failed to fetch" is almost always CORS; say so, since the fix
    // (configure a proxy) is not otherwise discoverable.
    if (lastError && /failed to fetch|networkerror|load failed/i.test(lastError.message)) {
        throw new Error(
            proxy
                ? 'Could not reach the feed, directly or via the proxy. Check the URL and the proxy setting.'
                : 'Blocked by the browser (CORS), or offline. Most calendar providers need a proxy — set one in Sync Settings.'
        );
    }
    throw lastError || new Error('Could not fetch the feed.');
}

/** The [from, to] window occurrences are expanded into. */
function expansionWindow() {
    const now = new Date();
    const from = `${now.getFullYear() - YEARS_BACK}-01-01`;
    const to = `${now.getFullYear() + YEARS_FORWARD}-12-31`;
    return { from, to };
}

/**
 * Build the read-only category that represents a subscription.
 * Keeps every field the renderers expect so `type: 'ics'` flows through the
 * ordinary "single category" path.
 */
function toCategory(subscription, dates) {
    return {
        id: subscription.id,
        name: subscription.name,
        emoji: subscription.emoji || '🔗',
        color: subscription.color || '#0891b2',
        type: 'ics',
        readOnly: true,
        sourceUrl: subscription.url,
        excludeHolidays: !!subscription.excludeHolidays,
        dates,
        childCategoryIds: []
    };
}

/** Insert or replace a subscription's category, preserving list position. */
function upsertCategory(category) {
    const config = getState.config();
    const index = config.eventCategories.findIndex(c => c.id === category.id);
    if (index >= 0) config.eventCategories[index] = category;
    else config.eventCategories.push(category);
    setState.config(config);
}

/** Remove the category a subscription produced. */
export function removeCategoryFor(subscriptionId) {
    const config = getState.config();
    config.eventCategories = config.eventCategories.filter(c => c.id !== subscriptionId);
    setState.config(config);
}

/**
 * Sync one subscription.
 * Never throws: failures are recorded on the subscription so the UI can show
 * them, and the previously cached dates are left intact.
 */
export async function syncSubscription(subscriptionId) {
    const subscription = getSubscriptions().find(s => s.id === subscriptionId);
    if (!subscription) return { ok: false, error: 'Subscription not found.' };
    if (inFlight.has(subscriptionId)) return { ok: false, error: 'Already syncing.' };

    inFlight.add(subscriptionId);
    subscription.syncing = true;

    try {
        const text = await fetchFeed(subscription.url);
        const { events, calendarName } = parseICS(text);
        const { from, to } = expansionWindow();
        let dates = eventsToDates(events, from, to);

        let truncated = false;
        if (dates.length > MAX_DATES_PER_SUBSCRIPTION) {
            dates = dates.slice(0, MAX_DATES_PER_SUBSCRIPTION);
            truncated = true;
        }

        // Adopt the feed's own name if the user never set one.
        if (!subscription.name && calendarName) subscription.name = calendarName;
        if (!subscription.name) subscription.name = 'Subscribed Calendar';

        upsertCategory(toCategory(subscription, dates));

        subscription.lastSyncAt = Date.now();
        subscription.lastError = null;
        subscription.eventCount = events.length;
        subscription.dateCount = dates.length;
        subscription.truncated = truncated;

        Store.save();
        return { ok: true, events: events.length, dates: dates.length, truncated };
    } catch (err) {
        subscription.lastError = err && err.message ? err.message : String(err);
        subscription.lastSyncAt = subscription.lastSyncAt || null;
        Store.save();
        return { ok: false, error: subscription.lastError };
    } finally {
        subscription.syncing = false;
        inFlight.delete(subscriptionId);
    }
}

/** Sync every enabled subscription. Results come back in input order. */
export async function syncAll({ onlyStale = false } = {}) {
    const subscriptions = getSubscriptions().filter(s => s.enabled !== false);
    const staleAfter = getSyncIntervalMinutes() * 60 * 1000;
    const now = Date.now();

    const due = onlyStale
        ? subscriptions.filter(s => !s.lastSyncAt || (now - s.lastSyncAt) > staleAfter)
        : subscriptions;

    if (!due.length) return [];

    // Sequential rather than parallel: these are background refreshes and a
    // burst of requests to the same host is more likely to be throttled.
    const results = [];
    for (const subscription of due) {
        results.push({ id: subscription.id, ...(await syncSubscription(subscription.id)) });
    }
    return results;
}

/** Add a subscription. Returns the new object, or throws on invalid input. */
export function addSubscription({ name, url, color, emoji, excludeHolidays }) {
    const normalized = normalizeUrl(url);
    if (!normalized) throw new Error('Enter a calendar URL.');

    try {
        new URL(normalized);
    } catch (e) {
        throw new Error('That does not look like a valid URL.');
    }

    if (getSubscriptions().some(s => s.url === normalized)) {
        throw new Error('You are already subscribed to that calendar.');
    }

    const subscription = {
        id: `ics-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        name: (name || '').trim(),
        url: normalized,
        color: color || '#0891b2',
        emoji: emoji || '🔗',
        enabled: true,
        excludeHolidays: !!excludeHolidays,
        lastSyncAt: null,
        lastError: null,
        eventCount: 0,
        dateCount: 0
    };

    const config = getState.config();
    getSubscriptions().push(subscription);
    setState.config(config);
    Store.save();
    return subscription;
}

/** Update a subscription's editable fields and re-skin its category. */
export function updateSubscription(id, changes) {
    const subscription = getSubscriptions().find(s => s.id === id);
    if (!subscription) return null;

    if (changes.url !== undefined) {
        const normalized = normalizeUrl(changes.url);
        if (normalized !== subscription.url) {
            subscription.url = normalized;
            // Cached dates belong to the old feed.
            subscription.lastSyncAt = null;
        }
    }
    ['name', 'color', 'emoji'].forEach(key => {
        if (changes[key] !== undefined) subscription[key] = changes[key];
    });
    if (changes.enabled !== undefined) subscription.enabled = !!changes.enabled;
    if (changes.excludeHolidays !== undefined) subscription.excludeHolidays = !!changes.excludeHolidays;

    const config = getState.config();
    const category = config.eventCategories.find(c => c.id === id);
    if (category) {
        category.name = subscription.name;
        category.color = subscription.color;
        category.emoji = subscription.emoji;
        category.excludeHolidays = !!subscription.excludeHolidays;
        category.sourceUrl = subscription.url;
    }

    // A disabled subscription keeps its cached dates but stops rendering.
    if (subscription.enabled === false) removeCategoryFor(id);
    else if (!category && subscription.lastSyncAt) upsertCategory(toCategory(subscription, []));

    setState.config(config);
    Store.save();
    return subscription;
}

/** Remove a subscription and the category it produced. */
export function removeSubscription(id) {
    const config = getState.config();
    const index = getSubscriptions().findIndex(s => s.id === id);
    if (index === -1) return null;

    const [removed] = config.icsSubscriptions.splice(index, 1);
    removeCategoryFor(id);
    setState.config(config);
    Store.save();
    return removed;
}

/** True when a category came from a subscription. */
export function isSubscriptionCategory(category) {
    return !!category && (category.type === 'ics' || category.readOnly === true);
}

/**
 * Start periodic background refresh while the app is open.
 * The Periodic Background Sync API is not dependable across browsers, so this
 * deliberately only runs in the foreground.
 */
export function startAutoSync(onSynced) {
    stopAutoSync();
    const intervalMs = getSyncIntervalMinutes() * 60 * 1000;

    autoSyncTimer = setInterval(async () => {
        if (typeof navigator !== 'undefined' && navigator.onLine === false) return;
        if (typeof document !== 'undefined' && document.hidden) return;
        const results = await syncAll({ onlyStale: true });
        if (results.length && typeof onSynced === 'function') onSynced(results);
    }, intervalMs);
}

export function stopAutoSync() {
    if (autoSyncTimer) {
        clearInterval(autoSyncTimer);
        autoSyncTimer = null;
    }
}

export const Sync = {
    getSubscriptions,
    getProxyUrl,
    getSyncIntervalMinutes,
    addSubscription,
    updateSubscription,
    removeSubscription,
    removeCategoryFor,
    syncSubscription,
    syncAll,
    startAutoSync,
    stopAutoSync,
    isSubscriptionCategory,
    normalizeUrl,
    buildProxyUrl
};
