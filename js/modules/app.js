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
 * Handle PWA shortcut actions from URL parameters
 */
function handlePWAShortcuts() {
    const urlParams = new URLSearchParams(window.location.search);
    const action = urlParams.get('action');
    
    if (action) {
        console.log('PWA Shortcut activated:', action); // Keep one useful debug log
        
        // Small delay to ensure UI is fully loaded
        setTimeout(() => {
            switch (action) {
                case 'new-category':
                    UI.openCategoryEditor();
                    break;
                    
                case 'today':
                    // Import constants module and set current year to today's year
                    import('./constants.js').then(({ setState }) => {
                        setState.currentYear(new Date().getFullYear());
                        UI.rebuild(true); // Pass true to indicate this is a "today" click
                        
                        // Scroll to today's date if visible
                        setTimeout(() => {
                            const todayElement = document.querySelector('.day.today');
                            if (todayElement) {
                                todayElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
                            }
                        }, 100);
                        
                        // Activate the today button to show visual feedback
                        const todayBtn = document.getElementById('today-btn');
                        if (todayBtn) {
                            todayBtn.classList.add('active');
                            setTimeout(() => todayBtn.classList.remove('active'), 2000);
                        }
                    });
                    break;
                    
                case 'manage':
                    UI.populateCategoryList(); 
                    UI.showModal('manage-plan-modal', true);
                    break;
                    
                case 'import':
                    UI.showModal('import-text-modal', true);
                    break;
                    
                default:
                    console.warn('Unknown PWA shortcut action:', action); // Changed to warn for better debugging
            }
            
            // Clean up the URL to remove the action parameter
            const url = new URL(window.location);
            url.searchParams.delete('action');
            window.history.replaceState({}, document.title, url.pathname + url.hash);
            
        }, 500); // Give UI time to initialize
    }
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
    
    // Handle PWA shortcuts after UI is ready
    handlePWAShortcuts();
}

/**
 * Start the application when DOM is ready
 */
document.addEventListener('DOMContentLoaded', () => {
    init();
});

// Export init function for external use if needed
export { init };