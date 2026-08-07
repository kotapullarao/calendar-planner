/**
 * Main Application Module
 * Initializes the application and coordinates all modules
 */

import { Store } from './store.js';
import { Events } from './events.js';
import { UI } from './ui.js';
import { getState } from '../core/state.js';

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
                            // Prefer the actual month cell, not the grayed other-month spillover
                            let todayElement = document.querySelector('.day.today:not(.other-month)');
                            if (!todayElement) {
                                todayElement = document.querySelector('.day.today');
                            }
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
    // Load and apply gradient theme
    const gradientTheme = Store.loadGradientTheme();
    Events.applyGradientTheme(gradientTheme);

    // Force weekend colors update with current theme (to apply new gradient logic)
    setTimeout(() => {
        Events.applyGradientTheme(gradientTheme);
    }, 100);
    // Load persisted stats toggle before first render
    if (Store.loadStatsHidden) Store.loadStatsHidden();
    // Initialize header theme toggle label
    UI.updateThemeControl(document.documentElement.getAttribute('data-theme') || 'light');

    // Setup event listeners
    Events.setup();

    // Default to Year view on first load
    const monthBtn = document.getElementById('month-view-btn');
    const yearBtn = document.getElementById('year-overview-btn');
    if (monthBtn && yearBtn) {
        monthBtn.classList.remove('active');
        yearBtn.classList.add('active');
    }
    // Build initial UI
    UI.rebuild();
    // Apply persisted stats visibility
    const statsEl = document.getElementById('stats');
    if (statsEl && typeof getState?.statsHidden === 'function' && getState.statsHidden()) {
        statsEl.classList.add('hidden');
    }
    // Simple toggle system - no complex indicator alignment needed

    // Handle PWA shortcuts after UI is ready
    handlePWAShortcuts();

    // Show first-time walkthrough offer
    showFirstTimeOffer();
}

/**
 * Show first-time walkthrough offer
 */
function showFirstTimeOffer() {
    const KEY = 'calendar-walkthrough-v4-seen';
    const seen = localStorage.getItem(KEY);
    
    if (!seen) {
        // Create first-time offer popup matching walkthrough style
        const offer = document.createElement('div');
        offer.className = 'walkthrough-prompt first-time-offer';
        offer.id = 'first-time-offer';
        offer.innerHTML = `
            <div class="walkthrough-prompt-content">
                <div class="walkthrough-prompt-text">
                    👋 <strong>Welcome to Calendar Planner!</strong> Take a quick interactive tour to learn the key features and get started.
                </div>
                <div class="walkthrough-prompt-controls">
                    <button class="walkthrough-prompt-btn" id="offer-not-now">Not now</button>
                    <button class="walkthrough-prompt-btn primary" id="offer-start-now">Start Tour</button>
                    <button class="walkthrough-prompt-close" id="offer-close">×</button>
                </div>
            </div>
        `;
        
        document.body.appendChild(offer);
        
        // Show with animation
        setTimeout(() => {
            offer.classList.add('show');
        }, 500);
        
        // Event handlers
        document.getElementById('offer-start-now')?.addEventListener('click', () => {
            localStorage.setItem(KEY, '1');
            hideOffer(offer);
            setTimeout(() => {
                Events.startWalkthrough();
            }, 300);
        });
        
        document.getElementById('offer-not-now')?.addEventListener('click', () => {
            localStorage.setItem(KEY, '1');
            hideOffer(offer);
        });
        
        document.getElementById('offer-close')?.addEventListener('click', () => {
            localStorage.setItem(KEY, '1');
            hideOffer(offer);
        });
        
        // Auto-dismiss after 30 seconds
        setTimeout(() => {
            if (document.getElementById('first-time-offer')) {
                localStorage.setItem(KEY, '1');
                hideOffer(offer);
            }
        }, 30000);
    }
}

/**
 * Hide first-time offer with animation
 */
function hideOffer(offer) {
    offer.classList.remove('show');
    setTimeout(() => {
        try {
            offer.remove();
        } catch (e) {}
    }, 300);
}

/**
 * Start the application when DOM is ready
 */
document.addEventListener('DOMContentLoaded', () => {
    init();
});

// Export init function for external use if needed
export { init };
