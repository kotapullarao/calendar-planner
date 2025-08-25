/**
 * Main Application Module
 * Initializes the application and coordinates all modules
 */

import { Store } from './store.js';
import { Events } from './events.js';
import { UI } from './ui.js';

/**
 * Initialize cancel button icons
 * Normalize Cancel buttons: add consistent × icon before text
 */
function initializeCancelButtons() {
    document.querySelectorAll('.modal-actions .btn-cancel').forEach(btn => {
        const icon = `
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
                <path d="M6 6l8 8M14 6l-8 8"></path>
            </svg>`;
        // Only inject if not already present
        if (!btn.dataset.iconified) {
            btn.innerHTML = icon + ' Cancel';
            btn.dataset.iconified = 'true';
        }
    });
}

/**
 * Main application initialization
 */
function init() {
    // Initialize cancel button icons first
    initializeCancelButtons();
    
    // Load data and theme
    Store.load();
    Store.loadTheme();
    
    // Setup event listeners
    Events.setup();
    
    // Build initial UI
    UI.rebuild();
}

/**
 * Start the application when DOM is ready
 */
document.addEventListener('DOMContentLoaded', () => {
    init();
});

// Export init function for external use if needed
export { init };