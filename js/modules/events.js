/**
 * Event Handlers Module
 * Contains all event handling logic for user interactions
 */

import { getState, setState } from '../core/state.js';
import { $, $$ } from '../utils/dom.js';
import { Utils } from './utils.js';
import { Logic } from './logic.js';
import { UI } from './ui.js';
import { Store } from './store.js';
import { Sync } from './sync.js';
import { GRADIENT_THEMES } from '../config/constants.js';

// Event Handlers Object
export const Events = {
    /**
     * Connect date inputs with validation and native picker
     */
    connectDateInputs: (container) => {
        container.querySelectorAll('.relative.date-input-wrapper').forEach(wrapper => {
            const displayInput = wrapper.querySelector('.date-display-input');
            if (!displayInput) return;

            displayInput.addEventListener('focus', () => {
                if (displayInput.classList.contains('border-red-500')) {
                    displayInput.value = '';
                }
                displayInput.classList.remove('border-red-500', 'shake', 'border-green-500');
            });

            displayInput.addEventListener('blur', () => {
                const nativeInput = wrapper.querySelector('.native-date-input');
                if (displayInput.value) {
                    // Try to normalize the date (handles both DD-MM-YYYY and relative dates)
                    const normalizedDate = Utils.normalizeDate(displayInput.value);
                    if (normalizedDate) {
                        // Update the display with normalized date
                        displayInput.value = normalizedDate;
                        displayInput.classList.remove('border-red-500');
                        displayInput.classList.add('border-green-500');
                        
                        // Update native input
                        const nativeFormat = Utils.formatDateForNative(normalizedDate);
                        if (nativeFormat && nativeInput) {
                            nativeInput.value = nativeFormat;
                        }
                        
                        setTimeout(() => {
                            displayInput.classList.remove('border-green-500');
                        }, 1500);
                    } else {
                        // Invalid date
                        displayInput.classList.add('border-red-500', 'shake');
                        setTimeout(() => {
                            displayInput.classList.remove('shake');
                        }, 600);
                    }
                }
            });

            displayInput.addEventListener('input', (e) => {
                const value = e.target.value;
                const cursorPos = e.target.selectionStart;
                
                // Skip masking if it contains text patterns (relative dates, month names, ordinals)
                if (/\d+(st|nd|rd|th)|\b(jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec|january|february|march|april|may|june|july|august|september|october|november|december|today|tomorrow|yesterday|next|this|weekend|week|month|days?|from|now|in)\b/i.test(value)) {
                    return; // Allow text input as-is
                }
                
                // Only apply masking for numeric date patterns
                const numbersOnly = value.replace(/\D/g, '');
                if (numbersOnly.length > 0 && (/^\d+$/.test(value) || /^\d{1,2}-\d{0,6}$/.test(value) || /^\d{1,2}-\d{1,2}-\d{0,4}$/.test(value))) {
                    let masked = '';
                    let numIndex = 0;
                    
                    // Smart masking: preserve existing hyphens when possible
                    if (value.includes('-')) {
                        const parts = value.split('-');
                        
                        // Handle day part
                        if (parts.length >= 1 && parts[0].length <= 2) {
                            masked += parts[0];
                        }
                        
                        // Handle month part
                        if (parts.length >= 2) {
                            const monthPart = parts[1];
                            if (monthPart.length <= 2) {
                                masked += '-' + monthPart;
                            } else {
                                // Month part is too long, likely contains year digits (like "15-082025")
                                const monthOnly = monthPart.slice(0, 2);
                                const yearPart = monthPart.slice(2);
                                masked += '-' + monthOnly + '-' + yearPart.slice(0, 4);
                            }
                        }
                        
                        // Handle year part (if already separated)
                        if (parts.length >= 3) {
                            masked += '-' + (parts[2].length <= 4 ? parts[2] : parts[2].slice(0, 4));
                        }
                    } else {
                        // Apply fresh masking for continuous digit input
                        for (let i = 0; i < numbersOnly.length && i < 8; i++) {
                            if (i === 2 || i === 4) masked += '-';
                            masked += numbersOnly[i];
                        }
                    }
                    
                    if (masked !== value) {
                        e.target.value = masked;
                        // Try to maintain cursor position
                        const newCursorPos = Math.min(cursorPos + (masked.length - value.length), masked.length);
                        setTimeout(() => {
                            try {
                                e.target.setSelectionRange(newCursorPos, newCursorPos);
                            } catch (ex) {}
                        }, 0);
                    }
                }
            });

            const nativeInput = wrapper.querySelector('.native-date-input');
            if (nativeInput) {
                nativeInput.addEventListener('change', () => {
                    if (nativeInput.value) {
                        const ddmmyyyy = Utils.formatDateForDisplay(nativeInput.value);
                        displayInput.value = ddmmyyyy;
                        displayInput.classList.remove('border-red-500','shake');
                        displayInput.classList.add('border-green-500');
                        setTimeout(() => displayInput.classList.remove('border-green-500'), 1500);
                    }
                });
                displayInput.addEventListener('keydown', (ev) => {
                    if (ev.key === 'Enter' || ev.key === 'ArrowDown') {
                        try { nativeInput.showPicker(); } catch (e) { nativeInput.focus(); }
                        ev.preventDefault();
                    }
                });
            }
        });
    },

    /**
     * Handle category form submission
     */
    handleCategoryFormSubmit: (e) => {
        e.preventDefault();
        const errorDiv = $('#editor-error-message');
        const newCategoryData = Events.readEditorForm('category', $('#category-id-input').value);

        if (Logic.checkForDuplicate(newCategoryData)) {
            errorDiv.textContent = 'A category with this name already exists.';
            errorDiv.style.display = 'block';
            return;
        }
        errorDiv.style.display = 'none';

        const config = getState.config();
        const existingIndex = config.eventCategories.findIndex(c => c.id === newCategoryData.id);
        
        // Track category name usage for smart suggestions
        Utils.saveCategoryNameUsage(newCategoryData.name);
        Utils.saveRecentCategoryName(newCategoryData.name);
        
        if (existingIndex > -1) {
            config.eventCategories[existingIndex] = newCategoryData;
        } else {
            config.eventCategories.push(newCategoryData);
        }
        setState.config(config);
        Store.save();

        $('#manage-plan-modal .modal-content').classList.remove('medium');
        UI.populateCategoryList();
        UI.switchModalView('manage-plan-modal', '#category-list-view');

        setState.activeFilter('all');
        UI.rebuild();
    },

    /**
     * Update segmented control indicator using DOM measurements for perfect alignment
     */
    // Removed complex indicator system - using simple active state styling
    /**
     * Apply theme instantly without CSS transitions/animations
     */
    setThemeInstant: (theme) => {
        const html = document.documentElement;
        if (!html) return;
        html.classList.add('no-theme-transition');
        html.setAttribute('data-theme', theme);
        // Remove in next frame to avoid suppressing other transitions
        requestAnimationFrame(() => {
            requestAnimationFrame(() => html.classList.remove('no-theme-transition'));
        });
    },

    /**
     * Handle parsed event form submission
     */
    handleParsedEventFormSubmit: (e) => {
        e.preventDefault();
        const modal = $('#edit-parsed-event-modal');
        const index = parseInt(modal.dataset.editingIndex);
        if (isNaN(index)) return;

        const editedData = Events.readEditorForm('parsed');
        const isDuplicate = Logic.checkForDuplicate(editedData);

        UI.showModal('edit-parsed-event-modal', false);
        modal.querySelector('.modal-content').classList.remove('medium');

        setTimeout(() => {
            const parsedCategoriesCache = getState.parsedCategoriesCache();
            parsedCategoriesCache[index] = { ...parsedCategoriesCache[index], ...editedData, isDuplicate };
            setState.parsedCategoriesCache(parsedCategoriesCache);
            UI.renderParsedCategories(true); // Preserve selections but auto-check newly non-duplicate items
            UI.updateImportButtonState();
        }, 300);
    },

    /**
     * Read data from editor form
     */
    readEditorForm: (prefix, id = null) => {
        const type = $(`#${prefix}-type-toggle .active`).dataset.type;
        const data = {
            name: $(`#${prefix}-name-input`).value,
            emoji: $(`#${prefix}-emoji-input`).value,
            color: $(`#${prefix}-color-input`).value,
            type: type,
            excludeHolidays: $(`#${prefix}-exclude-holidays-checkbox`).checked,
            dates: [],
            childCategoryIds: []
        };
        if (id) data.id = id;

        if (type === 'single') {
            // Optional per-event details from the row's panel. Only non-empty
            // fields are stored, so plain dates stay compact strings.
            const readDetails = (item) => {
                const val = sel => item.querySelector(sel)?.value.trim() || '';
                const details = {};
                const title = val('.event-title-input');
                const time = val('.event-time-input');
                const endTime = val('.event-end-time-input');
                const location = val('.event-location-input');
                const notes = val('.event-notes-input');
                if (title) details.title = title;
                if (time) details.time = time;
                if (endTime && endTime !== time) details.endTime = endTime;
                if (location) details.location = location;
                if (notes) details.notes = notes;
                return Object.keys(details).length ? details : null;
            };

            data.dates = [...$$(`#${prefix}-date-entries-container .date-entry-item`)].map(item => {
                const details = readDetails(item);
                if (item.classList.contains('range')) {
                    const start = item.querySelector('.date-input-start');
                    const end = item.querySelector('.date-input-end');
                    if (start?.value && end?.value && Utils.validateDate(start.value) && Utils.validateDate(end.value)) {
                        return {
                            start: Utils.formatDateForNative(start.value),
                            end: Utils.formatDateForNative(end.value),
                            ...(details || {})
                        };
                    }
                } else if (item.classList.contains('single')) {
                    const single = item.querySelector('.date-display-input');
                    if (single?.value && Utils.validateDate(single.value)) {
                        const dateStr = Utils.formatDateForNative(single.value);
                        // Object form (with end === start) only when details exist.
                        return details ? { start: dateStr, end: dateStr, ...details } : dateStr;
                    }
                }
                return null;
            }).filter(Boolean);
        } else {
            data.childCategoryIds = [...$$(`#${prefix}-group-categories-container input:checked`)].map(input => input.value);
        }
        return data;
    },

    /**
     * Handle parse import action
     */
    handleParseImport: () => {
        const text = $('#import-textarea').value;
        if (!text) {
            $('#import-error-message').style.display = 'block';
            return;
        }
        $('#import-error-message').style.display = 'none';

        const parsedCategories = Logic.parseCategoriesFromText(text);
        parsedCategories.forEach(cat => cat.isDuplicate = Logic.checkForDuplicate(cat));
        setState.parsedCategoriesCache(parsedCategories);

        UI.renderParsedCategories();
        UI.switchModalView('import-text-modal', '#import-confirmation-view');
        UI.updateImportButtonState();
    },

    /**
     * Handle confirm import action
     */
    handleConfirmImport: () => {
        const parsedCategoriesCache = getState.parsedCategoriesCache();
        const selectedCategories = [...$$('.import-checkbox:checked')]
            .map(checkbox => {
                const cat = parsedCategoriesCache[parseInt(checkbox.closest('.import-preview-card').dataset.index)];
                cat.id = `custom-${Date.now()}-${Math.random()}`;
                return cat;
            });

        const config = getState.config();
        config.eventCategories.push(...selectedCategories);
        setState.config(config);
        Store.save();
        UI.populateCategoryList();
        setState.activeFilter('all');
        UI.rebuild();
        UI.showModal('import-text-modal', false);
    },

    /**
     * Start minimalist walkthrough
     */
    startWalkthrough: () => {
        UI.showModal('help-modal', false);
        
        const steps = [
            { element: '#stats', title: 'Statistics Cards', text: 'View category counts and tap cards to filter the calendar. Drag to reorder them.' },
            { element: '#add-new-stat-btn', title: 'Add New Category', text: 'Create new categories with custom emojis and colors for your events.' },
            { element: '#calendars', title: 'Calendar View', text: 'Your events appear here. Double-click any day to quickly add events.', noScroll: true },
            { element: '#today-btn', title: 'Today Button', text: 'Jump instantly to today\'s date in the current view.' },
            { element: '#view-mode-toggle', title: 'Month/Year Toggle', text: 'Switch between Month and Year views to see different time scales.' },
            { element: '#theme-toggle', title: 'Light/Midnight Theme Toggle', text: 'Toggle between light and midnight themes instantly.' },
            { element: '.fab-main', title: 'Quick Actions', text: 'Access all main features: Add, Manage, Import/Export, and more.' }
        ];

        let currentStep = 0;
        const prompt = document.getElementById('walkthrough-prompt');
        const text = document.getElementById('walkthrough-text');
        const progress = document.getElementById('walkthrough-progress');
        const prevBtn = document.getElementById('walkthrough-prev');
        const nextBtn = document.getElementById('walkthrough-next');
        const closeBtn = document.getElementById('walkthrough-close');
        
        // Add null checks
        if (!prompt || !text || !progress || !prevBtn || !nextBtn || !closeBtn) {
            console.error('Walkthrough elements not found:', {
                prompt: !!prompt,
                text: !!text,
                progress: !!progress,
                prevBtn: !!prevBtn,
                nextBtn: !!nextBtn,
                closeBtn: !!closeBtn
            });
            return;
        }

        const removeHighlight = () => {
            document.querySelectorAll('.walkthrough-highlight').forEach(el => {
                el.classList.remove('walkthrough-highlight');
            });
        };

        const highlightElement = (selector, noScroll = false) => {
            removeHighlight();
            const element = document.querySelector(selector);
            if (element) {
                element.classList.add('walkthrough-highlight');
                if (!noScroll) {
                    element.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'center' });
                }
            }
        };

        const showStep = (step) => {
            if (step < 0 || step >= steps.length) {
                endWalkthrough();
                return;
            }

            const currentStepData = steps[step];
            highlightElement(currentStepData.element, currentStepData.noScroll);
            
            text.innerHTML = `<strong>${currentStepData.title}:</strong> ${currentStepData.text}`;
            progress.textContent = `${step + 1}/${steps.length}`;

            prevBtn.style.visibility = step === 0 ? 'hidden' : 'visible';
            nextBtn.textContent = step === steps.length - 1 ? 'Finish' : 'Next';
        };

        const endWalkthrough = () => {
            removeHighlight();
            prompt.classList.remove('show');
            setTimeout(() => {
                prompt.style.display = 'none';
            }, 300); // Wait for animation to complete
            currentStep = 0;
            
            // Clean up event listeners (both click and touchend)
            const removeAllListeners = (element, handler) => {
                element.removeEventListener('click', handler);
                element.removeEventListener('touchend', handler);
            };
            
            removeAllListeners(prevBtn, handlePrev);
            removeAllListeners(nextBtn, handleNext);
            removeAllListeners(closeBtn, endWalkthrough);
        };

        const handlePrev = () => {
            currentStep--;
            showStep(currentStep);
        };

        const handleNext = () => {
            currentStep++;
            showStep(currentStep);
        };

        // Enhanced event listeners with touch support
        const addTouchFriendlyListener = (element, handler) => {
            element.addEventListener('click', handler);
            element.addEventListener('touchend', (e) => {
                e.preventDefault();
                handler();
            });
        };

        addTouchFriendlyListener(prevBtn, handlePrev);
        addTouchFriendlyListener(nextBtn, handleNext);
        addTouchFriendlyListener(closeBtn, endWalkthrough);

        // Start the walkthrough
        prompt.style.display = 'block';
        setTimeout(() => prompt.classList.add('show'), 50);
        showStep(0);
    },

    /**
     * Setup touch handling for calendar buttons (iOS compatibility)
     */
    setupCalendarButtonTouchHandling: () => {
        // Helper function to trigger date picker
        const triggerDatePicker = (calendarButton, ev, source) => {
            if (ev) {
                ev.preventDefault();
                ev.stopPropagation();
            }
            
            const wrapper = calendarButton.closest('.relative.date-input-wrapper');
            if (wrapper) {
                const nativeInput = wrapper.querySelector('.native-date-input');
                if (nativeInput) {
                    try { 
                        nativeInput.showPicker(); 
                    } catch (error) { 
                        nativeInput.focus(); 
                    }
                }
            }
        };

        // Body-level event delegation with touch handling for calendar buttons
        let calendarTouchHandled = false;

        // Handle pointer events for calendar buttons (modern approach)
        if ('PointerEvent' in window) {
            document.body.addEventListener('pointerup', (ev) => {
                if (ev.pointerType === 'touch') {
                    const calendarButton = ev.target.closest('.calendar-button');
                    if (calendarButton) {
                        calendarTouchHandled = true;
                        triggerDatePicker(calendarButton, ev, 'pointer');
                    }
                }
            }, { passive: false });
        }

        // Handle touch events for calendar buttons (iOS Safari fallback)
        document.body.addEventListener('touchend', (ev) => {
            const calendarButton = ev.target.closest('.calendar-button');
            if (calendarButton && !calendarTouchHandled) {
                calendarTouchHandled = true;
                triggerDatePicker(calendarButton, ev, 'touch');
            }
        }, { passive: false });

        // Handle click events for calendar buttons (mouse and general fallback)
        document.body.addEventListener('click', (ev) => {
            const calendarButton = ev.target.closest('.calendar-button');
            if (calendarButton && !calendarTouchHandled) {
                triggerDatePicker(calendarButton, ev, 'click');
            }
            // Reset touch handled state for calendar buttons
            if (calendarButton) {
                setTimeout(() => { calendarTouchHandled = false; }, 100);
            }
        }, { capture: true, passive: false });

        // Reset touch state on touchstart to prevent stuck state
        document.body.addEventListener('touchstart', (ev) => {
            const calendarButton = ev.target.closest('.calendar-button');
            if (calendarButton) {
                calendarTouchHandled = false;
            }
        }, { passive: true });
    },

    /**
     * Open the calendar subscriptions modal.
     */
    handleOpenSubscriptions: () => {
        UI.populateSubscriptionList();
        UI.showModal('ics-subscriptions-modal', true);
        UI.switchModalView('ics-subscriptions-modal', '#subscription-list-view');
    },

    /**
     * Sync one subscription and refresh the affected views.
     */
    handleSyncSubscription: async (id) => {
        UI.showSyncStatus('Syncing…', 'info');
        UI.populateSubscriptionList();

        const result = await Sync.syncSubscription(id);

        UI.populateSubscriptionList();
        if (result.ok) {
            const note = result.truncated ? ' (list truncated)' : '';
            UI.showSyncStatus(`Synced ${result.events} event${result.events === 1 ? '' : 's'}${note}.`, 'ok');
            UI.rebuild();
        } else {
            UI.showSyncStatus(result.error || 'Sync failed.', 'error');
        }
        return result;
    },

    /**
     * Save the add/edit subscription form, then sync it immediately.
     */
    handleSubscriptionFormSubmit: async (e) => {
        e.preventDefault();
        const errorEl = $('#subscription-error-message');
        errorEl.style.display = 'none';

        const id = $('#subscription-id-input').value;
        const payload = {
            url: $('#subscription-url-input').value,
            name: $('#subscription-name-input').value.trim(),
            emoji: $('#subscription-emoji-input').value.trim() || '🔗',
            color: $('#subscription-color-input').value,
            excludeHolidays: $('#subscription-exclude-holidays').checked,
            enabled: $('#subscription-enabled').checked
        };

        let subscription;
        try {
            subscription = id ? Sync.updateSubscription(id, payload) : Sync.addSubscription(payload);
        } catch (err) {
            errorEl.textContent = err.message;
            errorEl.style.display = 'block';
            return;
        }
        if (!subscription) {
            errorEl.textContent = 'Could not save that subscription.';
            errorEl.style.display = 'block';
            return;
        }

        UI.populateSubscriptionList();
        UI.switchModalView('ics-subscriptions-modal', '#subscription-list-view');
        UI.rebuild();

        if (subscription.enabled !== false) {
            await Events.handleSyncSubscription(subscription.id);
        }
    },

    /**
     * Save sync settings and restart the refresh timer with the new interval.
     */
    handleSubscriptionSettingsSubmit: (e) => {
        e.preventDefault();
        const config = getState.config();
        config.icsSyncIntervalMinutes = parseInt($('#subscription-interval-input').value, 10) || 30;
        config.icsProxyUrl = $('#subscription-proxy-input').value.trim();
        setState.config(config);
        Store.save();

        Sync.startAutoSync(() => UI.rebuild());

        UI.populateSubscriptionList();
        UI.switchModalView('ics-subscriptions-modal', '#subscription-list-view');
        UI.showSyncStatus('Settings saved.', 'ok');
    },

    /**
     * Unsubscribe, with the same undo affordance as deleting a category.
     */
    handleDeleteSubscription: (id) => {
        const subscription = Sync.getSubscriptions().find(s => s.id === id);
        if (!subscription) return;

        const config = getState.config();
        const category = config.eventCategories.find(c => c.id === id);
        const categoryIndex = config.eventCategories.findIndex(c => c.id === id);
        const subscriptionIndex = Sync.getSubscriptions().findIndex(s => s.id === id);
        const snapshot = { ...subscription };
        const categorySnapshot = category ? { ...category } : null;

        Sync.removeSubscription(id);
        UI.populateSubscriptionList();
        UI.rebuild();

        UI.showUndoToast(`"${subscription.name || 'Calendar'}" unsubscribed`, () => {
            const cfg = getState.config();
            if (!Array.isArray(cfg.icsSubscriptions)) cfg.icsSubscriptions = [];
            cfg.icsSubscriptions.splice(Math.max(0, subscriptionIndex), 0, snapshot);
            if (categorySnapshot) {
                cfg.eventCategories.splice(Math.max(0, categoryIndex), 0, categorySnapshot);
            }
            setState.config(cfg);
            Store.save();
            UI.populateSubscriptionList();
            UI.populateCategoryList();
            UI.rebuild();
        });
    },

    /**
     * Handle backup data to JSON file
     */
    handleBackupData: () => {
        try {
            const config = getState.config();
            const backupData = {
                version: '1.0',
                timestamp: new Date().toISOString(),
                categories: config.eventCategories,
                appInfo: {
                    name: 'Calendar Planner',
                    exportedOn: new Date().toLocaleDateString()
                }
            };

            const dataStr = JSON.stringify(backupData, null, 2);
            const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);

            const exportFileDefaultName = `calendar-backup-${new Date().toISOString().slice(0, 10)}.json`;

            const linkElement = document.createElement('a');
            linkElement.setAttribute('href', dataUri);
            linkElement.setAttribute('download', exportFileDefaultName);
            linkElement.click();

            // Show success message
            const toast = document.createElement('div');
            toast.className = 'backup-toast';
            toast.innerHTML = `
                <div class="backup-content">
                    <span>✅ Backup created successfully!</span>
                    <small>${config.eventCategories.length} categories exported</small>
                </div>
            `;
            toast.style.cssText = `
                position: fixed;
                top: 20px;
                right: 20px;
                background: var(--success-color);
                color: white;
                padding: 16px 20px;
                border-radius: 8px;
                box-shadow: 0 4px 12px rgba(0,0,0,0.3);
                z-index: 2000;
                font-weight: 600;
                min-width: 250px;
            `;
            toast.querySelector('.backup-content').style.cssText = `
                display: flex;
                flex-direction: column;
                gap: 4px;
            `;
            toast.querySelector('small').style.cssText = `
                opacity: 0.9;
                font-size: 0.85em;
            `;
            document.body.appendChild(toast);
            setTimeout(() => toast.remove(), 4000);
            
        } catch (error) {
            console.error('Backup failed:', error);
            alert('Backup failed. Please try again.');
        }
    },

    /**
     * Expand import text section
     */
    expandImportTextSection: () => {
        // First collapse everything to reset state
        Events.collapseImportSection();
        
        // Mark text card as active
        $('#import-from-text-card').classList.add('active');
        
        // Show expanded content and text section only
        const expandedContent = $('#import-expanded-content');
        const textSection = $('#import-text-section');
        
        expandedContent.style.display = 'block';
        textSection.style.display = 'block';
        
        // Hide backup section explicitly
        $('#import-backup-section').style.display = 'none';
        
        // Show only relevant buttons
        Events.hideAllImportButtons();
        $('#parse-import-btn').style.display = 'inline-flex';
        
        // Focus the textarea
        setTimeout(() => {
            $('#import-textarea').focus();
        }, 300);
    },
    
    /**
     * Reset import modal to initial state
     */
    resetImportModal: () => {
        // Reset to main import view
        UI.switchModalView('import-text-modal', '#import-main-view');
        
        // Collapse all sections
        Events.collapseImportSection();
        
        // Ensure we're on the main view with no expanded content
        $('#import-expanded-content').style.display = 'none';
        $('#import-text-section').style.display = 'none';
        $('#import-backup-section').style.display = 'none';
    },

    /**
     * Collapse import section (when switching to backup or closing)
     */
    collapseImportSection: () => {
        // Remove active state from all cards
        document.querySelectorAll('.import-option-card').forEach(card => card.classList.remove('active'));
        
        // Hide all expanded content
        $('#import-expanded-content').style.display = 'none';
        $('#import-text-section').style.display = 'none';
        $('#import-backup-section').style.display = 'none';
        
        // Hide action buttons (main cancel stays visible)
        Events.hideAllImportButtons();
        
        // Clear any error messages
        $('#import-error-message').style.display = 'none';
        $('#backup-error-message').style.display = 'none';
        
        // Clear textarea
        $('#import-textarea').value = '';
        
        // Clear backup state
        Events.clearBackupState();
    },

    /**
     * Handle backup import workflow - show file selection UI
     */
    handleRestoreData: () => {
        Events.expandImportBackupSection();
    },

    /**
     * Hide all import modal buttons except main cancel
     */
    hideAllImportButtons: () => {
        // Hide all action buttons in the right section
        $('#parse-import-btn').style.display = 'none';
        $('#confirm-backup-restore-btn').style.display = 'none';
        $('#cancel-backup-restore-btn').style.display = 'none';
        $('#backup-done-btn').style.display = 'none';
        
        // Main cancel button should always remain visible
        $('.import-main-cancel').style.display = 'inline-flex';
    },

    /**
     * Expand import backup section and reset state
     */
    expandImportBackupSection: () => {
        // First collapse everything to reset state
        Events.collapseImportSection();
        
        // Mark backup card as active
        $('#import-from-backup-card').classList.add('active');
        
        // Show expanded content and backup section only
        const expandedContent = $('#import-expanded-content');
        const backupSection = $('#import-backup-section');
        
        expandedContent.style.display = 'block';
        backupSection.style.display = 'block';
        
        // Hide text section explicitly
        $('#import-text-section').style.display = 'none';
        
        // Reset to file selection step
        Events.showBackupStep('file-selection');
        
        // Clear any previous state
        Events.clearBackupState();
    },

    /**
     * Show specific backup workflow step
     */
    showBackupStep: (step) => {
        // Hide all steps
        document.querySelectorAll('.backup-step').forEach(stepEl => {
            stepEl.style.display = 'none';
        });
        
        // Hide all buttons first
        Events.hideAllImportButtons();
        
        // Show relevant step and buttons
        switch (step) {
            case 'file-selection':
                $('#backup-file-selection').style.display = 'block';
                // No additional buttons needed - main cancel is always visible
                break;
            case 'confirmation':
                $('#backup-confirmation').style.display = 'block';
                $('#cancel-backup-restore-btn').style.display = 'inline-flex';
                $('#confirm-backup-restore-btn').style.display = 'inline-flex';
                break;
            case 'success':
                $('#backup-success').style.display = 'block';
                $('#backup-done-btn').style.display = 'inline-flex';
                break;
        }
    },

    /**
     * Clear backup workflow state
     */
    clearBackupState: () => {
        // Clear file input completely
        const fileInput = $('#backup-file-input');
        fileInput.value = '';
        
        // Hide and clear file info display
        $('#selected-file-info').style.display = 'none';
        $('#selected-file-name').textContent = '';
        
        // Clear error messages
        $('#backup-error-message').style.display = 'none';
        
        // Clear dynamic content (both old and new design elements)
        const backupDetails = $('#backup-details');
        if (backupDetails) backupDetails.innerHTML = '';
        
        const backupSuccessDetails = $('#backup-success-details');
        if (backupSuccessDetails) backupSuccessDetails.innerHTML = '';
        
        // Clear new design header values
        const currentCount = $('#current-categories-count');
        if (currentCount) currentCount.textContent = '0';
        
        const backupCount = $('#backup-categories-count');
        if (backupCount) backupCount.textContent = '0';
        
        const backupDateDisplay = $('#backup-date-display');
        if (backupDateDisplay) backupDateDisplay.textContent = '';
        
        // Clear tab previews
        document.querySelectorAll('.mode-preview').forEach(preview => {
            preview.innerHTML = '';
        });
        
        // Clear pending backup data from state
        setState.pendingBackupData(null);
    },

    /**
     * Handle backup file selection
     */
    handleBackupFileSelection: (file) => {
        if (!file) return;
        
        // Show selected file info
        $('#selected-file-name').textContent = file.name;
        $('#selected-file-info').style.display = 'block';
        $('#backup-error-message').style.display = 'none';
        
        // Read and validate the file
        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const backupData = JSON.parse(event.target.result);
                
                // Validate backup data structure
                if (!backupData.categories || !Array.isArray(backupData.categories)) {
                    throw new Error('Invalid backup file format');
                }
                
                // Store the backup data for later use
                setState.pendingBackupData(backupData);
                
                // Show confirmation details
                const currentCategoriesCount = getState.config().eventCategories.length;
                const backupCategoriesCount = backupData.categories.length;
                const backupDate = backupData.appInfo?.exportedOn || backupData.timestamp || 'Unknown';
                
                // Populate the new compact header
                $('#current-categories-count').textContent = currentCategoriesCount;
                $('#backup-categories-count').textContent = backupCategoriesCount;
                $('#backup-date-display').textContent = new Date(backupDate).toLocaleDateString() || backupDate;
                
                // Initialize all tab previews and set default
                Events.updateTabModePreview('replace');
                Events.updateTabModePreview('merge-skip'); 
                Events.updateTabModePreview('merge-rename');
                Events.switchRestoreMode('replace');
                
                // Move to confirmation step
                Events.showBackupStep('confirmation');
                
            } catch (error) {
                console.error('Backup file validation failed:', error);
                $('#backup-error-message').textContent = 'Invalid backup file. Please select a valid Calendar Planner backup file (.json)';
                $('#backup-error-message').style.display = 'block';
                $('#selected-file-info').style.display = 'none';
            }
        };
        reader.readAsText(file);
    },

    /**
     * Confirm and execute backup restoration
     */
    confirmBackupRestore: () => {
        const backupData = getState.pendingBackupData();
        if (!backupData) return;
        
        // Get selected restore mode
        const restoreMode = document.querySelector('input[name="restore-mode"]:checked')?.value || 'replace';
        
        try {
            const config = getState.config();
            const currentCategories = config.eventCategories;
            const backupCategories = backupData.categories;
            let resultCategories = [];
            let stats = { added: 0, skipped: 0, renamed: 0, replaced: 0 };
            
            switch (restoreMode) {
                case 'replace':
                    resultCategories = [...backupCategories];
                    stats.replaced = backupCategories.length;
                    break;
                    
                case 'merge-skip':
                    resultCategories = [...currentCategories];
                    const currentNames = new Set(currentCategories.map(cat => cat.name.toLowerCase()));
                    
                    backupCategories.forEach(backupCat => {
                        if (!currentNames.has(backupCat.name.toLowerCase())) {
                            resultCategories.push({ ...backupCat, id: `restored-${Date.now()}-${Math.random()}` });
                            stats.added++;
                        } else {
                            stats.skipped++;
                        }
                    });
                    break;
                    
                case 'merge-rename':
                    resultCategories = [...currentCategories];
                    const currentNamesSet = new Set(currentCategories.map(cat => cat.name.toLowerCase()));
                    
                    backupCategories.forEach(backupCat => {
                        let finalName = backupCat.name;
                        
                        if (currentNamesSet.has(backupCat.name.toLowerCase())) {
                            // Find unique name
                            let suffix = 1;
                            do {
                                finalName = `${backupCat.name} (imported${suffix > 1 ? ` ${suffix}` : ''})`;
                                suffix++;
                            } while (currentNamesSet.has(finalName.toLowerCase()));
                            
                            currentNamesSet.add(finalName.toLowerCase());
                            stats.renamed++;
                        } else {
                            stats.added++;
                        }
                        
                        resultCategories.push({ 
                            ...backupCat, 
                            name: finalName,
                            id: `restored-${Date.now()}-${Math.random()}` 
                        });
                    });
                    break;
            }
            
            // Apply the changes
            config.eventCategories = resultCategories;
            setState.config(config);
            Store.save();
            
            // Update UI
            UI.populateCategoryList();
            UI.rebuild();
            setState.activeFilter('all');
            
            // Show success details
            const successMessage = Events.getSuccessMessage(restoreMode, stats);
            $('#backup-success-details').innerHTML = `
                <div class="detail-row">
                    <span class="detail-label">Restore Mode:</span>
                    <span class="detail-value">${Events.getRestoreModeLabel(restoreMode)}</span>
                </div>
                ${successMessage}
                <div class="detail-row">
                    <span class="detail-label">Total Categories:</span>
                    <span class="detail-value">${resultCategories.length}</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">Backup Date:</span>
                    <span class="detail-value">${backupData.appInfo?.exportedOn || backupData.timestamp || 'Unknown'}</span>
                </div>
            `;
            
            // Move to success step
            Events.showBackupStep('success');
            
            // Clear pending data
            setState.pendingBackupData(null);
            
        } catch (error) {
            console.error('Backup restoration failed:', error);
            $('#backup-error-message').textContent = 'Failed to restore backup. Please try again.';
            $('#backup-error-message').style.display = 'block';
            Events.showBackupStep('file-selection');
        }
    },

    /**
     * Update backup preview based on selected restore mode
     */
    updateBackupPreview: () => {
        const backupData = getState.pendingBackupData();
        if (!backupData) return;
        
        const restoreMode = document.querySelector('input[name="restore-mode"]:checked')?.value || 'replace';
        const currentCategories = getState.config().eventCategories;
        const backupCategories = backupData.categories;
        
        let previewHtml = '<h4>Preview Changes:</h4>';
        
        switch (restoreMode) {
            case 'replace':
                previewHtml += `
                    <div class="preview-section">
                        <div class="preview-label">Will replace <span class="preview-count">${currentCategories.length}</span> existing categories with <span class="preview-count">${backupCategories.length}</span> backup categories</div>
                    </div>
                `;
                break;
                
            case 'merge-skip':
                const currentNames = new Set(currentCategories.map(cat => cat.name.toLowerCase()));
                const toAdd = backupCategories.filter(cat => !currentNames.has(cat.name.toLowerCase()));
                const toSkip = backupCategories.filter(cat => currentNames.has(cat.name.toLowerCase()));
                
                previewHtml += `
                    <div class="preview-section">
                        <div class="preview-label">Keep existing <span class="preview-count">${currentCategories.length}</span> categories</div>
                    </div>
                    <div class="preview-section">
                        <div class="preview-label">Add <span class="preview-count">${toAdd.length}</span> new categories:</div>
                        <div class="preview-items">
                            ${toAdd.slice(0, 8).map(cat => `<span class="preview-item">${cat.name}</span>`).join('')}
                            ${toAdd.length > 8 ? `<span class="preview-item">+${toAdd.length - 8} more</span>` : ''}
                        </div>
                    </div>
                    ${toSkip.length > 0 ? `
                        <div class="preview-section">
                            <div class="preview-label">Skip <span class="preview-count">${toSkip.length}</span> duplicates:</div>
                            <div class="preview-items">
                                ${toSkip.slice(0, 8).map(cat => `<span class="preview-item skipped">${cat.name}</span>`).join('')}
                                ${toSkip.length > 8 ? `<span class="preview-item skipped">+${toSkip.length - 8} more</span>` : ''}
                            </div>
                        </div>
                    ` : ''}
                `;
                break;
                
            case 'merge-rename':
                const existingNames = new Set(currentCategories.map(cat => cat.name.toLowerCase()));
                const toAddDirect = backupCategories.filter(cat => !existingNames.has(cat.name.toLowerCase()));
                const toRename = backupCategories.filter(cat => existingNames.has(cat.name.toLowerCase()));
                
                previewHtml += `
                    <div class="preview-section">
                        <div class="preview-label">Keep existing <span class="preview-count">${currentCategories.length}</span> categories</div>
                    </div>
                    ${toAddDirect.length > 0 ? `
                        <div class="preview-section">
                            <div class="preview-label">Add <span class="preview-count">${toAddDirect.length}</span> new categories:</div>
                            <div class="preview-items">
                                ${toAddDirect.slice(0, 6).map(cat => `<span class="preview-item">${cat.name}</span>`).join('')}
                                ${toAddDirect.length > 6 ? `<span class="preview-item">+${toAddDirect.length - 6} more</span>` : ''}
                            </div>
                        </div>
                    ` : ''}
                    ${toRename.length > 0 ? `
                        <div class="preview-section">
                            <div class="preview-label">Add <span class="preview-count">${toRename.length}</span> with "(imported)" suffix:</div>
                            <div class="preview-items">
                                ${toRename.slice(0, 6).map(cat => `<span class="preview-item renamed">${cat.name} (imported)</span>`).join('')}
                                ${toRename.length > 6 ? `<span class="preview-item renamed">+${toRename.length - 6} more</span>` : ''}
                            </div>
                        </div>
                    ` : ''}
                `;
                break;
        }
        
        // Legacy support - update old backup-preview if it exists
        const legacyPreview = $('#backup-preview');
        if (legacyPreview) {
            legacyPreview.innerHTML = previewHtml;
        }
    },
    
    /**
     * Get success message for restore completion
     */
    getSuccessMessage: (restoreMode, stats) => {
        switch (restoreMode) {
            case 'replace':
                return `
                    <div class="detail-row">
                        <span class="detail-label">Categories Replaced:</span>
                        <span class="detail-value">${stats.replaced}</span>
                    </div>
                `;
            case 'merge-skip':
                return `
                    <div class="detail-row">
                        <span class="detail-label">Categories Added:</span>
                        <span class="detail-value">${stats.added}</span>
                    </div>
                    ${stats.skipped > 0 ? `
                        <div class="detail-row">
                            <span class="detail-label">Duplicates Skipped:</span>
                            <span class="detail-value">${stats.skipped}</span>
                        </div>
                    ` : ''}
                `;
            case 'merge-rename':
                return `
                    <div class="detail-row">
                        <span class="detail-label">Categories Added:</span>
                        <span class="detail-value">${stats.added}</span>
                    </div>
                    ${stats.renamed > 0 ? `
                        <div class="detail-row">
                            <span class="detail-label">Duplicates Renamed:</span>
                            <span class="detail-value">${stats.renamed}</span>
                        </div>
                    ` : ''}
                `;
            default:
                return '';
        }
    },
    
    /**
     * Get restore mode label
     */
    getRestoreModeLabel: (mode) => {
        switch (mode) {
            case 'replace': return 'Replace All';
            case 'merge-skip': return 'Merge (Skip Duplicates)';
            case 'merge-rename': return 'Merge (Rename Duplicates)';
            default: return 'Replace All';
        }
    },
    
    /**
     * Update warning message based on restore mode
     */
    /**
     * Switch restore mode tab and update UI
     */
    switchRestoreMode: (mode) => {
        // Update tab UI
        document.querySelectorAll('.mode-tab').forEach(tab => {
            tab.classList.toggle('active', tab.dataset.mode === mode);
        });
        
        // Update content visibility
        document.querySelectorAll('.mode-content').forEach(content => {
            content.classList.toggle('active', content.dataset.modeContent === mode);
        });
        
        // Update hidden radio button for compatibility
        document.querySelectorAll('input[name="restore-mode"]').forEach(radio => {
            radio.checked = radio.value === mode;
        });
        
        // Update preview content for the selected mode
        Events.updateTabModePreview(mode);
    },
    
    /**
     * Update preview content for the new tab interface
     */
    updateTabModePreview: (mode) => {
        const backupData = getState.pendingBackupData();
        if (!backupData) return;
        
        const currentCategories = getState.config().eventCategories;
        const backupCategories = backupData.categories;
        
        let previewHtml = '';
        
        switch (mode) {
            case 'replace':
                previewHtml = `<div class="preview-summary">Will replace <span class="preview-count">${currentCategories.length}</span> current with <span class="preview-count">${backupCategories.length}</span> backup categories</div>`;
                break;
                
            case 'merge-skip':
                const currentNames = new Set(currentCategories.map(cat => cat.name.toLowerCase()));
                const toAdd = backupCategories.filter(cat => !currentNames.has(cat.name.toLowerCase()));
                previewHtml = `<div class="preview-summary">Keep <span class="preview-count">${currentCategories.length}</span> current + add <span class="preview-count">${toAdd.length}</span> new = <span class="preview-count">${currentCategories.length + toAdd.length}</span> total</div>`;
                break;
                
            case 'merge-rename':
                previewHtml = `<div class="preview-summary">Keep <span class="preview-count">${currentCategories.length}</span> current + add <span class="preview-count">${backupCategories.length}</span> backup = <span class="preview-count">${currentCategories.length + backupCategories.length}</span> total</div>`;
                break;
        }
        
        const previewElement = document.querySelector(`[data-mode-content="${mode}"] .mode-preview`);
        if (previewElement) {
            previewElement.innerHTML = previewHtml;
        }
    },

    updateWarningMessage: () => {
        const restoreMode = document.querySelector('input[name="restore-mode"]:checked')?.value || 'replace';
        const warningElement = $('#backup-warning');
        
        // Skip if using new tab design (warnings are built into tabs)
        if (!warningElement) return;
        
        switch (restoreMode) {
            case 'replace':
                warningElement.innerHTML = '<strong>WARNING:</strong> This will REPLACE all your current categories with the ones from the backup file. This action cannot be undone.';
                break;
            case 'merge-skip':
                warningElement.innerHTML = '<strong>INFO:</strong> Your existing categories will be kept. New categories from backup will be added, duplicates will be skipped.';
                warningElement.className = 'info-message';
                break;
            case 'merge-rename':
                warningElement.innerHTML = '<strong>INFO:</strong> Your existing categories will be kept. All backup categories will be added, duplicates will be renamed with "(imported)" suffix.';
                warningElement.className = 'info-message';
                break;
        }
    },

    /**
     * Cancel backup restoration and return to file selection with clean state
     */
    cancelBackupRestore: () => {
        // Clear all backup state completely
        Events.clearBackupState();
        // Return to file selection step with clean state
        Events.showBackupStep('file-selection');
    },

    /**
     * Wire up the calendar subscriptions modal.
     */
    setupSubscriptions: () => {
        const onClick = (selector, handler) => {
            const el = $(selector);
            if (el) el.addEventListener('click', handler);
        };
        const backToList = () => {
            UI.populateSubscriptionList();
            UI.switchModalView('ics-subscriptions-modal', '#subscription-list-view');
        };

        onClick('#add-subscription-btn', () => UI.openSubscriptionEditor());
        onClick('#subscription-settings-btn', () => UI.openSubscriptionSettings());
        onClick('#subscription-editor-back-btn', backToList);
        onClick('#subscription-cancel-btn', backToList);
        onClick('#subscription-settings-back-btn', backToList);
        onClick('#subscription-settings-cancel-btn', backToList);

        onClick('#subscription-refresh-all-btn', async () => {
            const subscriptions = Sync.getSubscriptions().filter(s => s.enabled !== false);
            if (!subscriptions.length) {
                UI.showSyncStatus('Nothing to refresh.', 'info');
                return;
            }
            UI.showSyncStatus(`Refreshing ${subscriptions.length} calendar${subscriptions.length === 1 ? '' : 's'}…`, 'info');
            const results = await Sync.syncAll();
            UI.populateSubscriptionList();
            UI.rebuild();
            const failed = results.filter(r => !r.ok).length;
            UI.showSyncStatus(
                failed ? `${results.length - failed} synced, ${failed} failed.` : `All ${results.length} synced.`,
                failed ? 'error' : 'ok'
            );
        });

        onClick('#subscription-delete-btn', () => {
            const id = $('#subscription-id-input').value;
            if (!id) return;
            Events.handleDeleteSubscription(id);
            UI.switchModalView('ics-subscriptions-modal', '#subscription-list-view');
        });

        // Provider chips swap the URL hint for provider-specific directions.
        const PROVIDER_HELP = {
            google: '<strong>Google Calendar:</strong> Settings → <em>Settings for my calendars</em> → pick the calendar → <em>Integrate calendar</em> → copy <em>Secret address in iCal format</em>.',
            outlook: '<strong>Outlook / Microsoft 365:</strong> Settings → <em>Calendar</em> → <em>Shared calendars</em> → <em>Publish a calendar</em> → copy the <em>ICS</em> link.',
            icloud: '<strong>Apple iCloud:</strong> In Calendar, click the share icon next to the calendar → enable <em>Public Calendar</em> → copy the <code>webcal://</code> link (pasting it here converts it automatically).'
        };
        $$('.provider-chip').forEach(chip => {
            chip.addEventListener('click', () => {
                $$('.provider-chip').forEach(c => c.classList.toggle('active', c === chip));
                const hint = $('#subscription-url-hint');
                if (hint) hint.innerHTML = PROVIDER_HELP[chip.dataset.provider] || '';
            });
        });

        // Test the proxy with a known-public Google feed. Google feeds have no
        // CORS headers, so success proves the proxy is doing its job.
        onClick('#subscription-test-proxy-btn', async () => {
            const resultEl = $('#proxy-test-result');
            const template = $('#subscription-proxy-input').value.trim();
            const show = (msg, kind) => {
                resultEl.textContent = msg;
                resultEl.className = `proxy-test-result ${kind}`;
                resultEl.style.display = 'block';
            };
            if (!template) { show('Enter a proxy URL first.', 'error'); return; }

            const SAMPLE = 'https://calendar.google.com/calendar/ical/en.usa%23holiday%40group.v.calendar.google.com/public/basic.ics';
            const testUrl = Sync.buildProxyUrl(SAMPLE, template);

            show('Testing…', 'info');
            try {
                const res = await fetch(testUrl, { headers: { 'Accept': 'text/calendar' } });
                if (!res.ok) { show(`Proxy responded with HTTP ${res.status}.`, 'error'); return; }
                const text = await res.text();
                if (/BEGIN:VCALENDAR/i.test(text)) {
                    show('✓ Proxy works — fetched a Google calendar through it.', 'ok');
                } else {
                    show('Reached the proxy, but it did not return calendar data. Check the {url} placement.', 'error');
                }
            } catch (err) {
                show('Could not reach the proxy (network or CORS error). Check the URL and your worker’s ALLOWED_ORIGINS.', 'error');
            }
        });

        const editorForm = $('#subscription-editor-form');
        if (editorForm) editorForm.addEventListener('submit', Events.handleSubscriptionFormSubmit);

        const settingsForm = $('#subscription-settings-form');
        if (settingsForm) settingsForm.addEventListener('submit', Events.handleSubscriptionSettingsSubmit);

        // Row actions are delegated because the list is re-rendered on every change.
        const container = $('#subscription-list-container');
        if (container) {
            container.addEventListener('click', (e) => {
                const syncBtn = e.target.closest('[data-sync-subscription]');
                if (syncBtn) { Events.handleSyncSubscription(syncBtn.dataset.syncSubscription); return; }

                const editBtn = e.target.closest('[data-edit-subscription]');
                if (editBtn) { UI.openSubscriptionEditor(editBtn.dataset.editSubscription); return; }

                const deleteBtn = e.target.closest('[data-delete-subscription]');
                if (deleteBtn) { Events.handleDeleteSubscription(deleteBtn.dataset.deleteSubscription); }
            });
        }
    },

    /**
     * Setup all event listeners
     */
    setup: () => {
        Events.setupSubscriptions();

        const isAnyTouch = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0);
        if (isAnyTouch) {
            document.body.classList.add('is-touch-device');
        }
        let currentPointerType = isAnyTouch ? 'touch' : 'mouse';

        // Prevent mobile long-press context menu on draggable cards (stats + category list)
        if (isAnyTouch) {
            document.addEventListener('contextmenu', (ev) => {
                const inDraggableCard = ev.target.closest('.stat-card, .category-list-item');
                if (inDraggableCard) {
                    ev.preventDefault();
                }
            }, { passive: false });
        }

        document.body.addEventListener('pointerdown', e => {
            if (e.pointerType) {
                currentPointerType = e.pointerType;
            }
            // Blur text inputs if clicking/tapping outside to avoid stray carets
            const isFormEl = e.target.closest('input, textarea, select, [contenteditable="true"]');
            if (!isFormEl) {
                const ae = document.activeElement;
                if (ae && (ae.tagName === 'INPUT' || ae.tagName === 'TEXTAREA' || ae.tagName === 'SELECT' || ae.isContentEditable)) {
                    ae.blur();
                }
            }
        }, true);

        // Ensure Help opens on mobile (multiple approaches for maximum compatibility)
        const helpBtn = document.getElementById('help-btn');
        if (helpBtn) {
            let touchHandled = false;
            
            const openHelp = (ev, source) => {
                ev.preventDefault();
                ev.stopPropagation();
                UI.showModal('help-modal', true);
            };
            
            // Approach 1: Direct event listeners with multiple fallbacks
            // Handle pointer events (modern approach)
            if ('PointerEvent' in window) {
                helpBtn.addEventListener('pointerup', (ev) => {
                    if (ev.pointerType === 'touch') {
                        touchHandled = true;
                        openHelp(ev, 'pointer');
                    }
                }, { passive: false });
            }
            
            // Handle touch events (older devices)
            helpBtn.addEventListener('touchend', (ev) => {
                if (!touchHandled) {
                    touchHandled = true;
                    openHelp(ev, 'touch');
                }
            }, { passive: false });
            
            // Handle click events (mouse and fallback)
            helpBtn.addEventListener('click', (ev) => {
                if (!touchHandled) {
                    openHelp(ev, 'click');
                }
                // Reset touch handled state
                setTimeout(() => { touchHandled = false; }, 100);
            });
            
            // Reset touch state periodically to prevent stuck state
            helpBtn.addEventListener('touchstart', () => {
                touchHandled = false;
            }, { passive: true });
        }
        
        // Approach 2: Body-level event delegation as additional fallback
        document.body.addEventListener('touchend', (ev) => {
            if (ev.target && ev.target.id === 'help-btn') {
                ev.preventDefault();
                ev.stopPropagation();
                UI.showModal('help-modal', true);
            }
        }, { passive: false });

        // Setup touch handling for calendar buttons (similar approach to help button)
        Events.setupCalendarButtonTouchHandling();

        // Main click event handler
        document.body.addEventListener('click', e => {
            const isDragging = getState.isDragging();
            if (isDragging) return;
            const target = e.target;
            const closest = (selector) => target.closest(selector);

            // Day peek: tapping a day with synced events lists their titles and
            // times; tapping anywhere else dismisses it.
            const peekDay = closest('.day');
            if (peekDay && peekDay.dataset.hasDetails) {
                UI.showDayPeek(peekDay);
            } else if (!closest('#day-peek')) {
                UI.closeDayPeek();
            }

            // Close date dropdown if clicking outside
            if (!closest('.date-dropdown-wrapper')) {
                document.querySelectorAll('.date-dropdown-menu').forEach(menu => {
                    menu.style.display = 'none';
                });
            }

            // Calendar button handling moved to setupCalendarButtonTouchHandling() for iOS compatibility

            const modalCloseBtn = closest('[data-close-modal]');
            if (modalCloseBtn) { UI.showModal(modalCloseBtn.dataset.closeModal, false); return; }

            if (closest('#editor-close-btn, #category-editor-back-btn, #editor-cancel-btn')) {
                $('#manage-plan-modal .modal-content').classList.remove('medium');
                UI.populateCategoryList();
                UI.switchModalView('manage-plan-modal', '#category-list-view');
                return;
            }

            if (closest('#import-modal-back-btn, .import-main-cancel')) { 
                Events.resetImportModal();
                UI.showModal('import-text-modal', false); 
                UI.showModal('manage-plan-modal', true); 
                return; 
            }
            if (closest('#import-confirmation-back-btn, .import-confirm-cancel')) { UI.switchModalView('import-text-modal', '#import-main-view'); return; }
            if (closest('#parsed-event-editor-back-btn')) { 
                UI.showModal('edit-parsed-event-modal', false); 
                UI.showModal('import-text-modal', true); 
                UI.switchModalView('import-text-modal', '#import-confirmation-view');
                return; 
            }
            if (closest('#manage-categories-back-btn')) {
                UI.showModal('manage-plan-modal', false);
                return;
            }

            if (closest('#manage-plan-btn')) { 
                Events.handleManagePlan();
            }
            // Export backup button
            if (closest('#backup-data-btn')) { 
                Events.handleBackupData(); 
            }
            if (closest('#import-from-text-btn')) { 
                UI.showModal('manage-plan-modal', false); 
                Events.resetImportModal();
                UI.showModal('import-text-modal', true); 
            }
            
            // Import Data modal options
            if (closest('#import-from-text-card')) {
                Events.expandImportTextSection();
                return;
            }
            if (closest('#import-from-backup-card')) {
                Events.collapseImportSection(); // Close text section if open
                Events.handleRestoreData();
                return;
            }
            
            // Backup workflow buttons
            if (closest('#confirm-backup-restore-btn')) {
                Events.confirmBackupRestore();
                return;
            }
            if (closest('#cancel-backup-restore-btn')) {
                Events.cancelBackupRestore();
                return;
            }
            if (closest('#backup-done-btn')) {
                // Reset the modal for next time
                Events.resetImportModal();
                UI.showModal('import-text-modal', false);
                UI.showModal('manage-plan-modal', true);
                return;
            }
            if (closest('#clear-selected-file')) {
                Events.clearBackupState();
                return;
            }
            
            // Restore mode tab selection
            if (closest('.mode-tab')) {
                const tab = closest('.mode-tab');
                const mode = tab.dataset.mode;
                Events.switchRestoreMode(mode);
                return;
            }
            
            // Restore mode radio button change (legacy support)
            if (closest('input[name="restore-mode"]')) {
                Events.updateBackupPreview();
                Events.updateWarningMessage();
                return;
            }
            
            // File upload area click
            if (closest('#backup-file-upload')) {
                const fileInput = $('#backup-file-input');
                if (fileInput) {
                    fileInput.click();
                }
                return;
            }
            
            if (closest('#toggle-stats-btn')) { Events.handleStatsToggle(); }
            // Help button is handled by direct event listeners above
            
            // Emoji picker button
            if (closest('.emoji-picker-btn')) {
                e.preventDefault();
                const button = closest('.emoji-picker-btn');
                const inputId = button.id.replace('-emoji-picker-btn', '-emoji-input');
                UI.showEmojiPickerModal(inputId);
            }
            
            // Template picker button
            if (closest('.template-picker-btn')) {
                e.preventDefault();
                const button = closest('.template-picker-btn');
                UI.showTemplatePickerModal();
            }
            
            // Template card selection in modal
            if (closest('.template-picker-card')) {
                const card = closest('.template-picker-card');
                const template = JSON.parse(card.dataset.template);
                UI.applyTemplateToForm(template);
                UI.showModal('template-picker-modal', false);
            }
            
            // Emoji button selection in modal
            if (closest('.emoji-btn') && $('#emoji-picker-modal').classList.contains('visible')) {
                const emojiBtn = closest('.emoji-btn');
                const emoji = emojiBtn.dataset.emoji;
                const targetInput = $(`#${UI.currentEmojiInputId}`);
                
                if (targetInput && emoji) {
                    const currentValue = targetInput.value;
                    const newValue = currentValue.length > 0 ? currentValue + emoji : emoji;
                    
                    // Limit to 10 characters  
                    if (newValue.length <= 10) {
                        targetInput.value = newValue;
                        targetInput.dispatchEvent(new Event('input', { bubbles: true }));
                        
                        // Track emoji usage
                        Utils.trackEmojiUsage(emoji);
                    }
                }
                
                UI.showModal('emoji-picker-modal', false);
            }
            
            // Emoji input double-click to show picker (single click just focuses/positions cursor)
            if (closest('.emoji-input') && e.detail === 2) { // Double click
                const emojiInput = closest('.emoji-input');
                const button = emojiInput.parentElement.querySelector('.emoji-picker-btn');
                if (button) {
                    const inputId = emojiInput.id;
                    UI.showEmojiPickerModal(inputId);
                }
            }
            if (closest('#home-year-btn')) { setState.currentYear(new Date().getFullYear()); UI.rebuild(); }
            if (closest('#prev-year-btn, #nav-prev-btn')) { 
                const isYearView = $('#year-overview-btn').classList.contains('active');
                if (isYearView) {
                    setState.currentYear(getState.currentYear() - 1);
                    UI.rebuild();
                } else {
                    // Month view: navigate by month
                    let newMonth = getState.currentMonth() - 1;
                    let newYear = getState.currentYear();
                    if (newMonth < 0) {
                        newMonth = 11;
                        newYear--;
                    }
                    setState.currentMonth(newMonth);
                    setState.currentYear(newYear);
                    UI.rebuild();
                }
                Events.updateNavigationDisplay();
            }
            if (closest('#next-year-btn, #nav-next-btn')) { 
                const isYearView = $('#year-overview-btn').classList.contains('active');
                if (isYearView) {
                    setState.currentYear(getState.currentYear() + 1);
                    UI.rebuild();
                } else {
                    // Month view: navigate by month
                    let newMonth = getState.currentMonth() + 1;
                    let newYear = getState.currentYear();
                    if (newMonth > 11) {
                        newMonth = 0;
                        newYear++;
                    }
                    setState.currentMonth(newMonth);
                    setState.currentYear(newYear);
                    UI.rebuild();
                }
                Events.updateNavigationDisplay();
            }
            if (closest('#today-btn')) {
                setState.currentYear(new Date().getFullYear());
                setState.currentMonth(new Date().getMonth());
                setState.activeFilter('all');
                closest('#today-btn').classList.add('active');
                UI.rebuild(true);
                // Prefer the cell inside the current month (not the faded spillover)
                let todayEl = document.querySelector('.day.today:not(.other-month)');
                if (!todayEl) todayEl = document.querySelector('.day.today');
                if (todayEl) todayEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
                // Briefly highlight Today button for feedback
                setTimeout(() => {
                    const tb = $('#today-btn');
                    if (tb) tb.classList.remove('active');
                }, 1000);
            }
            if (closest('#theme-toggle-btn')) { 
                Events.handleThemeToggle(); 
            }

            if (closest('#add-new-category-btn, #add-new-stat-btn')) { UI.openCategoryEditor(); return; }
            const editBtn = closest('[data-edit-id]');
            if (editBtn) { UI.openCategoryEditor(editBtn.dataset.editId); return; }
            const duplicateBtn = closest('[data-duplicate-id]');
            if (duplicateBtn) { UI.openCategoryEditor(duplicateBtn.dataset.duplicateId, true); return; }
            const deleteBtn = closest('[data-delete-id]');
            if (deleteBtn) {
                const config = getState.config();
                const categoryToDelete = config.eventCategories.find(c => c.id === deleteBtn.dataset.deleteId);
                if (categoryToDelete) {
                    if (categoryToDelete.type === 'ics') {
                        // Removing only the category would leave the subscription
                        // behind to re-create it on the next sync — unsubscribe
                        // properly (with its own undo) instead.
                        Events.handleDeleteSubscription(categoryToDelete.id);
                        UI.populateCategoryList();
                        return;
                    }
                    UI.createCategoryUndo(categoryToDelete);
                    config.eventCategories = config.eventCategories.filter(c => c.id !== deleteBtn.dataset.deleteId);
                    setState.config(config);
                    Store.save();
                    UI.populateCategoryList();
                    UI.rebuild();
                }
                return;
            }
            if (closest('#delete-category-btn')) {
                const categoryId = $('#category-id-input').value;
                if (categoryId) {
                    const config = getState.config();
                    const categoryToDelete = config.eventCategories.find(c => c.id === categoryId);
                    if (categoryToDelete) {
                        UI.createCategoryUndo(categoryToDelete);
                        config.eventCategories = config.eventCategories.filter(c => c.id !== categoryId);
                        setState.config(config);
                        Store.save();
                        setState.activeFilter('all');
                        UI.populateCategoryList();
                        UI.switchModalView('manage-plan-modal', '#category-list-view');
                        UI.rebuild();
                    }
                }
                return;
            }

            // Date buttons expand toggle
            if (closest('.date-expand-btn')) {
                const wrapper = closest('.date-buttons-wrapper');
                const expandedSection = wrapper.querySelector('.date-buttons-expanded');
                const expandBtn = wrapper.querySelector('.date-expand-btn');
                
                if (expandedSection.style.display === 'none' || !expandedSection.style.display) {
                    expandedSection.style.display = 'flex';
                    expandBtn.textContent = 'Less ▴';
                    expandBtn.classList.remove('btn-gray');
                    expandBtn.classList.add('btn-blue');
                } else {
                    expandedSection.style.display = 'none';
                    expandBtn.textContent = 'More ▾';
                    expandBtn.classList.remove('btn-blue');
                    expandBtn.classList.add('btn-gray');
                }
                return;
            }

            const editorForm = closest('.editor-form');
            if (editorForm) {
                const prefix = editorForm.id.includes('parsed') ? 'parsed' : 'category';
                const container = $(`#${prefix}-date-entries-container`);
                if (closest('.add-date-range-btn')) { UI.addDateEntry('range', '', '', container); return; }
                if (closest('.add-single-date-btn')) { UI.addDateEntry('single', '', '', container); return; }
                if (closest('.bulk-add-every-monday-btn')) { UI.addEveryMonday(container); return; }
                if (closest('.bulk-add-every-friday-btn')) { UI.addEveryFriday(container); return; }
                if (closest('.bulk-add-weekdays-btn')) { UI.addWeekdays(container); return; }
                if (closest('.bulk-add-monthly-btn')) { UI.addMonthly(container); return; }
                if (closest('.bulk-add-today-btn')) { UI.addToday(container); return; }
                if (closest('.bulk-add-tomorrow-btn')) { UI.addTomorrow(container); return; }
                if (closest('.bulk-add-this-weekend-btn')) { UI.addThisWeekend(container); return; }
                if (closest('.bulk-add-next-7days-btn')) { UI.addNext7Days(container); return; }
                if (closest('.bulk-add-work-week-btn')) { UI.addWorkWeek(container); return; }
                if (closest('.bulk-add-current-month-btn')) { UI.addCurrentMonth(container); return; }
                if (closest('.bulk-add-last-week-month-btn')) { UI.addLastWeekOfMonth(container); return; }
                if (closest('.bulk-add-every-weekend-btn')) { UI.addEveryWeekend(container); return; }
                if (closest('.clear-all-dates-btn')) { 
                    UI.createClearAllUndo(container);
                    UI.clearAllDates(container); 
                    return; 
                }
                
                // Handle dropdown items
                if (closest('.dropdown-item')) {
                    // Close dropdown after selection
                    const dropdown = closest('.date-dropdown-menu');
                    dropdown.style.display = 'none';
                }
                
                const detailsToggle = closest('.date-details-toggle');
                if (detailsToggle) {
                    const panel = detailsToggle.closest('.date-entry-item')?.querySelector('.date-entry-details');
                    if (panel) {
                        const show = panel.style.display === 'none';
                        panel.style.display = show ? '' : 'none';
                        detailsToggle.classList.toggle('active', show);
                        detailsToggle.setAttribute('aria-expanded', String(show));
                        if (show) panel.querySelector('.event-title-input')?.focus();
                    }
                    return;
                }
                if (closest('.remove-date-btn')) {
                    const dateItem = closest('.date-entry-item');
                    const container = dateItem.closest('.date-entry-container');
                    UI.createDateUndo(dateItem, container);
                    dateItem.remove(); 
                    UI.updateClearAllButton(container);
                    return; 
                }
                const typeToggleButton = closest('.segmented-control button');
                if (typeToggleButton) {
                    const type = typeToggleButton.dataset.type;
                    UI.updateCategoryTypeToggle(typeToggleButton.closest('.segmented-control'), type);
                    UI.toggleCategoryTypeView(prefix, type);
                }
            }

            const importEditBtn = closest('[data-edit-parsed-index]');
            if (importEditBtn) {
                const index = parseInt(importEditBtn.dataset.editParsedIndex);
                const modal = $('#edit-parsed-event-modal');
                modal.dataset.editingIndex = index;
                $('#parsed-editor-fields').innerHTML = UI.getEditorFieldsHTML('parsed');
                UI.populateEditor('parsed', getState.parsedCategoriesCache()[index]);
                modal.querySelector('.modal-content').classList.add('medium');
                UI.showModal('edit-parsed-event-modal');
                return;
            }
            const importDuplicateBtn = closest('[data-duplicate-parsed-index]');
            if (importDuplicateBtn) {
                const index = parseInt(importDuplicateBtn.dataset.duplicateParsedIndex);
                const parsedCategoriesCache = getState.parsedCategoriesCache();
                const original = parsedCategoriesCache[index];
                const newCategory = JSON.parse(JSON.stringify(original));
                newCategory.name += ' - Copy';
                newCategory.id = `parsed-${Date.now()}-${Math.random()}`;
                newCategory.isDuplicate = Logic.checkForDuplicate(newCategory);
                parsedCategoriesCache.splice(index + 1, 0, newCategory);
                setState.parsedCategoriesCache(parsedCategoriesCache);
                UI.renderParsedCategories();
                UI.updateImportButtonState();
                return;
            }
            const importDeleteBtn = closest('[data-delete-parsed-index]');
            if (importDeleteBtn) {
                const index = parseInt(importDeleteBtn.dataset.deleteParsedIndex);
                const parsedCategoriesCache = getState.parsedCategoriesCache();
                parsedCategoriesCache.splice(index, 1);
                setState.parsedCategoriesCache(parsedCategoriesCache);
                UI.renderParsedCategories();
                UI.updateImportButtonState();
                return;
            }
        });

        // Close dropdowns when clicking outside
        const openDropdown = $('.dropdown-menu.show');
        if (openDropdown && !closest('.dropdown')) {
            openDropdown.classList.remove('show');
        }

        // Stats container event handlers
        const statsContainer = $('#stats');
        if (statsContainer) {
            let clickTimeout = null;

            statsContainer.addEventListener('click', e => {
                const isDragging = getState.isDragging();
                if (isDragging) return;

                const card = e.target.closest('.stat-card[data-filter]:not(.stat-card-add)');
                if (!card) return;

                if (e.target.closest('.edit-stat-btn')) {
                    UI.openCategoryEditor(card.dataset.filter);
                    return;
                }

                if (currentPointerType === 'mouse') {
                    clearTimeout(clickTimeout);
                    clickTimeout = setTimeout(() => {
                        setState.activeFilter(card.dataset.filter);
                        UI.rebuild();
                    }, 200);
                } else { // For 'touch' and 'pen'
                    setState.activeFilter(card.dataset.filter);
                    UI.rebuild();
                }
            });

            statsContainer.addEventListener('dblclick', e => {
                if (currentPointerType !== 'mouse') return;
                const isDragging = getState.isDragging();
                if (isDragging) return;
                clearTimeout(clickTimeout);

                const card = e.target.closest('.stat-card[data-filter]:not(.stat-card-add,.overview-card)');
                if (card) {
                    UI.openCategoryEditor(card.dataset.filter);
                }
            });
        }

        // Form event listeners
        $('#category-editor-form').addEventListener('submit', Events.handleCategoryFormSubmit);
        $('#parsed-event-editor-form').addEventListener('submit', Events.handleParsedEventFormSubmit);
        $('#parse-import-btn').addEventListener('click', Events.handleParseImport);
        $('#confirm-import-btn').addEventListener('click', Events.handleConfirmImport);
        // Walkthrough button - use more robust selector
        const walkthroughBtn = document.getElementById('start-walkthrough-btn');
        if (walkthroughBtn) {
            walkthroughBtn.addEventListener('click', (e) => {
                e.preventDefault();
                console.log('Walkthrough button clicked');
                Events.startWalkthrough();
            });
        } else {
            console.warn('Walkthrough button not found');
        }

        // Backup file input handler
        $('#backup-file-input').addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) {
                Events.handleBackupFileSelection(file);
            }
        });

        // Drag and drop for backup file upload
        const fileUploadArea = $('#backup-file-upload');
        if (fileUploadArea) {
            fileUploadArea.addEventListener('dragover', (e) => {
                e.preventDefault();
                e.stopPropagation();
                fileUploadArea.classList.add('drag-over');
            });

            fileUploadArea.addEventListener('dragleave', (e) => {
                e.preventDefault();
                e.stopPropagation();
                fileUploadArea.classList.remove('drag-over');
            });

            fileUploadArea.addEventListener('drop', (e) => {
                e.preventDefault();
                e.stopPropagation();
                fileUploadArea.classList.remove('drag-over');
                
                const files = e.dataTransfer.files;
                if (files.length > 0) {
                    const file = files[0];
                    if (file.type === 'application/json' || file.name.endsWith('.json')) {
                        Events.handleBackupFileSelection(file);
                    } else {
                        $('#backup-error-message').textContent = 'Please select a JSON backup file.';
                        $('#backup-error-message').style.display = 'block';
                    }
                }
            });
        }

        // Color input handler
        document.body.addEventListener('input', e => {
            if (e.target.matches('input[type="color"]')) {
                const container = e.target.closest('.color-input-container');
                if (container) container.querySelector('.color-preview-swatch').style.backgroundColor = e.target.value;
            }
        });

        // Category name input handlers
        document.body.addEventListener('focus', e => {
            if (e.target.matches('.name-input')) {
                UI.showNameSuggestions(e.target);
            }
        }, true);

        document.body.addEventListener('input', e => {
            if (e.target.matches('.name-input')) {
                UI.showNameSuggestions(e.target);
            }
        });

        document.body.addEventListener('blur', e => {
            if (e.target.matches('.name-input')) {
                UI.hideNameSuggestions(e.target);
            }
        }, true);

        // Emoji input handlers
        document.body.addEventListener('focus', e => {
            if (e.target.matches('.emoji-input')) {
                // Only select all text if the field is empty (for easy first emoji selection)
                if (!e.target.value.trim()) {
                    e.target.select();
                } else {
                    // Position cursor at the end for adding more emojis
                    setTimeout(() => {
                        e.target.setSelectionRange(e.target.value.length, e.target.value.length);
                    }, 10);
                }
            }
        }, true);

        document.body.addEventListener('input', e => {
            if (e.target.matches('.emoji-input')) {
                // Validate that only emoji-like characters are entered
                const value = e.target.value;
                const maxLength = parseInt(e.target.getAttribute('maxlength')) || 10;
                
                // Allow emoji characters and some common symbols, but respect maxlength
                if (value.length > maxLength) {
                    e.target.value = value.slice(0, maxLength);
                }
            }
        });

        document.body.addEventListener('keydown', e => {
            if (e.target.matches('.emoji-input')) {
                // Allow common keys: Backspace, Delete, Arrow keys, Tab, Enter
                const allowedKeys = ['Backspace', 'Delete', 'ArrowLeft', 'ArrowRight', 'Tab', 'Enter', 'Escape'];
                if (allowedKeys.includes(e.key)) {
                    return;
                }
                // Allow Ctrl/Cmd combinations (copy, paste, etc.)
                if (e.ctrlKey || e.metaKey) {
                    return;
                }
                // For other keys, don't prevent default to allow emoji input
            }
        });

        // Category search handler
        $('#category-search-input').addEventListener('input', e => {
            const searchTerm = e.target.value;
            const clearBtn = $('#category-search-clear');
            clearBtn.style.display = searchTerm.length > 0 ? 'flex' : 'none';
            UI.populateCategoryList(searchTerm);
        });


        // Category search clear handler
        $('#category-search-clear').addEventListener('click', () => {
            const searchInput = $('#category-search-input');
            const clearBtn = $('#category-search-clear');
            searchInput.value = '';
            clearBtn.style.display = 'none';
            UI.populateCategoryList('');
            searchInput.focus();
        });

        // Category sort handler
        $('#category-sort-select').addEventListener('change', () => {
            const searchTerm = $('#category-search-input').value;
            UI.populateCategoryList(searchTerm);
        });

        // Import checkbox handlers
        $('#import-select-all').addEventListener('change', e => {
            // Only affect non-duplicate items
            $$('.import-checkbox').forEach(checkbox => {
                const card = checkbox.closest('.import-preview-card');
                if (!card.classList.contains('is-duplicate')) {
                    checkbox.checked = e.target.checked;
                }
            });
            UI.updateImportButtonState();
        });
        $('#import-confirmation-summary').addEventListener('change', e => {
            if(e.target.classList.contains('import-checkbox')) {
                UI.updateImportButtonState();
            }
        });

        // Sortable setup with improved mobile/stylus support
        let sortableInstance;
        if (statsContainer && typeof Sortable !== 'undefined') {
            const isTouchDevice = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0);
            
            sortableInstance = new Sortable(statsContainer, {
                animation: 150,
                filter: '.stat-card-add, .overview-card, .edit-stat-btn',
                preventOnFilter: true,
                ghostClass: 'sortable-ghost',
                chosenClass: 'sortable-chosen',
                dragClass: 'sortable-drag',
                // Better mobile/touch configuration
                delay: isTouchDevice ? 200 : 0,
                delayOnTouchStart: true,
                touchStartThreshold: 10,
                forceFallback: isTouchDevice,
                fallbackClass: 'sortable-fallback',
                fallbackOnBody: true,
                swapThreshold: 0.65,
                invertSwap: false,
                // Handle different pointer types
                onStart: (evt) => { 
                    setState.isDragging(true);
                    // Add visual feedback for mobile
                    if (isTouchDevice) {
                        evt.item.style.transform = 'scale(1.05)';
                        evt.item.style.opacity = '0.9';
                    }
                },
                onEnd: (evt) => {
                    // Remove visual feedback
                    evt.item.style.transform = '';
                    evt.item.style.opacity = '';
                    
                    setTimeout(() => { setState.isDragging(false); }, 100);

                    const newOrderIds = [...statsContainer.querySelectorAll('.stat-card[data-filter]:not(.overview-card)')].map(el => el.dataset.filter);
                    const config = getState.config();
                    config.eventCategories.sort((a, b) => {
                        const indexA = newOrderIds.indexOf(a.id);
                        const indexB = newOrderIds.indexOf(b.id);
                        return indexA - indexB;
                    });
                    setState.config(config);
                    Store.save();
                    
                    // Set manage categories sort to custom order to show the new arrangement
                    const sortSelect = $('#category-sort-select');
                    if (sortSelect) {
                        sortSelect.value = 'custom';
                    }
                    
                    UI.rebuild();

                    const overviewCard = $('.overview-card');
                    if (overviewCard) {
                        statsContainer.prepend(overviewCard);
                    }
                    const addCard = $('#add-new-stat-btn');
                    if (addCard) {
                        statsContainer.appendChild(addCard);
                    }
                }
            });
        }

        // Category list sortable setup with persistence and mobile optimization
        const categoryListContainer = $('#category-list-container');
        if (categoryListContainer && typeof Sortable !== 'undefined') {
            const isTouchDevice = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0);
            
            new Sortable(categoryListContainer, {
                animation: 150,
                ghostClass: 'sortable-ghost',
                chosenClass: 'sortable-chosen',
                dragClass: 'sortable-drag',
                // Mobile optimizations
                delay: isTouchDevice ? 200 : 0,
                delayOnTouchStart: true,
                touchStartThreshold: 10,
                forceFallback: isTouchDevice,
                fallbackClass: 'sortable-fallback',
                fallbackOnBody: true,
                swapThreshold: 0.65,
                onStart: (evt) => { 
                    setState.isDragging(true);
                    // Visual feedback for mobile
                    if (isTouchDevice) {
                        evt.item.style.transform = 'scale(1.02)';
                        evt.item.style.opacity = '0.9';
                    }
                },
                onEnd: (evt) => {
                    // Remove visual feedback
                    evt.item.style.transform = '';
                    evt.item.style.opacity = '';
                    
                    setTimeout(() => { setState.isDragging(false); }, 100);

                    const newOrderIds = [...categoryListContainer.querySelectorAll('.category-list-item[data-id]')].map(el => el.dataset.id);
                    const config = getState.config();
                    config.eventCategories.sort((a, b) => {
                        const indexA = newOrderIds.indexOf(a.id);
                        const indexB = newOrderIds.indexOf(b.id);
                        return indexA - indexB;
                    });
                    setState.config(config);
                    Store.save();
                    
                    // Set sort dropdown to custom order to reflect the drag-and-drop arrangement
                    const sortSelect = $('#category-sort-select');
                    if (sortSelect) {
                        sortSelect.value = 'custom';
                    }
                    
                    UI.rebuild();
                }
            });
        }

        // Calendar double-click functionality
        document.body.addEventListener('dblclick', e => {
            const dayElement = e.target.closest('.day');
            if (!dayElement || dayElement.classList.contains('other-month')) return;
            
            const dateStr = dayElement.dataset.date;
            const activities = dayElement.dataset.activities;
            
            if (activities && activities.trim()) {
                // Date has events - open edit modal for first category
                const activityIds = activities.split(',');
                const config = getState.config();
                const firstCategory = config.eventCategories.find(cat => cat.id === activityIds[0]);
                
                if (firstCategory) {
                    UI.openCategoryEditor(firstCategory.id);
                    UI.showModal('manage-plan-modal', true);
                }
            } else {
                // Empty date - open add new category modal with pre-filled date
                UI.openCategoryEditor();
                
                // Add a single date entry and pre-fill it with the clicked date
                setTimeout(() => {
                    const dateContainer = $('#category-date-entries-container');
                    if (dateContainer && dateContainer.children.length === 0) {
                        // Format date as DD-MM-YYYY for the input
                        const dateObj = new Date(dateStr + 'T12:00:00Z');
                        const formattedDate = `${String(dateObj.getUTCDate()).padStart(2, '0')}-${String(dateObj.getUTCMonth() + 1).padStart(2, '0')}-${dateObj.getUTCFullYear()}`;
                        
                        // Add a single date entry with the pre-filled date
                        UI.addDateEntry('single', formattedDate, '', dateContainer);
                    }
                }, 100);
            }
        });

        // Theme toggle (moved to FAB, but keep the core logic for reuse)
        Events.handleThemeToggle = () => {
            const currentTheme = document.documentElement.getAttribute('data-theme') || 'light';
            const newTheme = currentTheme === 'light' ? 'midnight' : 'light';
            Events.setThemeInstant(newTheme);
            Store.saveTheme(newTheme);
            UI.updateThemeControl(newTheme);
        };

        // Stats toggle (moved to FAB, but keep the core logic for reuse)
        Events.handleStatsToggle = () => {
            const statsEl = $('#stats');
            if (!statsEl) return;
            const isHidden = statsEl.classList.toggle('hidden');
            setState.statsHidden(isHidden);
            const statsBtn = $('#stats-btn-text');
            if (statsBtn) {
                statsBtn.textContent = isHidden ? 'Show Stats' : 'Hide Stats';
            }
            // persist across sessions
            try { Store.saveStatsHidden(isHidden); } catch (e) {}
        };

        // Manage plan (moved to FAB, but keep the core logic for reuse)
        Events.handleManagePlan = () => {
            $('#category-search-input').value = '';
            UI.populateCategoryList();
            UI.switchModalView('manage-plan-modal', '#category-list-view');
            UI.showModal('manage-plan-modal', true);
        };

        // Enhanced scroll to top button
        const scrollToTopBtn = $('#scroll-to-top');
        if (scrollToTopBtn) {
            scrollToTopBtn.addEventListener('click', () => {
                window.scrollTo({ top: 0, behavior: 'smooth' });
            });

            // Show/hide based on scroll position with smooth fade
            let scrollTimeout;
            window.addEventListener('scroll', () => {
                clearTimeout(scrollTimeout);
                
                if (window.scrollY > 300) {
                    scrollToTopBtn.style.display = 'flex';
                    // Force reflow then show
                    scrollToTopBtn.offsetHeight;
                    scrollToTopBtn.style.opacity = '0.9';
                } else {
                    scrollToTopBtn.style.opacity = '0';
                    // Only hide after fade completes and scroll has stopped
                    scrollTimeout = setTimeout(() => {
                        if (window.scrollY <= 300) {
                            scrollToTopBtn.style.display = 'none';
                        }
                    }, 350);
                }
            });
        }

        // Multi-function floating action button
        const fabContainer = $('#fab-container');
        const fabToggle = $('#fab-toggle');
        const fabMain = $('.fab-main');
        const fabAddCategory = $('#fab-add-category');
        const fabManagePlan = $('#fab-manage-plan');
        const fabImport = $('#fab-import');
        const fabExport = $('#fab-export');
        const fabStatsToggle = $('#fab-stats-toggle');
        const fabThemeToggle = $('#fab-theme-toggle');
        const fabGradientThemes = $('#fab-gradient-themes');
        const fabHelp = $('#fab-help');

        if (fabContainer && fabToggle) {
            // Close FAB menu when clicking outside
            document.addEventListener('click', (e) => {
                if (!fabContainer.contains(e.target) && fabToggle.checked) {
                    fabToggle.checked = false;
                }
            });

            // Clicking a row (icon or label) triggers its action
            const fabRows = [...$$('.fab-item-row')];
            fabRows.forEach(row => {
                const trigger = () => {
                    const btn = row.querySelector('.fab-item');
                    if (btn) btn.click();
                };
                row.addEventListener('click', (e) => {
                    // Avoid double-trigger when clicking directly on the icon button
                    if (e.target.closest('.fab-item')) return;
                    trigger();
                });
                row.addEventListener('keydown', (e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        trigger();
                    }
                });
            });

            // FAB item actions
            if (fabAddCategory) {
                fabAddCategory.addEventListener('click', () => {
                    fabToggle.checked = false;
                    UI.openCategoryEditor();
                });
            }

            if (fabManagePlan) {
                fabManagePlan.addEventListener('click', () => {
                    fabToggle.checked = false;
                    Events.handleManagePlan();
                });
            }

            if (fabImport) {
                fabImport.addEventListener('click', () => {
                    fabToggle.checked = false;
                    UI.showModal('import-text-modal', true);
                });
            }

            if (fabExport) {
                fabExport.addEventListener('click', () => {
                    fabToggle.checked = false;
                    Events.handleBackupData();
                });
            }

            const fabSubscriptions = $('#fab-subscriptions');
            if (fabSubscriptions) {
                fabSubscriptions.addEventListener('click', () => {
                    fabToggle.checked = false;
                    Events.handleOpenSubscriptions();
                });
            }

            if (fabStatsToggle) {
                fabStatsToggle.addEventListener('click', () => {
                    fabToggle.checked = false;
                    Events.handleStatsToggle();
                });
            }

            if (fabThemeToggle) {
                fabThemeToggle.addEventListener('click', () => {
                    fabToggle.checked = false;
                    Events.handleThemeToggle();
                });
            }

            if (fabGradientThemes) {
                fabGradientThemes.addEventListener('click', () => {
                    fabToggle.checked = false;
                    Events.showGradientThemesModal();
                });
            }

            if (fabHelp) {
                fabHelp.addEventListener('click', () => {
                    fabToggle.checked = false;
                    UI.showModal('help-modal', true);
                });
            }
        }

        // Modern view toggle functionality
        const monthViewBtn = $('#month-view-btn');
        const yearOverviewBtn = $('#year-overview-btn');

        if (monthViewBtn && yearOverviewBtn) {
            monthViewBtn.addEventListener('click', () => {
                // Switch to month view
                monthViewBtn.classList.add('active');
                yearOverviewBtn.classList.remove('active');
                setState.currentMonth(new Date().getMonth());
                UI.rebuild();
                Events.updateNavigationDisplay();
                // Simple active state - no indicator needed //('#view-mode-toggle'));
            });

            yearOverviewBtn.addEventListener('click', () => {
                // Switch to year overview using full month calendars (all 12)
                yearOverviewBtn.classList.add('active');
                monthViewBtn.classList.remove('active');
                UI.rebuild();
                Events.updateNavigationDisplay();
                // Simple active state - no indicator needed //('#view-mode-toggle'));
            });
        }

        // Theme segmented toggle (light/sun and dark/moon)
        const themeLightBtn = $('#theme-light-btn');
        const themeDarkBtn = $('#theme-dark-btn');
        if (themeLightBtn && themeDarkBtn) {
            const syncThemeButtons = () => {
                const theme = document.documentElement.getAttribute('data-theme') || 'light';
                const isDark = theme === 'midnight';
                themeLightBtn.classList.toggle('active', !isDark);
                themeDarkBtn.classList.toggle('active', isDark);
                // Simple active state - no indicator needed
            };
            // Initial state
            syncThemeButtons();
            // Click handlers
            themeLightBtn.addEventListener('click', () => {
                Events.setThemeInstant('light');
                Store.saveTheme('light');
                UI.updateThemeControl('light');
                syncThemeButtons();
                // Defer indicator update to let layout settle for smooth animation
                // Simple active state - no indicator needed //('#theme-toggle'));
            });
            themeDarkBtn.addEventListener('click', () => {
                Events.setThemeInstant('midnight');
                Store.saveTheme('midnight');
                UI.updateThemeControl('midnight');
                syncThemeButtons();
                // Simple active state - no indicator needed //('#theme-toggle'));
            });
        }

        // No need for resize handlers with simple active state system

        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            // Undo shortcut
            if (e.ctrlKey && e.key === 'z') {
                e.preventDefault();
                const toast = $('#undo-toast');
                if (toast && toast.style.display === 'block') {
                    const undoBtn = toast.querySelector('#undo-action');
                    if (undoBtn) {
                        undoBtn.click();
                    }
                }
                return;
            }
            
            if (e.key === 'Escape') {
                const peek = document.getElementById('day-peek');
                if (peek) { UI.closeDayPeek(); return; }

                const visibleModals = [...$$('.modal-overlay.visible')].reverse();
                if (visibleModals.length > 0) {
                    const topmostModal = visibleModals[0];

                    if (topmostModal.id === 'edit-parsed-event-modal') {
                        UI.showModal('edit-parsed-event-modal', false);
                    } else if (topmostModal.id === 'import-text-modal') {
                        if ($('#import-confirmation-view').style.display !== 'none') {
                            UI.switchModalView('import-text-modal', '#import-main-view');
                        } else {
                            UI.showModal('import-text-modal', false);
                            UI.showModal('manage-plan-modal', true);
                        }
                    } else if (topmostModal.id === 'manage-plan-modal') {
                        if ($('#category-editor-view').style.display !== 'none') {
                            $('#manage-plan-modal .modal-content').classList.remove('medium');
                            UI.populateCategoryList();
                            UI.switchModalView('manage-plan-modal', '#category-list-view');
                        } else {
                            UI.showModal('manage-plan-modal', false);
                        }
                    } else if (topmostModal.id === 'template-picker-modal') {
                        UI.showModal('template-picker-modal', false);
                        // Re-open the manage modal if it was previously open
                        if ($('#manage-plan-modal').classList.contains('visible')) {
                            UI.showModal('manage-plan-modal', true);
                        }
                    } else if (topmostModal.id === 'emoji-picker-modal') {
                        UI.showModal('emoji-picker-modal', false);
                        // Re-open the manage modal if it was previously open  
                        if ($('#manage-plan-modal').classList.contains('visible')) {
                            UI.showModal('manage-plan-modal', true);
                        }
                    } else {
                        UI.showModal(topmostModal.id, false);
                    }
                }
            }

            // Skip navigation shortcuts if a modal is open, an input is focused, or a modifier is held
            const hasVisibleModal = $$('.modal-overlay.visible').length > 0;
            const active = document.activeElement;
            const isTextEntry = active && (active.tagName === 'INPUT' || active.tagName === 'TEXTAREA' || active.tagName === 'SELECT' || active.isContentEditable);
            if (hasVisibleModal || isTextEntry || e.ctrlKey || e.metaKey || e.altKey) return;

            // Delegate to the nav buttons so shortcuts stay in sync with them:
            // they are view-mode aware (month vs year), refresh the nav display,
            // and Today also resets the filter and scrolls the date into view.
            const shortcutTargets = {
                'ArrowLeft': '#nav-prev-btn, #prev-year-btn',
                'ArrowRight': '#nav-next-btn, #next-year-btn',
                't': '#today-btn',
                'T': '#today-btn'
            };

            const selector = shortcutTargets[e.key];
            if (selector) {
                const btn = $(selector);
                if (btn) {
                    e.preventDefault();
                    btn.click();
                }
            }
        });
    },

    /**
     * Custom Date Picker functionality
     */
    initCustomDatePicker: () => {
        const picker = document.getElementById('custom-date-picker');
        const monthBtn = document.getElementById('date-picker-month-btn');
        const yearBtn = document.getElementById('date-picker-year-btn');
        const monthSelector = document.getElementById('date-picker-month-selector');
        const yearSelector = document.getElementById('date-picker-year-selector');
        const yearsContainer = document.getElementById('date-picker-years');
        const daysContainer = document.getElementById('date-picker-days');
        
        if (!picker) {
            console.error('Custom date picker element not found');
            return;
        }
        
        let currentDate = new Date();
        let selectedDate = null;
        let targetInput = null;

        const monthNames = [
            'January', 'February', 'March', 'April', 'May', 'June',
            'July', 'August', 'September', 'October', 'November', 'December'
        ];

        // Populate years (current year ± 10 years)
        const populateYears = () => {
            const currentYear = new Date().getFullYear();
            yearsContainer.innerHTML = '';
            for (let year = currentYear - 10; year <= currentYear + 10; year++) {
                const button = document.createElement('button');
                button.textContent = year;
                button.dataset.year = year;
                yearsContainer.appendChild(button);
            }
        };

        populateYears();

        const showPicker = (inputElement, initialDate = null) => {
            
            targetInput = inputElement;
            if (initialDate) {
                currentDate = new Date(initialDate);
                selectedDate = new Date(initialDate);
            } else {
                currentDate = new Date();
                selectedDate = null;
            }
            renderCalendar();
            
            // Directly set display and opacity to override inline styles
            picker.style.display = 'flex';
            picker.style.opacity = '0';
            picker.classList.add('visible');
            
            // Smooth fade in
            setTimeout(() => {
                picker.style.opacity = '1';
            }, 10);
        };

        const hidePicker = () => {
            picker.style.opacity = '0';
            setTimeout(() => {
                picker.style.display = 'none';
                picker.classList.remove('visible');
            }, 200);
            targetInput = null;
        };

        const renderCalendar = () => {
            const year = currentDate.getFullYear();
            const month = currentDate.getMonth();
            
            // Update button labels
            monthBtn.textContent = monthNames[month];
            yearBtn.textContent = year;
            
            // Update selected states
            document.querySelectorAll('.date-picker-months button').forEach(btn => {
                btn.classList.toggle('selected', parseInt(btn.dataset.month) === month);
            });
            document.querySelectorAll('.date-picker-years button').forEach(btn => {
                btn.classList.toggle('selected', parseInt(btn.dataset.year) === year);
            });
            
            const firstDay = new Date(year, month, 1);
            const lastDay = new Date(year, month + 1, 0);
            const firstDayOfWeek = firstDay.getDay();
            const daysInMonth = lastDay.getDate();
            
            daysContainer.innerHTML = '';
            
            // Previous month's trailing days
            const prevMonth = new Date(year, month - 1, 0);
            for (let i = firstDayOfWeek - 1; i >= 0; i--) {
                const day = prevMonth.getDate() - i;
                const button = document.createElement('button');
                button.className = 'date-picker-day other-month';
                button.textContent = day;
                button.dataset.date = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                daysContainer.appendChild(button);
            }
            
            // Current month's days
            const today = new Date();
            for (let day = 1; day <= daysInMonth; day++) {
                const button = document.createElement('button');
                button.className = 'date-picker-day';
                button.textContent = day;
                
                const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                button.dataset.date = dateStr;
                
                // Mark today
                if (year === today.getFullYear() && month === today.getMonth() && day === today.getDate()) {
                    button.classList.add('today');
                }
                
                // Mark selected date
                if (selectedDate && year === selectedDate.getFullYear() && 
                    month === selectedDate.getMonth() && day === selectedDate.getDate()) {
                    button.classList.add('selected');
                }
                
                daysContainer.appendChild(button);
            }
            
            // Next month's leading days
            const remainingCells = 42 - daysContainer.children.length;
            for (let day = 1; day <= remainingCells; day++) {
                const button = document.createElement('button');
                button.className = 'date-picker-day other-month';
                button.textContent = day;
                button.dataset.date = `${year}-${String(month + 2).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                daysContainer.appendChild(button);
            }
        };

        // Event listeners
        document.getElementById('date-picker-prev-month').addEventListener('click', () => {
            currentDate.setMonth(currentDate.getMonth() - 1);
            renderCalendar();
        });

        document.getElementById('date-picker-next-month').addEventListener('click', () => {
            currentDate.setMonth(currentDate.getMonth() + 1);
            renderCalendar();
        });

        // Hide selectors helper
        const hideSelectors = () => {
            monthSelector.style.display = 'none';
            yearSelector.style.display = 'none';
        };

        // Month button click
        monthBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            if (monthSelector.style.display === 'none') {
                hideSelectors();
                monthSelector.style.display = 'block';
            } else {
                hideSelectors();
            }
        });

        // Year button click
        yearBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            if (yearSelector.style.display === 'none') {
                hideSelectors();
                yearSelector.style.display = 'block';
            } else {
                hideSelectors();
            }
        });

        // Month selection
        monthSelector.addEventListener('click', (e) => {
            if (e.target.dataset.month !== undefined) {
                currentDate.setMonth(parseInt(e.target.dataset.month));
                renderCalendar();
                hideSelectors();
            }
        });

        // Year selection
        yearSelector.addEventListener('click', (e) => {
            if (e.target.dataset.year !== undefined) {
                currentDate.setFullYear(parseInt(e.target.dataset.year));
                renderCalendar();
                hideSelectors();
            }
        });

        // Click outside to hide selectors
        document.addEventListener('click', (e) => {
            if (!monthSelector.contains(e.target) && !yearSelector.contains(e.target) && 
                !monthBtn.contains(e.target) && !yearBtn.contains(e.target)) {
                hideSelectors();
            }
        });

        // ESC key to close (but only if no other modals are open)
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && picker.classList.contains('visible')) {
                // Check if any other modals are open
                const otherModals = document.querySelectorAll('.modal-overlay.visible');
                if (otherModals.length === 0) {
                    e.preventDefault();
                    e.stopPropagation();
                    hidePicker();
                }
            }
        });

        document.getElementById('date-picker-cancel').addEventListener('click', hidePicker);

        document.getElementById('date-picker-today').addEventListener('click', () => {
            const today = new Date();
            const formattedDate = `${String(today.getDate()).padStart(2, '0')}-${String(today.getMonth() + 1).padStart(2, '0')}-${today.getFullYear()}`;
            if (targetInput) {
                targetInput.value = formattedDate;
                targetInput.dispatchEvent(new Event('input', { bubbles: true }));
            }
            hidePicker();
        });

        // Day selection
        daysContainer.addEventListener('click', (e) => {
            if (e.target.classList.contains('date-picker-day')) {
                const dateStr = e.target.dataset.date;
                const [year, month, day] = dateStr.split('-');
                const formattedDate = `${day}-${month}-${year}`;
                
                if (targetInput) {
                    targetInput.value = formattedDate;
                    targetInput.dispatchEvent(new Event('input', { bubbles: true }));
                }
                hidePicker();
            }
        });

        // Close on overlay click
        picker.addEventListener('click', (e) => {
            if (e.target === picker) {
                hidePicker();
            }
        });

        // Expose showPicker function
        Events.showCustomDatePicker = showPicker;
    },

    /**
     * Update navigation display text based on current view mode
     */
    updateNavigationDisplay: () => {
        const navDisplay = $('#nav-display');
        const isYearView = $('#year-overview-btn').classList.contains('active');
        
        if (navDisplay) {
            if (isYearView) {
                // Year view: show just the year
                navDisplay.textContent = getState.currentYear();
            } else {
                // Month view: show current month and year
                const currentMonth = getState.currentMonth();
                const currentYear = getState.currentYear();
                const shortMonths = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
                navDisplay.textContent = `${shortMonths[currentMonth]} ${currentYear}`;
            }
        }
    },

    /**
     * Show gradient themes selection modal
     */
    showGradientThemesModal: () => {
        // Store current theme for potential revert
        Events.originalGradientTheme = Store.loadGradientTheme();
        Events.tempGradientTheme = Events.originalGradientTheme;
        
        Events.populateGradientThemes();
        Events.setupGradientThemeModal();
        UI.showModal('gradient-themes-modal', true);
    },

    /**
     * Setup gradient theme modal event handlers
     */
    setupGradientThemeModal: () => {
        const doneBtn = $('#gradient-themes-done');
        const modal = $('#gradient-themes-modal');
        
        // Remove existing listeners to avoid duplicates
        if (doneBtn) {
            doneBtn.removeEventListener('click', Events.handleGradientThemeDone);
            doneBtn.addEventListener('click', Events.handleGradientThemeDone);
        }
        
        // Handle modal close/cancel to revert changes
        if (modal) {
            const cancelBtn = modal.querySelector('[data-close-modal="gradient-themes-modal"]');
            if (cancelBtn) {
                cancelBtn.removeEventListener('click', Events.handleGradientThemeCancel);
                cancelBtn.addEventListener('click', Events.handleGradientThemeCancel);
            }
        }
        
        // Handle custom gradient preview
        const previewBtn = $('#preview-custom-gradient');
        if (previewBtn) {
            previewBtn.removeEventListener('click', Events.handleCustomGradientPreview);
            previewBtn.addEventListener('click', Events.handleCustomGradientPreview);
        }
        

        // Swap button
        const swapBtn = $('#gradient-swap');
        if (swapBtn) {
            swapBtn.addEventListener('click', () => {
                const c1 = $('#gradient-color-1');
                const c2 = $('#gradient-color-2');
                if (c1 && c2) {
                    const temp = c1.value; c1.value = c2.value; c2.value = temp;
                    Events.updateGradientPreviewBadge();
                }
            });
        }
        // Handle real-time gradient preview badge updates
        const color1Input = $('#gradient-color-1');
        const color2Input = $('#gradient-color-2');
        const angleInput = $('#gradient-angle');
        const angleValue = $('#gradient-angle-value');
        if (color1Input && color2Input) {
            color1Input.removeEventListener('input', Events.updateGradientPreviewBadge);
            color2Input.removeEventListener('input', Events.updateGradientPreviewBadge);
            color1Input.addEventListener('input', Events.updateGradientPreviewBadge);
            color2Input.addEventListener('input', Events.updateGradientPreviewBadge);
        }
        if (angleInput) {
            angleInput.addEventListener('input', () => {
                if (angleValue) angleValue.textContent = `${angleInput.value}°`;
                Events.updateGradientPreviewBadge();
            });
        }
    },

    /**
     * Handle Done button click - save the selected theme
     */
    handleGradientThemeDone: () => {
        if (Events.tempGradientTheme === 'custom' && Events.customGradientData) {
            // Save custom gradient data
            Store.saveCustomGradient(Events.customGradientData);
            Store.saveGradientTheme('custom');
        } else if (Events.tempGradientTheme) {
            Store.saveGradientTheme(Events.tempGradientTheme);
        }
        UI.showModal('gradient-themes-modal', false);
    },

    /**
     * Handle Cancel - revert to original theme
     */
    handleGradientThemeCancel: () => {
        if (Events.originalGradientTheme) {
            Events.applyGradientTheme(Events.originalGradientTheme);
        }
        UI.showModal('gradient-themes-modal', false);
    },

    /**
     * Handle custom gradient preview
     */
    handleCustomGradientPreview: () => {
        const color1 = $('#gradient-color-1').value;
        const color2 = $('#gradient-color-2').value;
        
        // Create custom gradient
        const angle = parseInt($('#gradient-angle')?.value || '135', 10) || 135;
        const customGradient = `linear-gradient(${angle}deg, ${color1}, ${color2})`;
        const customShadow = Events.hexToRgba(color1, 0.2);
        
        // Apply custom gradient temporarily
        Events.applyCustomGradient(customGradient, customShadow);
        
        // Set as temp theme
        Events.tempGradientTheme = 'custom';
        Events.customGradientData = {
            gradient: customGradient,
            shadow: customShadow
        };
        
        // Clear active state from predefined themes
        $$('.gradient-theme-option').forEach(opt => opt.classList.remove('active'));
    },

    /**
     * Apply custom gradient to CSS variables
     */
    applyCustomGradient: (gradient, shadow) => {
        document.documentElement.style.setProperty('--theme-gradient', gradient);
        document.documentElement.style.setProperty('--theme-gradient-shadow', shadow);
        
        // Update weekend colors for custom gradient too
        Events.updateWeekendColors(gradient);
    },

    /**
     * Update gradient preview badge in real-time
     */
    updateGradientPreviewBadge: () => {
        const color1 = $('#gradient-color-1').value;
        const color2 = $('#gradient-color-2').value;
        const badge = $('#gradient-preview-badge');
        
        if (badge) {
            const angle = parseInt($('#gradient-angle')?.value || '135', 10) || 135;
            const gradient = `linear-gradient(${angle}deg, ${color1}, ${color2})`;
            badge.style.background = gradient;
        }
    },

    /**
     * Convert hex color to rgba
     */
    hexToRgba: (hex, alpha) => {
        const r = parseInt(hex.slice(1, 3), 16);
        const g = parseInt(hex.slice(3, 5), 16);
        const b = parseInt(hex.slice(5, 7), 16);
        return `rgba(${r}, ${g}, ${b}, ${alpha})`;
    },

    /**
     * Populate gradient themes grid
     */
    populateGradientThemes: () => {
        const grid = $('#gradient-themes-grid');
        if (!grid) return;

        const currentGradient = Store.loadGradientTheme();
        
        grid.innerHTML = '';
        
        Object.entries(GRADIENT_THEMES).forEach(([key, theme]) => {
            const option = document.createElement('div');
            option.className = `gradient-theme-option${currentGradient === key ? ' active' : ''}`;
            option.dataset.theme = key;
            
            option.innerHTML = `
                <div class="gradient-theme-preview" style="background: ${theme.gradient};"></div>
                <div class="gradient-theme-name">${theme.name}</div>
                <div class="gradient-theme-colors">${theme.colors}</div>
                <div class="checkmark">✓</div>
            `;
            
            option.addEventListener('click', () => {
                Events.selectGradientTheme(key);
            });
            
            grid.appendChild(option);
        });
    },

    /**
     * Select and apply gradient theme
     */
    selectGradientTheme: (themeKey) => {
        // Update active state in UI
        $$('.gradient-theme-option').forEach(opt => opt.classList.remove('active'));
        $(`.gradient-theme-option[data-theme="${themeKey}"]`).classList.add('active');
        
        // Apply theme immediately for preview
        Events.applyGradientTheme(themeKey);
        
        // Store temporarily (will be saved when Done is clicked)
        Events.tempGradientTheme = themeKey;
    },

    /**
     * Apply gradient theme to CSS custom properties
     */
    applyGradientTheme: (themeKey) => {
        let gradient, shadow;
        
        if (themeKey === 'custom') {
            // Load and apply custom gradient
            const customData = Store.loadCustomGradient();
            if (customData) {
                gradient = customData.gradient;
                shadow = customData.shadow;
            } else {
                return;
            }
        } else {
            const theme = GRADIENT_THEMES[themeKey];
            if (!theme) return;
            gradient = theme.gradient;
            shadow = theme.shadow;
        }
        
        const root = document.documentElement;
        root.style.setProperty('--theme-gradient', gradient);
        root.style.setProperty('--theme-gradient-shadow', shadow);
        
        // Generate dynamic weekend colors based on the selected gradient
        Events.updateWeekendColors(gradient);
    },

    /**
     * Generate and apply dynamic weekend colors based on the current gradient
     */
    updateWeekendColors: (gradient) => {
        // Extract colors from gradient string
        const colors = Events.extractGradientColors(gradient);
        if (!colors || colors.length < 2) return;
        
        const [color1, color2] = colors;
        const root = document.documentElement;
        
        // Create more visible gradient backgrounds for weekend cells - natural diagonal flow
        const lightBg = `linear-gradient(135deg, rgba(255, 255, 255, 0.9) 0%, rgba(255, 255, 255, 0.6) 50%, ${Events.addOpacityToColor(color1, 0.4)} 100%)`;
        const darkBg = `linear-gradient(135deg, rgba(0, 0, 0, 0.7) 0%, rgba(0, 0, 0, 0.5) 50%, ${Events.addOpacityToColor(color1, 0.35)} 100%)`;
        
        // Create strong text colors based on the first gradient color
        const lightText = Events.darkenColor(color1, 0.3);
        const darkText = Events.lightenColor(color1, 0.2);
        
        root.style.setProperty('--weekend-bg-light-dynamic', lightBg);
        root.style.setProperty('--weekend-bg-dark-dynamic', darkBg);
        root.style.setProperty('--weekend-text-light-dynamic', lightText);
        root.style.setProperty('--weekend-text-dark-dynamic', darkText);
    },

    /**
     * Extract colors from a gradient string
     */
    extractGradientColors: (gradient) => {
        const colorRegex = /#[a-fA-F0-9]{6}|#[a-fA-F0-9]{3}|rgb\([^)]+\)|rgba\([^)]+\)/g;
        return gradient.match(colorRegex);
    },

    /**
     * Add opacity to a color (hex or rgb)
     */
    addOpacityToColor: (color, opacity) => {
        if (color.startsWith('#')) {
            const r = parseInt(color.slice(1, 3), 16);
            const g = parseInt(color.slice(3, 5), 16);
            const b = parseInt(color.slice(5, 7), 16);
            return `rgba(${r}, ${g}, ${b}, ${opacity})`;
        }
        // If already rgba, replace opacity
        if (color.includes('rgba')) {
            return color.replace(/,\s*[^,]+\)$/, `, ${opacity})`);
        }
        // If rgb, convert to rgba
        if (color.includes('rgb')) {
            return color.replace('rgb', 'rgba').replace(')', `, ${opacity})`);
        }
        return color;
    },

    /**
     * Darken a color by a factor (0-1)
     */
    darkenColor: (color, factor) => {
        if (color.startsWith('#')) {
            const r = Math.floor(parseInt(color.slice(1, 3), 16) * (1 - factor));
            const g = Math.floor(parseInt(color.slice(3, 5), 16) * (1 - factor));
            const b = Math.floor(parseInt(color.slice(5, 7), 16) * (1 - factor));
            return `rgb(${r}, ${g}, ${b})`;
        }
        return color;
    },

    /**
     * Lighten a color by a factor (0-1)
     */
    lightenColor: (color, factor) => {
        if (color.startsWith('#')) {
            const r = Math.min(255, Math.floor(parseInt(color.slice(1, 3), 16) + (255 - parseInt(color.slice(1, 3), 16)) * factor));
            const g = Math.min(255, Math.floor(parseInt(color.slice(3, 5), 16) + (255 - parseInt(color.slice(3, 5), 16)) * factor));
            const b = Math.min(255, Math.floor(parseInt(color.slice(5, 7), 16) + (255 - parseInt(color.slice(5, 7), 16)) * factor));
            return `rgb(${r}, ${g}, ${b})`;
        }
        return color;
    }

};
