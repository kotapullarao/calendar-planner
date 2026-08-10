/**
 * Main Application Module
 * Initializes the application and coordinates all modules
 */

import { Store } from './store.js';
import { Events } from './events.js';
import { UI } from './ui.js';
import { Sync } from './sync.js';
import { getState, subscribe } from '../core/state.js';

/**
 * Give every dismiss button in a modal footer the same × icon.
 *
 * This used to write `icon + ' Cancel'`, throwing away the label the markup
 * asked for: the subscriptions footer said "Close" and the help footer said
 * "Got it!", and both rendered as "Cancel". The icon is the shared part; the
 * word is the button's own.
 */
function initializeCancelButtons() {
    document.querySelectorAll('.modal-actions .btn-cancel').forEach(btn => {
        const icon = `
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
                <path d="M6 6l8 8M14 6l-8 8"></path>
            </svg>`;
        // Only inject if not already present
        if (!btn.dataset.iconified) {
            const label = btn.textContent.trim() || 'Cancel';
            btn.innerHTML = `${icon} ${label}`;
            btn.dataset.iconified = 'true';
        }
    });
}

/**
 * Put the current month on screen once the first render has settled.
 *
 * Deliberately not a smooth scroll: on load there is nothing to animate away
 * from, and gliding through twelve months is slow and disorienting. An
 * existing scroll position is respected, so a restored one is not overridden.
 */
function scrollToTodayOnLoad() {
    requestAnimationFrame(() => {
        if (window.scrollY > 0) return;
        const today = document.querySelector('.day.today');
        const month = today && today.closest('.month-container');
        if (!month) return;
        const top = month.getBoundingClientRect().top + window.scrollY;
        window.scrollTo({ top: Math.max(0, top - 12), behavior: 'auto' });
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

                case 'today': {
                    // Reuse the Today button so this stays in sync with it: it sets
                    // both year and month, resets the filter, scrolls today into
                    // view, and shows the button feedback.
                    const todayBtn = document.getElementById('today-btn');
                    if (todayBtn) todayBtn.click();
                    break;
                }

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
 * Kick off subscription syncing: refresh anything stale, then keep a timer
 * running for as long as the app stays open.
 */
function initSubscriptionSync() {
    if (!Sync.getSubscriptions().length) return;

    const refresh = () => UI.rebuild();

    Sync.syncAll({ onlyStale: true })
        .then(results => { if (results.some(r => r.ok)) refresh(); })
        .catch(() => { /* cached dates stay on screen */ });

    Sync.startAutoSync(refresh);

    // Catch up straight after regaining connectivity rather than waiting for
    // the next tick of the timer.
    window.addEventListener('online', () => {
        Sync.syncAll({ onlyStale: true })
            .then(results => { if (results.some(r => r.ok)) refresh(); })
            .catch(() => {});
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

    // Repaint whenever state changes, instead of every mutation site
    // remembering to call UI.rebuild() itself. Notifications are batched, so a
    // burst of setters produces a single repaint.
    subscribe(() => UI.rebuild());

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

    // Open on today. The year grid is the app's front door, but it rendered
    // January at the top and left you to find the current month yourself —
    // about five and a half screens of scrolling on a phone. The view stays
    // the year; only the scroll position changes.
    scrollToTodayOnLoad();
    // Apply persisted stats visibility
    const statsEl = document.getElementById('stats');
    if (statsEl && typeof getState?.statsHidden === 'function' && getState.statsHidden()) {
        statsEl.classList.add('hidden');
    }
    // Simple toggle system - no complex indicator alignment needed

    // Handle PWA shortcuts after UI is ready
    handlePWAShortcuts();

    // Refresh calendar subscriptions in the background. Cached dates are already
    // rendered above, so a failure here (offline, CORS) changes nothing on screen.
    initSubscriptionSync();

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
