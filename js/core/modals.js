/**
 * Modal stack and configuration.
 *
 * Modals used to be opened and closed ad hoc: each caller decided whether to
 * reveal a parent afterwards, the Escape key ran an if/else chain over modal
 * ids with bespoke re-open logic per modal, and three controls in the category
 * editor (×, ←, Cancel) were wired to the same handler — so × never closed and
 * Cancel never cancelled out.
 *
 * There was also no size system. Widths were 500, 550, 600, 700 and 800px
 * depending on the modal, and one class was added and removed at runtime, so
 * the Manage modal physically resized when moving between its list and editor.
 *
 * Here the stack is data. Each modal declares its size and, when it has more
 * than one view, which one is its root. Three verbs cover every control:
 *
 *   close()      dismiss everything and return to the calendar   (× and Cancel)
 *   back()       one step: to the root view, else close this modal   (←)
 *   open(id)     show a modal, remembering what it was opened over
 */

/** Size tokens. Three, applied statically — never toggled while open. */
export const MODAL_SIZES = { sm: 'modal-sm', md: 'modal-md', lg: 'modal-lg' };

/**
 * Per-modal configuration.
 * `root` is the view a modal returns to when going back; modals without one
 * are single-view and go back by closing.
 */
export const MODAL_CONFIG = {
    'manage-plan-modal':       { size: 'md', root: '#category-list-view' },
    'ics-subscriptions-modal': { size: 'md', root: '#subscription-list-view' },
    'import-text-modal':       { size: 'lg', root: '#import-main-view' },
    'edit-parsed-event-modal': { size: 'md' },
    'event-search-modal':      { size: 'md' },
    'gradient-themes-modal':   { size: 'md' },
    // Browsable grids rather than simple dialogs — they earn the extra width.
    'template-picker-modal':   { size: 'md' },
    'emoji-picker-modal':      { size: 'md' },
    'help-modal':              { size: 'lg' }
};

// Ids in the order they were opened. The last entry is what Escape acts on.
const stack = [];

/** The modal currently on top, or null. */
export function topModal() {
    return stack.length ? stack[stack.length - 1] : null;
}

/** A copy of the stack, for tests and debugging. */
export function currentStack() {
    return [...stack];
}

export function isOpen(id) {
    return stack.includes(id);
}

/** Apply the configured size class, replacing any previous one. */
export function applySize(id, doc = document) {
    const content = doc.querySelector(`#${id} .modal-content`);
    if (!content) return;
    const config = MODAL_CONFIG[id];
    for (const cls of Object.values(MODAL_SIZES)) content.classList.remove(cls);
    // Legacy classes that used to be toggled while a modal was open.
    content.classList.remove('wide', 'medium');
    if (config && MODAL_SIZES[config.size]) content.classList.add(MODAL_SIZES[config.size]);
}

/** Push a modal onto the stack. Re-opening one already open just raises it. */
export function push(id) {
    const existing = stack.indexOf(id);
    if (existing !== -1) stack.splice(existing, 1);
    stack.push(id);
    return [...stack];
}

/** Remove a modal from the stack and report what should now be visible. */
export function pop(id = null) {
    const target = id || topModal();
    const index = stack.indexOf(target);
    if (index !== -1) stack.splice(index, 1);
    return { closed: target, reveal: topModal() };
}

export function clear() {
    const closed = [...stack];
    stack.length = 0;
    return closed;
}

/**
 * Decide what the back control should do for the modal on top.
 *
 * Returns `{ action: 'view', modal, view }` when the modal has a root view it
 * is not currently showing, or `{ action: 'close', modal, reveal }` otherwise.
 * `isOnRoot` is injected so this stays a pure decision, testable without a DOM.
 */
export function resolveBack(isOnRoot) {
    const modal = topModal();
    if (!modal) return { action: 'none' };

    const config = MODAL_CONFIG[modal] || {};
    if (config.root && !isOnRoot(modal, config.root)) {
        return { action: 'view', modal, view: config.root };
    }
    const index = stack.indexOf(modal);
    return { action: 'close', modal, reveal: index > 0 ? stack[index - 1] : null };
}
