/**
 * Application State
 *
 * Centralized state with controlled access, plus change notification.
 *
 * The notification is what makes the "mutate, persist, repaint" sequence
 * enforceable. Previously every caller had to remember all three steps in the
 * right order; nothing stopped a change that persisted without repainting, or
 * repainted without persisting, and the counts showed the drift — 40 reads of
 * the config against 16 saves and 28 repaints.
 *
 * Notifications are batched into a microtask so a burst of synchronous setters
 * (setting year and month together, say) produces one repaint rather than one
 * per setter.
 *
 * Subscribing lives here rather than in the store so persistence can announce
 * a change without importing the UI, which would be a cycle: ui.js already
 * imports store.js.
 */

import { DEFAULT_CONFIG } from '../config/constants.js';

// Global State Variables
let CONFIG = { ...DEFAULT_CONFIG };
let activeFilter = 'all';
let currentYear = new Date().getFullYear();
let currentMonth = new Date().getMonth();
let parsedCategoriesCache = [];
let isDragging = false;
let statsHidden = false;
let undoState = null;
let pendingBackupData = null;

// --- change notification --------------------------------------------------

const listeners = new Set();
let pendingReasons = null;

/**
 * Observe state changes.
 *
 * The listener receives a Set of reasons — 'data' for anything persisted,
 * 'view' for presentation-only state such as the active filter or the month
 * being shown. Returns an unsubscribe function.
 */
export function subscribe(listener) {
    listeners.add(listener);
    return () => listeners.delete(listener);
}

/**
 * Announce a change. Reasons accumulate until the current task finishes, so
 * consecutive setters collapse into a single notification.
 */
export function notifyChange(reason = 'data') {
    if (pendingReasons) {
        pendingReasons.add(reason);
        return;
    }
    pendingReasons = new Set([reason]);
    queueMicrotask(() => {
        const reasons = pendingReasons;
        pendingReasons = null;
        for (const listener of [...listeners]) {
            try {
                listener(reasons);
            } catch (err) {
                // One broken listener must not stop the others, or a render
                // error would silently freeze every later subscriber.
                console.error('State listener failed:', err);
            }
        }
    });
}

/** Run a function without emitting notifications — for bulk setup on load. */
export function silently(fn) {
    const saved = pendingReasons;
    pendingReasons = new Set();          // swallow anything raised inside
    try {
        return fn();
    } finally {
        pendingReasons = saved;
    }
}

// --- setters --------------------------------------------------------------

// 'data' marks state that is persisted; 'view' marks presentation-only state
// that changes what is on screen without changing what is stored.
export const setState = {
    config: (newConfig) => { CONFIG = newConfig; notifyChange('data'); },
    activeFilter: (filter) => { activeFilter = filter; notifyChange('view'); },
    currentYear: (year) => { currentYear = year; notifyChange('view'); },
    currentMonth: (month) => { currentMonth = month; notifyChange('view'); },
    statsHidden: (hidden) => { statsHidden = !!hidden; notifyChange('view'); },

    // Transient working state: nothing renders directly from these, so they
    // deliberately do not notify.
    parsedCategoriesCache: (cache) => { parsedCategoriesCache = cache; },
    isDragging: (dragging) => { isDragging = dragging; },
    undoState: (state) => { undoState = state; },
    pendingBackupData: (data) => { pendingBackupData = data; }
};

// --- getters --------------------------------------------------------------

export const getState = {
    config: () => CONFIG,
    activeFilter: () => activeFilter,
    currentYear: () => currentYear,
    currentMonth: () => currentMonth,
    parsedCategoriesCache: () => parsedCategoriesCache,
    isDragging: () => isDragging,
    undoState: () => undoState,
    pendingBackupData: () => pendingBackupData,
    statsHidden: () => statsHidden
};
