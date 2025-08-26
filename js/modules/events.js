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
                if (displayInput.value && !Utils.validateDate(displayInput.value)) {
                    displayInput.classList.add('border-red-500', 'shake');
                    setTimeout(() => {
                        displayInput.classList.remove('shake');
                    }, 600);
                } else if (displayInput.value) {
                     displayInput.classList.remove('border-red-500');
                     displayInput.classList.add('border-green-500');
                     const nativeFormat = Utils.formatDateForNative(displayInput.value);
                     if (nativeFormat && nativeInput) {
                         nativeInput.value = nativeFormat;
                     }
                     setTimeout(() => {
                       displayInput.classList.remove('border-green-500');
                    }, 1500);
                }
            });

            displayInput.addEventListener('input', (e) => {
                let value = e.target.value.replace(/\D/g, '');
                if (value.length > 2) {
                    value = value.slice(0, 2) + '-' + value.slice(2);
                }
                if (value.length > 5) {
                    value = value.slice(0, 5) + '-' + value.slice(5, 9);
                }
                e.target.value = value;
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
                    if (ev.key === 'Enter' || ev.key === ' ' || ev.key === 'ArrowDown') {
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
            data.dates = [...$$(`#${prefix}-date-entries-container .date-entry-item`)].map(item => {
                if (item.classList.contains('range')) {
                    const start = item.querySelector('.date-input-start');
                    const end = item.querySelector('.date-input-end');
                    if (start?.value && end?.value && Utils.validateDate(start.value) && Utils.validateDate(end.value)) {
                        return {
                            start: Utils.formatDateForNative(start.value),
                            end: Utils.formatDateForNative(end.value)
                        };
                    }
                } else if (item.classList.contains('single')) {
                    const single = item.querySelector('.date-display-input');
                    if (single?.value && Utils.validateDate(single.value)) {
                        return Utils.formatDateForNative(single.value);
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
     * Start interactive walkthrough
     */
    startWalkthrough: () => {
        UI.showModal('help-modal', false);
        
        const walkthrough = [
            {
                element: '#manage-plan-btn',
                title: 'Manage Categories',
                text: 'Click here to create, edit, and organize your event categories. This is where you start building your calendar plan.'
            },
            {
                element: '#stats',
                title: 'Statistics Overview',
                text: 'These cards show day counts for each category. Click any card to filter the calendar by that category. Drag to reorder!'
            },
            {
                element: '#calendars',
                title: 'Calendar View',
                text: 'Your events appear here. Double-click any day to quickly add events. Use year navigation arrows to browse different years.'
            },
            {
                element: '#theme-toggle-btn',
                title: 'Theme Toggle',
                text: 'Switch between light and dark themes for comfortable viewing in any environment.'
            },
            {
                element: '#toggle-stats-btn',
                title: 'Toggle Features',
                text: 'Hide or show the statistics panel to focus on just the calendar when needed.'
            }
        ];

        let currentStep = 0;
        
        const showStep = (step) => {
            // Remove previous highlight
            document.querySelectorAll('.walkthrough-highlight').forEach(el => {
                el.classList.remove('walkthrough-highlight');
            });
            
            if (step >= walkthrough.length) {
                // Walkthrough complete
                const toast = document.createElement('div');
                toast.className = 'walkthrough-complete-toast';
                toast.innerHTML = `
                    <div class="walkthrough-toast-content">
                        <span>🎉 Walkthrough complete! Start creating your first category to get going.</span>
                        <button onclick="this.parentElement.parentElement.remove()">×</button>
                    </div>
                `;
                document.body.appendChild(toast);
                setTimeout(() => toast.remove(), 5000);
                return;
            }
            
            const currentWalkthrough = walkthrough[step];
            const element = $(currentWalkthrough.element);
            
            if (!element) {
                currentStep++;
                showStep(currentStep);
                return;
            }
            
            // Highlight current element
            element.classList.add('walkthrough-highlight');
            
            // Create walkthrough popup
            const popup = document.createElement('div');
            popup.className = 'walkthrough-popup';
            popup.innerHTML = `
                <div class="walkthrough-popup-content">
                    <h4>${currentWalkthrough.title}</h4>
                    <p>${currentWalkthrough.text}</p>
                    <div class="walkthrough-popup-actions">
                        <button class="walkthrough-skip">Skip Tour</button>
                        <div>
                            <span class="walkthrough-progress">${step + 1}/${walkthrough.length}</span>
                            <button class="walkthrough-next">${step === walkthrough.length - 1 ? 'Finish' : 'Next'}</button>
                        </div>
                    </div>
                </div>
            `;
            
            // Position popup near element
            document.body.appendChild(popup);
            const rect = element.getBoundingClientRect();
            const popupRect = popup.getBoundingClientRect();
            
            let top = rect.bottom + 10;
            let left = rect.left;
            
            // Adjust if popup goes off screen
            if (left + popupRect.width > window.innerWidth) {
                left = window.innerWidth - popupRect.width - 10;
            }
            if (top + popupRect.height > window.innerHeight) {
                top = rect.top - popupRect.height - 10;
            }
            
            popup.style.position = 'fixed';
            popup.style.top = `${Math.max(10, top)}px`;
            popup.style.left = `${Math.max(10, left)}px`;
            popup.style.zIndex = '10000';
            
            // Scroll element into view
            element.scrollIntoView({ behavior: 'smooth', block: 'center' });
            
            // Add event listeners
            popup.querySelector('.walkthrough-next').addEventListener('click', () => {
                popup.remove();
                currentStep++;
                showStep(currentStep);
            });
            
            popup.querySelector('.walkthrough-skip').addEventListener('click', () => {
                popup.remove();
                document.querySelectorAll('.walkthrough-highlight').forEach(el => {
                    el.classList.remove('walkthrough-highlight');
                });
            });
        };
        
        // Start walkthrough
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
     * Setup all event listeners
     */
    setup: () => {
        const isAnyTouch = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0);
        if (isAnyTouch) {
            document.body.classList.add('is-touch-device');
        }
        let currentPointerType = isAnyTouch ? 'touch' : 'mouse';

        document.body.addEventListener('pointerdown', e => {
            if (e.pointerType) {
                currentPointerType = e.pointerType;
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

            if (closest('#import-modal-back-btn, .import-main-cancel')) { UI.showModal('import-text-modal', false); UI.showModal('manage-plan-modal', true); return; }
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
                $('#category-search-input').value = '';
                UI.populateCategoryList(); 
                UI.switchModalView('manage-plan-modal', '#category-list-view'); 
                UI.showModal('manage-plan-modal', true);
            }
            if (closest('#import-from-text-btn')) { UI.showModal('manage-plan-modal', false); UI.showModal('import-text-modal', true); }
            if (closest('#toggle-stats-btn')) { const isHidden = $('#stats').classList.toggle('hidden'); $('#stats-btn-text').textContent = isHidden ? 'Show Stats' : 'Hide Stats'; }
            // Help button is handled by direct event listeners above
            
            // Emoji picker button
            if (closest('.emoji-picker-btn')) {
                e.preventDefault();
                const button = closest('.emoji-picker-btn');
                const inputId = button.id.replace('-emoji-picker-btn', '-emoji-input');
                UI.showEmojiPicker(inputId, button);
            }
            
            // Emoji input double-click to show picker (single click just focuses/positions cursor)
            if (closest('.emoji-input') && e.detail === 2) { // Double click
                const emojiInput = closest('.emoji-input');
                const button = emojiInput.parentElement.querySelector('.emoji-picker-btn');
                if (button) {
                    const inputId = emojiInput.id;
                    UI.showEmojiPicker(inputId, button);
                }
            }
            if (closest('#home-year-btn')) { setState.currentYear(new Date().getFullYear()); UI.rebuild(); }
            if (closest('#prev-year-btn')) { setState.currentYear(getState.currentYear() - 1); UI.rebuild(); }
            if (closest('#next-year-btn')) { setState.currentYear(getState.currentYear() + 1); UI.rebuild(); }
            if (closest('#today-btn')) {
                setState.currentYear(new Date().getFullYear());
                setState.activeFilter('all');
                closest('#today-btn').classList.add('active');
                UI.rebuild(true);
                const todayEl = $('.day.today');
                if (todayEl) todayEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
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
        $('#start-walkthrough-btn')?.addEventListener('click', Events.startWalkthrough);

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
                    UI.applyFilterStyles();

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

        // Theme toggle
        $('#theme-toggle-btn').addEventListener('click', () => {
            const currentTheme = document.documentElement.getAttribute('data-theme') || 'light';
            const newTheme = currentTheme === 'light' ? 'midnight' : 'light';
            document.documentElement.setAttribute('data-theme', newTheme);
            Store.saveTheme(newTheme);
            UI.updateThemeControl(newTheme);
        });

        // Scroll to top button
        const scrollToTopBtn = $('#scroll-to-top');
        if (scrollToTopBtn) {
            scrollToTopBtn.addEventListener('click', () => {
                window.scrollTo({ top: 0, behavior: 'smooth' });
            });

            // Show/hide based on scroll position
            window.addEventListener('scroll', () => {
                if (window.scrollY > 300) {
                    scrollToTopBtn.style.display = 'flex';
                } else {
                    scrollToTopBtn.style.display = 'none';
                }
            });
        }

        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            // Undo shortcut
            if (e.ctrlKey && e.key === 'z') {
                e.preventDefault();
                const toast = $('#undo-toast');
                const undoBtn = toast?.querySelector('#undo-action');
                if (toast && toast.style.display === 'block' && undoBtn) {
                    undoBtn.click();
                }
                return;
            }
            
            if (e.key === 'Escape') {
                
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
                    } else {
                        UI.showModal(topmostModal.id, false);
                    }
                }
            }
        });
    },

};
