/**
 * Focus management and keyboard grid navigation.
 *
 * Two gaps this closes, both found by audit rather than by report:
 *
 * No modal carried `role="dialog"` and none trapped focus, so Tab walked
 * straight out of an open dialog into the calendar behind it — which is still
 * scrolled, still clickable, and gives no clue you have left. A screen reader
 * was never told a dialog opened at all.
 *
 * Day cells were plain divs with no role, no tabindex and no name. The grid —
 * the entire point of the app — could not be reached by keyboard, and every
 * day interaction we have built (the peek, day-to-day navigation, quick add)
 * was mouse-only.
 *
 * The pure parts live here so they can be tested without a browser.
 */

/**
 * Elements that can hold focus.
 *
 * `[tabindex="-1"]` is deliberately excluded: those are programmatic focus
 * targets (our own day cells among them), not Tab stops.
 */
export const FOCUSABLE_SELECTOR = [
    'a[href]',
    'button:not([disabled])',
    'input:not([disabled]):not([type="hidden"])',
    'select:not([disabled])',
    'textarea:not([disabled])',
    '[tabindex]:not([tabindex="-1"])'
].join(', ');

/**
 * Focusable descendants of `root`, in tab order, excluding anything hidden.
 *
 * `offsetParent === null` catches `display: none` ancestors, which is how this
 * app hides the inactive views inside a modal. Without that check a trap would
 * happily send focus into the category editor while the list is showing.
 *
 * Note there is deliberately no exemption for `document.activeElement`. It
 * looks like a safe one to add — keep whatever has focus in the cycle — but
 * Chrome blurs a hidden element only after the current task, so right after a
 * view switch `activeElement` still points into the view that just went away.
 * Exempting it meant "focus the first field" kept choosing that stale hidden
 * input, reporting success because activeElement already matched it, and
 * leaving the dialog with nothing really focused.
 */
export function focusableWithin(root) {
    if (!root) return [];
    return [...root.querySelectorAll(FOCUSABLE_SELECTOR)]
        .filter(el => el.offsetParent !== null);
}

/**
 * Where focus should land when a dialog opens.
 *
 * Prefers the first real field, so opening the category editor puts the caret
 * in the name box rather than on the × button. Falls back to the first
 * focusable, then to the container itself.
 */
export function initialFocus(container) {
    const focusables = focusableWithin(container);
    const field = focusables.find(el =>
        (el.tagName === 'INPUT' && el.type !== 'hidden') || el.tagName === 'TEXTAREA');
    return field || focusables[0] || null;
}

/**
 * Confine Tab to `container` until the returned function is called.
 *
 * Only the topmost dialog should hold a trap; installing a second one while
 * the first is live is the caller's business, not this function's.
 */
export function createFocusTrap(container, doc = document) {
    if (!container) return () => {};

    const onKeydown = (e) => {
        if (e.key !== 'Tab') return;
        const focusables = focusableWithin(container);
        if (focusables.length === 0) {
            // Nothing to focus: keep focus from escaping anyway.
            e.preventDefault();
            return;
        }
        const first = focusables[0];
        const last = focusables[focusables.length - 1];
        const active = doc.activeElement;

        // Focus outside the container (or on the container) restarts the cycle.
        if (!container.contains(active)) {
            e.preventDefault();
            (e.shiftKey ? last : first).focus();
            return;
        }
        if (e.shiftKey && active === first) {
            e.preventDefault();
            last.focus();
        } else if (!e.shiftKey && active === last) {
            e.preventDefault();
            first.focus();
        }
    };

    doc.addEventListener('keydown', onKeydown, true);
    return () => doc.removeEventListener('keydown', onKeydown, true);
}

/**
 * The date a grid key moves to, as an ISO `YYYY-MM-DD` string.
 *
 * Pure, and the reason it is: the arithmetic is the part that goes wrong
 * (month ends, week boundaries, DST) and it is far cheaper to test here than
 * through a browser. Returns null for keys that do not move.
 *
 * Dates are anchored at UTC noon for the same reason the rest of the app does
 * it — so a timezone offset can never roll a date into the previous day.
 */
export function nextDateForKey(dateStr, key) {
    const base = new Date(`${dateStr}T12:00:00Z`);
    if (Number.isNaN(base.getTime())) return null;

    const shift = (days) => {
        const d = new Date(base);
        d.setUTCDate(d.getUTCDate() + days);
        return d.toISOString().slice(0, 10);
    };

    switch (key) {
        case 'ArrowLeft':  return shift(-1);
        case 'ArrowRight': return shift(1);
        case 'ArrowUp':    return shift(-7);
        case 'ArrowDown':  return shift(7);
        // Weeks start Monday here, matching the column headers.
        case 'Home':       return shift(-((base.getUTCDay() + 6) % 7));
        case 'End':        return shift(6 - ((base.getUTCDay() + 6) % 7));
        case 'PageUp':
        case 'PageDown': {
            const d = new Date(base);
            const day = d.getUTCDate();
            d.setUTCDate(1);
            d.setUTCMonth(d.getUTCMonth() + (key === 'PageUp' ? -1 : 1));
            // Clamp rather than let Jan 31 → PageDown land in March.
            const lastDay = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0)).getUTCDate();
            d.setUTCDate(Math.min(day, lastDay));
            return d.toISOString().slice(0, 10);
        }
        default: return null;
    }
}

/** Keys `nextDateForKey` responds to — used to decide whether to preventDefault. */
export const GRID_KEYS = new Set([
    'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End', 'PageUp', 'PageDown'
]);

/**
 * A day cell's spoken name: the full date, then what is on it.
 *
 * "3 March 2026, Work, Dentist" reads usefully in a list of cells; "3" does
 * not. Kept pure so the phrasing is pinned by tests rather than by eye.
 */
export function dayCellLabel(dateStr, { categoryNames = [], eventTitles = [], isToday = false } = {}) {
    const date = new Date(`${dateStr}T12:00:00Z`);
    if (Number.isNaN(date.getTime())) return dateStr;

    const spoken = date.toLocaleDateString('en-GB', {
        weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC'
    });
    const parts = [isToday ? `Today, ${spoken}` : spoken];
    // Titles are more specific than category names, so they win when present.
    if (eventTitles.length) parts.push(...eventTitles);
    else if (categoryNames.length) parts.push(...categoryNames);
    else parts.push('no events');
    return parts.join(', ');
}
