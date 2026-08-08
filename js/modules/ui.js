/**
 * UI Rendering Module
 * Contains all UI rendering and manipulation functions
 */

import { getState, setState } from '../core/state.js';
import { $, $$ } from '../utils/dom.js';
import { MONTH_NAMES, ICONS, CATEGORY_TEMPLATES } from '../config/constants.js';
import { Utils } from './utils.js';
import { Logic } from './logic.js';
import { Store } from './store.js';
import { Sync } from './sync.js';
import { addDays } from './ics.js';
import { Model } from '../core/model.js';

// UI Rendering and Manipulation Object
export const UI = {
    /**
     * Rebuild the entire calendar UI
     */
    rebuild: (isTodayClick = false) => {
        const currentYear = getState.currentYear();

        // Update navigation display without relying on Events (avoid module circularity)
        const navDisplay = $('#nav-display');
        if (navDisplay) {
            const isYearView = document.getElementById('year-overview-btn')?.classList.contains('active');
            if (isYearView) {
                navDisplay.textContent = currentYear;
            } else {
                const currentMonth = getState.currentMonth();
                const shortMonth = (MONTH_NAMES[currentMonth] || '').slice(0, 3);
                navDisplay.textContent = `${shortMonth} ${currentYear}`;
            }
        }

        // Show/hide Home button based on whether we're in current year
        const homeBtn = $('#home-year-btn');
        const actualCurrentYear = new Date().getFullYear();
        if (homeBtn) {
            if (currentYear !== actualCurrentYear) {
                homeBtn.style.display = 'flex';
                homeBtn.innerHTML = `<svg fill="none" stroke="currentColor" viewBox="0 0 24 24" width="16" height="16">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"/>
                </svg>${actualCurrentYear}`;
            } else {
                homeBtn.style.display = 'none';
            }
        }
        const calendarsContainer = $('#calendars');
        calendarsContainer.innerHTML = '';
        let monthsToDisplay = Logic.getMonthsToDisplay();

        if (monthsToDisplay.length > 0) {
            monthsToDisplay.forEach(({ year, month }) => calendarsContainer.appendChild(UI.generateCalendar(year, month)));
        } else {
            calendarsContainer.innerHTML = `<div id="calendar-placeholder"><h3>No events for this filter in ${currentYear}</h3><p>Add events or change the year.</p></div>`;
        }

        // Always leave stats visibility to user toggle; do not force-hide
        const statsContainer = $('#stats');
        if (statsContainer) {
            statsContainer.style.display = '';
        }

        // Month view gets larger day cells and inline event chips; the class
        // lets the CSS and createDayElement branch on it.
        const inMonthView = document.getElementById('month-view-btn')?.classList.contains('active');
        calendarsContainer.classList.toggle('month-mode', !!inMonthView);

        UI.renderStats();
        UI.renderUpcomingStrip();
        UI.applyFilterStyles();
        if (!isTodayClick) $('#today-btn').classList.remove('active');
    },

    /**
     * Render statistics cards
     */
    renderStats: () => {
        const config = getState.config();
        const statsData = Logic.calculateStats();
        const statsMap = [{ id: 'all', name: 'Overview', emoji: '🌟', value: '', color: '#64748b'}, ...config.eventCategories];
        let statsHtml = statsMap.map(stat => {
            const value = statsData[stat.id] || 0;
            const valueSpan = stat.id !== 'all' ? `<span class="stat-value">${value}</span>` : '';

            const briefcaseSVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="7" width="20" height="14" rx="2" ry="2"></rect><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"></path></svg>`;
            const excludeIcon = stat.excludeHolidays ? `<span class="exclude-icon" title="Counts workdays only">${briefcaseSVG}</span>` : '';

            // Subscribed calendars carry a small sync glyph so read-only feeds
            // are visually distinct from hand-made categories.
            const syncSVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21 2v6h-6"/><path d="M3 12a9 9 0 0 1 15-6.7L21 8"/><path d="M3 22v-6h6"/><path d="M21 12a9 9 0 0 1-15 6.7L3 16"/></svg>`;
            const syncIcon = stat.type === 'ics' ? `<span class="stat-sync-badge" title="Synced calendar subscription">${syncSVG}</span>` : '';

            const isOverview = stat.id === 'all';
            const cardClass = isOverview ? 'overview-card' : '';
            // Names can come from a remote feed (X-WR-CALNAME), so escape them.
            return `
                <div class="stat-card ${cardClass}" data-filter="${stat.id}" style="--color: ${stat.color};">
                    <button class="edit-stat-btn" title="Edit Category">${ICONS.edit}</button>
                    <div class="stat-number"><span class="stat-emoji">${UI.escapeHtml(stat.emoji)}</span>${valueSpan}</div>
                    <div class="stat-label"><span>${UI.escapeHtml(stat.name)}</span>${excludeIcon}${syncIcon}</div>
                </div>`;
        }).join('');
        statsHtml += `
            <div class="stat-card stat-card-add" id="add-new-stat-btn" title="Add New Category">
                <div class="stat-number"><span class="stat-emoji">✨</span></div>
                <div class="stat-label"><span>Add New Category</span></div>
            </div>`;
        $('#stats').innerHTML = statsHtml;
    },

    /**
     * Generate a calendar for a specific month
     */
    generateCalendar: (year, month) => {
        const container = document.createElement('div');
        container.className = 'month-container';
        container.innerHTML = `
            <div class="month-header gradient-${(month % 4) + 1}">${MONTH_NAMES[month]} ${year}</div>
            <div class="calendar-grid">
                ${['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(d => `<div class="day-header">${d}</div>`).join('')}
            </div>`;
        const grid = container.querySelector('.calendar-grid');
        const startDate = new Date(Date.UTC(year, month, 1));
        const dayOfWeek = startDate.getUTCDay();
        const dayAdjustment = (dayOfWeek === 0) ? -6 : 1 - dayOfWeek;
        startDate.setUTCDate(startDate.getUTCDate() + dayAdjustment);

        for (let i = 0; i < 42; i++) {
            grid.appendChild(UI.createDayElement(new Date(startDate), month));
            startDate.setUTCDate(startDate.getUTCDate() + 1);
        }
        return container;
    },

    /**
     * Create a day element for the calendar
     */
    createDayElement: (date, month) => {
        const config = getState.config();
        const day = document.createElement('div');
        const dayOfWeek = date.getUTCDay();
        day.className = `day ${date.getUTCMonth() !== month ? 'other-month' : ''} ${dayOfWeek === 0 || dayOfWeek === 6 ? 'weekend' : ''} ${Utils.formatDate(date) === Utils.formatDate(new Date()) ? 'today' : ''}`;
        day.dataset.date = Utils.formatDate(date);

        const activities = config.eventCategories.filter(cat => {
            if (cat.type === 'group') {
                return cat.childCategoryIds.some(childId => {
                    const childCat = config.eventCategories.find(c => c.id === childId);
                    return childCat && Utils.isDateInRanges(date, childCat.dates);
                });
            }
            return Utils.isDateInRanges(date, cat.dates);
        }).map(cat => cat.id);

        if (activities.length > 0) day.dataset.activities = activities.join(',');

        // Per-day event details — from subscribed feeds and from local date
        // entries that carry a title/time — surface as a hover tooltip here
        // and via the tap peek (see showDayPeek / dayDetailsFor).
        const dateStr = day.dataset.date;
        // Scanned once and reused by both the tooltip and the month-view chips;
        // this used to be two separate scans per cell, i.e. twice per day cell
        // on every rebuild.
        const dayGroups = UI.dayDetailsFor(dateStr, activities);
        const detailLines = [];
        dayGroups.forEach(({ entries }) => {
            entries.forEach(ev => detailLines.push(`${ev.time ? ev.time + ' ' : ''}${ev.title}`));
        });
        if (detailLines.length) {
            day.title = detailLines.join('\n');
            day.dataset.hasDetails = '1';
        }

        const emojiEl = activities.length > 0 ? (config.eventCategories.find(c => c.id === activities[0])?.emoji || '🗓️') : '';
        const barSegments = [...new Set(activities)].map(act => {
            const cat = config.eventCategories.find(c => c.id === act);
            return `<div class="activity-segment" style="background-color: ${cat?.color || 'transparent'};"></div>`;
        }).join('');

        // In month view the cells are large enough to carry event chips with
        // actual titles; year overview stays compact (emoji + color bar).
        let chipsHtml = '';
        const inMonthView = document.getElementById('month-view-btn')?.classList.contains('active');
        if (inMonthView) {
            const groups = dayGroups;
            const totalEntries = groups.reduce((n, g) => n + g.entries.length, 0);
            const chips = [];
            groups.forEach(({ cat, entries }) => {
                entries.forEach(ev => {
                    if (chips.length >= 3) return;
                    chips.push(`<div class="day-event-chip" style="--chip-color: ${UI.escapeHtml(cat.color || '#64748b')};">${
                        ev.time ? `<span class="chip-time">${UI.escapeHtml(ev.time)}</span>` : ''
                    }${UI.escapeHtml(ev.title)}</div>`);
                });
            });
            if (totalEntries > 3) chips.push(`<div class="day-event-chip more">+${totalEntries - 3} more</div>`);
            if (chips.length) chipsHtml = `<div class="day-event-chips">${chips.join('')}</div>`;
        }

        day.innerHTML = `
            <div class="day-number">${date.getUTCDate()}</div>
            <div class="day-emojis">${emojiEl}</div>
            ${chipsHtml}
            <div class="activities-bar">${barSegments}</div>`;
        return day;
    },

    /**
     * Apply filter styles to calendar and stats
     */
    applyFilterStyles: () => {
        const activeFilter = getState.activeFilter();
        const config = getState.config();

        $$('.stat-card').forEach(c => c.classList.toggle('active', c.dataset.filter === activeFilter));
        const emojiMap = new Map(config.eventCategories.map(c => [c.id, c.emoji]));

        $$('.day').forEach(day => {
            const activitiesOnDay = day.dataset.activities?.split(',') || [];
            const emojiEl = day.querySelector('.day-emojis');
            let hasActiveFilter = activeFilter === 'all';

            if (activitiesOnDay.length === 0) {
                day.classList.toggle('filtered-out', !hasActiveFilter);
                emojiEl.textContent = '';
                return;
            }

            if (activeFilter !== 'all') {
                const activeCat = config.eventCategories.find(c => c.id === activeFilter);
                if (activeCat?.type === 'group') {
                    hasActiveFilter = activitiesOnDay.some(actId => activeCat.childCategoryIds.includes(actId));
                } else {
                    hasActiveFilter = activitiesOnDay.includes(activeFilter);
                }
            }

            day.classList.toggle('filtered-out', !hasActiveFilter);

            if (activeFilter === 'all') {
                let topActivityId = null;
                for (const cat of config.eventCategories) {
                    if (activitiesOnDay.includes(cat.id)) {
                        topActivityId = cat.id;
                        break;
                    }
                }
                emojiEl.textContent = topActivityId ? emojiMap.get(topActivityId) || '🗓️' : '';
            } else {
                emojiEl.textContent = hasActiveFilter ? emojiMap.get(activeFilter) || '🗓️' : '';
            }
        });
    },

    /**
     * Show or hide a modal
     */
    showModal: (id, show = true) => {
        if (show) UI.closeDayPeek();
        const modal = $(`#${id}`);
        if (modal) {
            modal.classList.toggle('visible', show);
            if (show && id === 'import-text-modal') {
                UI.switchModalView('import-text-modal', '#import-main-view');
                $('#import-error-message').style.display = 'none';
            }

            // Prevent/allow background scrolling
            if (show) {
                document.body.classList.add('modal-open');
            } else {
                // Only remove scroll lock if no other modals are visible
                const visibleModals = document.querySelectorAll('.modal-overlay.visible');
                if (visibleModals.length === 0) {
                    document.body.classList.remove('modal-open');
                }
            }
        }
    },

    /**
     * Switch between different views within a modal
     */
    switchModalView: (modalId, viewToShow) => {
        const modal = $(`#${modalId}`);
        if (!modal) return;
        modal.querySelectorAll('.modal-view').forEach(view => {
            view.style.display = view.matches(viewToShow) ? 'flex' : 'none';
        });
    },

    /**
     * Get HTML for editor fields
     */
    getEditorFieldsHTML: (prefix = '', isNewCategory = false) => `
        <fieldset>
            <legend>General</legend>
            <div style="display: flex; flex-direction: column; gap: 8px; padding-top: 4px;">
                <div class="name-input-container">
                    <div class="name-input-with-template">
                        <input type="text" id="${prefix}-name-input" required class="editor-input name-input" placeholder="Category Name (e.g., Team Vacation)" autocomplete="off">
                        <button type="button" class="template-picker-btn" id="${prefix}-template-picker-btn" title="Choose from Templates">
                            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" width="16" height="16">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
                            </svg>
                        </button>
                    </div>
                    <div class="name-suggestions" id="${prefix}-name-suggestions" style="display: none;"></div>
                </div>
                <div class="editor-grid">
                    <div class="editor-grid-item">
                        <div class="emoji-picker-container">
                            <input type="text" id="${prefix}-emoji-input" required class="editor-input text-center emoji-input" placeholder="Emojis (✈️🏖️💼)" maxlength="10">
                            <button type="button" class="emoji-picker-btn" id="${prefix}-emoji-picker-btn" title="Choose Emojis (adds to existing, or clear field first)">
                                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" width="16" height="16">
                                    <circle cx="12" cy="12" r="10"></circle>
                                    <path d="M8 14s1.5 2 4 2 4-2 4-2"></path>
                                    <line x1="9" y1="9" x2="9.01" y2="9"></line>
                                    <line x1="15" y1="9" x2="15.01" y2="9"></line>
                                </svg>
                            </button>
                        </div>
                        <div class="segmented-control-wrapper">
                            <div class="segmented-control" id="${prefix}-type-toggle">
                                <button type="button" data-type="single" class="active">Single</button>
                                <button type="button" data-type="group">Group</button>
                            </div>
                        </div>
                    </div>
                    <div class="editor-grid-item">
                        <div class="color-input-container">
                            <input type="color" id="${prefix}-color-input" value="#3b82f6">
                            <div class="color-preview-swatch" id="${prefix}-color-preview"></div>
                            <span>Choose Color</span>
                        </div>
                        <div class="toggle-wrapper">
                            <label class="toggle-switch">
                                <input type="checkbox" id="${prefix}-exclude-holidays-checkbox">
                                <span class="toggle-slider"></span>
                            </label>
                            <label for="${prefix}-exclude-holidays-checkbox">Exclude Holidays</label>
                        </div>
                    </div>
                </div>
            </div>
        </fieldset>
        <div id="${prefix}-dates-group">
            <fieldset>
                <legend>
                    <span>Dates</span>
                    <button type="button" class="clear-all-dates-btn" title="Clear all dates" style="display: none;">
                        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" width="12" height="12">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
                        </svg>
                        Clear All
                    </button>
                </legend>
                <div id="${prefix}-date-entries-container" class="date-entry-container"></div>
                <div class="date-buttons-wrapper">
                    <div class="date-buttons-main">
                        <button type="button" class="modal-btn-small btn-outline btn-green add-date-range-btn">+ Range</button>
                        <button type="button" class="modal-btn-small btn-outline btn-green add-single-date-btn">+ Single</button>
                        <button type="button" class="modal-btn-small btn-outline btn-blue bulk-add-today-btn">Today</button>
                        <button type="button" class="modal-btn-small btn-outline btn-blue bulk-add-this-weekend-btn">Weekend</button>
                        <button type="button" class="modal-btn-small btn-outline btn-blue bulk-add-current-month-btn">This Month</button>
                        <button type="button" class="modal-btn-small btn-outline btn-gray date-expand-btn">More ▾</button>
                    </div>
                    <div class="date-buttons-expanded" style="display: none;">
                        <button type="button" class="modal-btn-small btn-outline btn-blue bulk-add-tomorrow-btn">Tomorrow</button>
                        <button type="button" class="modal-btn-small btn-outline btn-blue bulk-add-next-7days-btn">Next 7 Days</button>
                        <button type="button" class="modal-btn-small btn-outline btn-blue bulk-add-work-week-btn">Work Week</button>
                        <button type="button" class="modal-btn-small btn-outline btn-blue bulk-add-weekdays-btn">Weekdays This Month</button>
                        <button type="button" class="modal-btn-small btn-outline btn-blue bulk-add-every-monday-btn">Every Monday</button>
                        <button type="button" class="modal-btn-small btn-outline btn-blue bulk-add-every-friday-btn">Every Friday</button>
                        <button type="button" class="modal-btn-small btn-outline btn-blue bulk-add-monthly-btn">15th Each Month</button>
                        <button type="button" class="modal-btn-small btn-outline btn-blue bulk-add-last-week-month-btn">Last Week of Month</button>
                        <button type="button" class="modal-btn-small btn-outline btn-blue bulk-add-every-weekend-btn">Every Weekend</button>
                    </div>
                </div>
            </fieldset>
        </div>
        <div id="${prefix}-group-categories-group" style="display: none;">
            <fieldset>
                <legend>Categories to Group</legend>
                <div id="${prefix}-group-categories-container" class="group-categories-container"></div>
            </fieldset>
        </div>`,

    /**
     * Populate editor with category data
     */
    populateEditor: (prefix, category = null) => {
        const isNew = !category;
        const type = category?.type || 'single';
        $(`#${prefix}-name-input`).value = category?.name || '';
        $(`#${prefix}-emoji-input`).value = category?.emoji || '';
        $(`#${prefix}-color-input`).value = category?.color || '#3b82f6';
        $(`#${prefix}-color-preview`).style.backgroundColor = category?.color || '#3b82f6';
        $(`#${prefix}-exclude-holidays-checkbox`).checked = category?.excludeHolidays || false;

        UI.updateCategoryTypeToggle($(`#${prefix}-type-toggle`), type);
        UI.toggleCategoryTypeView(prefix, type, category);

        const dateContainer = $(`#${prefix}-date-entries-container`);
        dateContainer.innerHTML = '';
        UI.updateClearAllButton(dateContainer); // Hide clear button when starting fresh
        if (type === 'single' && category?.dates) {
            category.dates.forEach(date => {
                if (typeof date === 'string') {
                    UI.addDateEntry('single', Utils.formatDateForDisplay(date), '', dateContainer);
                } else if (date?.start) {
                    const details = (date.title || date.time || date.endTime || date.location || date.notes)
                        ? { title: date.title, time: date.time, endTime: date.endTime, location: date.location, notes: date.notes }
                        : null;
                    // A single-day entry only exists in object form to carry
                    // details; show it as a single-date row, not a range.
                    if (date.end === date.start || !date.end) {
                        UI.addDateEntry('single', Utils.formatDateForDisplay(date.start), '', dateContainer, details);
                    } else {
                        UI.addDateEntry('range', Utils.formatDateForDisplay(date.start), Utils.formatDateForDisplay(date.end), dateContainer, details);
                    }
                }
            });
        }
    },

    /**
     * Open category editor modal
     */
    openCategoryEditor: (categoryId = null, isDuplicate = false) => {
        const config = getState.config();

        // Subscribed calendars are read-only: their dates come from the feed and
        // would be overwritten on the next sync. Send the user to the
        // subscription settings instead of a form that cannot save.
        if (categoryId && !isDuplicate) {
            const existing = config.eventCategories.find(c => c.id === categoryId);
            if (existing && existing.type === 'ics') {
                UI.openSubscriptionEditor(categoryId);
                return;
            }
        }

        const form = $('#category-editor-form');
        form.reset();
        const isNewCategory = !categoryId || isDuplicate;
        $('#main-editor-fields').innerHTML = UI.getEditorFieldsHTML('category', isNewCategory);
        $('#editor-error-message').style.display = 'none';

        $('#manage-plan-modal .modal-content').classList.add('medium');

        const category = categoryId ? config.eventCategories.find(c => c.id === categoryId) : null;

        $('#editor-title').textContent = (category && !isDuplicate) ? `Edit "${category.name}"` : 'Add New Category';
        $('#category-id-input').value = (category && !isDuplicate) ? category.id : `custom-${Date.now()}`;

        const categoryToLoad = category ? (isDuplicate ? { ...category, name: category.name + ' - Copy' } : category) : null;
        UI.populateEditor('category', categoryToLoad);

        const deleteBtn = $('#delete-category-btn');
        deleteBtn.style.display = (category && !isDuplicate) ? 'inline-flex' : 'none';
        deleteBtn.innerHTML = ICONS.delete + " Delete";

        UI.showModal('manage-plan-modal', true);
        UI.switchModalView('manage-plan-modal', '#category-editor-view');

        // No additional setup needed for new categories
    },

    /**
     * Show template picker popup (similar to emoji picker)
     */
    showTemplatePickerModal: () => {
        // Build template picker content WITHOUT header (modal already has header)
        const templatePickerHTML = `
            <div class="template-picker-header">
                <div class="search-input-wrapper">
                    <input type="text" class="template-picker-search" placeholder="Search templates...">
                    <button type="button" class="template-search-clear" style="display: none;">
                        <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                            <path d="M9 3L3 9M3 3L9 9" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
                        </svg>
                    </button>
                </div>
            </div>
            <div class="template-picker-content">
                <div class="template-picker-grid" id="template-picker-grid">
                    ${UI.renderTemplatePickerCards()}
                </div>
            </div>
        `;

        // Insert the HTML into the modal body
        $('#template-picker-modal .modal-body').innerHTML = templatePickerHTML;

        // Set up search functionality with clear button
        const modalBody = $('#template-picker-modal .modal-body');
        const searchInput = modalBody.querySelector('.template-picker-search');
        const searchClear = modalBody.querySelector('.template-search-clear');

        searchInput.addEventListener('input', (e) => {
            const query = e.target.value.trim();
            searchClear.style.display = query ? 'block' : 'none';
            UI.filterTemplatePickerCards(e.target.value);
        });

        searchClear.addEventListener('click', () => {
            searchInput.value = '';
            searchClear.style.display = 'none';
            UI.filterTemplatePickerCards('');
            searchInput.focus();
        });

        // Set up the EXACT original click handlers for template cards
        modalBody.addEventListener('click', (e) => {
            const card = e.target.closest('.template-picker-card');
            if (card) {
                const template = JSON.parse(card.dataset.template);
                UI.applyTemplateToForm(template);
                UI.showModal('template-picker-modal', false);
            }
        });

        // Show the modal and focus search (like original)
        UI.showModal('template-picker-modal', true);
        setTimeout(() => searchInput.focus(), 100);
    },

    /**
     * Render template picker cards
     */
    renderTemplatePickerCards: () => {
        const allTemplates = Object.values(CATEGORY_TEMPLATES).flat();
        return allTemplates.map(template => `
            <div class="template-picker-card" data-template='${JSON.stringify(template)}'>
                <div class="template-picker-card-emoji">${template.emoji}</div>
                <div class="template-picker-card-name">${template.name}</div>
                <div class="template-picker-card-color" style="background-color: ${template.color}"></div>
            </div>
        `).join('');
    },

    /**
     * Filter template picker cards
     */
    filterTemplatePickerCards: (query) => {
        const grid = $('#template-picker-grid');
        if (!query.trim()) {
            grid.innerHTML = UI.renderTemplatePickerCards();
            return;
        }

        const allTemplates = Object.values(CATEGORY_TEMPLATES).flat();
        const filteredTemplates = allTemplates.filter(template =>
            template.name.toLowerCase().includes(query.toLowerCase()) ||
            template.description.toLowerCase().includes(query.toLowerCase())
        );

        grid.innerHTML = filteredTemplates.map(template => `
            <div class="template-picker-card" data-template='${JSON.stringify(template)}'>
                <div class="template-picker-card-emoji">${template.emoji}</div>
                <div class="template-picker-card-name">${template.name}</div>
                <div class="template-picker-card-color" style="background-color: ${template.color}"></div>
            </div>
        `).join('');
    },

    /**
     * Apply template to current form
     */
    applyTemplateToForm: (template) => {
        const nameInput = $('#category-name-input');
        const emojiInput = $('#category-emoji-input');
        const colorInput = $('#category-color-input');
        const colorPreview = $('#category-color-preview');

        if (nameInput) nameInput.value = template.name;
        if (emojiInput) emojiInput.value = template.emoji;
        if (colorInput) {
            colorInput.value = template.color;
            if (colorPreview) colorPreview.style.backgroundColor = template.color;
        }

        // Brief visual feedback
        if (nameInput) {
            nameInput.style.background = 'var(--success-color-light, rgba(34, 197, 94, 0.1))';
            setTimeout(() => {
                nameInput.style.background = '';
            }, 1000);
        }
    },

    /**
     * Apply selected template and close modal
     */
    applyTemplateAndClose: (template) => {
        // Apply template to the category form
        const nameInput = $('#category-name-input');
        const emojiInput = $('#category-emoji-input');
        const colorInput = $('#category-color-input');
        const colorPreview = $('#category-color-preview');

        if (nameInput) nameInput.value = template.name;
        if (emojiInput) emojiInput.value = template.emoji;
        if (colorInput) {
            colorInput.value = template.color;
            if (colorPreview) colorPreview.style.backgroundColor = template.color;
        }

        // Close template picker and go to category editor
        UI.showModal('template-picker-modal', false);
        UI.showModal('manage-plan-modal', true);
        UI.switchModalView('manage-plan-modal', '#category-editor-view');

        // Brief visual feedback
        if (nameInput) {
            nameInput.style.background = 'var(--success-color-light, rgba(34, 197, 94, 0.1))';
            setTimeout(() => {
                nameInput.style.background = '';
            }, 1000);
        }
    },

    /**
     * Update category type toggle buttons
     */
    updateCategoryTypeToggle: (toggleElement, type) => {
        if (!toggleElement) return;
        toggleElement.querySelectorAll('button').forEach(btn => btn.classList.toggle('active', btn.dataset.type === type));
    },

    /**
     * Toggle between single and group category views
     */
    toggleCategoryTypeView: (prefix, type, category = null) => {
        const datesGroup = $(`#${prefix}-dates-group`);
        const groupCategoriesGroup = $(`#${prefix}-group-categories-group`);
        if (!datesGroup || !groupCategoriesGroup) return;

        if (type === 'group') {
            datesGroup.style.display = 'none';
            groupCategoriesGroup.style.display = 'block';
            UI.populateGroupCategorySelector($(`#${prefix}-group-categories-container`), category);
        } else {
            datesGroup.style.display = 'block';
            groupCategoriesGroup.style.display = 'none';
        }
    },

    /**
     * Populate group category selector
     */
    populateGroupCategorySelector: (container, category) => {
        const config = getState.config();
        if (!container) return;
        const childIds = category?.childCategoryIds || [];
        const availableCategories = config.eventCategories.filter(c => c.type !== 'group' && c.id !== category?.id);
        availableCategories.sort((a, b) => a.name.length - b.name.length);
        container.innerHTML = availableCategories.length > 0 ? availableCategories.map(c => `
            <div class="group-category-item">
                <input type="checkbox" id="group-check-${category?.id || 'new'}-${c.id}" value="${c.id}" ${childIds.includes(c.id) ? 'checked' : ''}>
                <label for="group-check-${category?.id || 'new'}-${c.id}">${c.emoji} ${c.name}</label>
            </div>`).join('') : '<p style="text-align:center; font-size: 0.9em; color: var(--light-text-secondary);">No existing single categories available to group.</p>';
    },

    /**
     * Add a date entry to the editor
     */
    addDateEntry: (type, start = '', end = '', container, details = null) => {
        const item = document.createElement('div');
        item.className = `date-entry-item ${type}`;
        const uniqueId1 = `native-date-${Date.now()}-${Math.random()}`;
        const uniqueId2 = `native-date-${Date.now()}-${Math.random()}`;
        const calendarSVG = `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>`;

        const esc = UI.escapeHtml;
        const d = details || {};
        const hasDetails = !!(d.title || d.time || d.endTime || d.location || d.notes);

        // The per-event fields: title, time range, location, notes. The toggle
        // sits in the date row; the panel wraps to a full-width block below it
        // (the item flex-wraps).
        const detailsToggle = `
            <button type="button" class="date-details-toggle${hasDetails ? ' active' : ''}"
                    title="Event details (name, time, location, notes)" aria-expanded="${hasDetails}">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z"/></svg>
            </button>`;
        const detailsFields = `
            <div class="date-entry-details"${hasDetails ? '' : ' style="display: none;"'}>
                <input type="text" class="editor-input event-title-input" placeholder="Event name (optional)"
                       maxlength="80" value="${esc(d.title || '')}">
                <div class="event-time-row">
                    <input type="time" class="editor-input event-time-input" value="${esc(d.time || '')}" title="Start time">
                    <span>–</span>
                    <input type="time" class="editor-input event-end-time-input" value="${esc(d.endTime || '')}" title="End time">
                    <input type="text" class="editor-input event-location-input" placeholder="Location"
                           maxlength="80" value="${esc(d.location || '')}">
                </div>
                <textarea class="editor-input event-notes-input" rows="2" placeholder="Notes"
                          maxlength="280">${esc(d.notes || '')}</textarea>
            </div>`;

        item.innerHTML = (type === 'single' ? `
            <div class="relative date-input-wrapper flex-1">
                <input type="text" class="date-display-input editor-input" value="${esc(start)}" placeholder="DD-MM-YYYY" maxlength="20" title="Enter dates like: 25-12-2024, today, oct 22, 22nd dec, next monday, in 5 days">
                <button type="button" class="calendar-button" title="Open date picker">${calendarSVG}</button>
                <input type="date" id="${uniqueId1}" class="native-date-input">
            </div>` : `
            <div class="relative date-input-wrapper flex-1">
                <input type="text" class="date-display-input date-input-start editor-input" value="${esc(start)}" placeholder="DD-MM-YYYY" maxlength="20" title="Enter dates like: 25-12-2024, today, oct 22, 1st jan, next monday, in 5 days">
                <button type="button" class="calendar-button" title="Open date picker">${calendarSVG}</button>
                <input type="date" id="${uniqueId1}" class="native-date-input">
            </div>
            <span>to</span>
            <div class="relative date-input-wrapper flex-1">
                <input type="text" class="date-display-input date-input-end editor-input" value="${esc(end)}" placeholder="DD-MM-YYYY" maxlength="20" title="Enter dates like: 25-12-2024, tomorrow, dec 31, 15th mar, next friday, in 2 weeks">
                <button type="button" class="calendar-button" title="Open date picker">${calendarSVG}</button>
                <input type="date" id="${uniqueId2}" class="native-date-input">
            </div>`) +
            detailsToggle + `
            <button type="button" class="remove-date-btn" title="Remove date">&times;</button>` +
            detailsFields;
        container.appendChild(item);

        // Update clear all button visibility
        UI.updateClearAllButton(container);

        // Import Events module dynamically to avoid circular dependency
        import('./events.js').then(({ Events }) => {
            Events.connectDateInputs(item);
        });
    },

    /**
     * Populate category list view
     */
    populateCategoryList: (searchTerm = '') => {
        const config = getState.config();
        const container = $('#category-list-container');
        const stats = Logic.calculateStats();
        const sortValue = $('#category-sort-select')?.value || 'custom';

        let filteredCategories = [...config.eventCategories];
        if (searchTerm.trim()) {
            const searchLower = searchTerm.toLowerCase();
            filteredCategories = config.eventCategories.filter(cat =>
                cat.name.toLowerCase().includes(searchLower) ||
                cat.emoji.includes(searchTerm.trim())
            );
        }

        // Apply sorting
        filteredCategories.sort((a, b) => {
            switch (sortValue) {
                case 'custom': {
                    // Respect the drag-and-drop order in config.eventCategories
                    const indexA = config.eventCategories.indexOf(a);
                    const indexB = config.eventCategories.indexOf(b);
                    return indexA - indexB;
                }
                case 'usage':
                    return (stats[b.id] || 0) - (stats[a.id] || 0);
                case 'name':
                    return a.name.localeCompare(b.name);
                case 'recent': {
                    // For now, use creation order as "recent" (reverse array order)
                    const indexA = config.eventCategories.indexOf(a);
                    const indexB = config.eventCategories.indexOf(b);
                    return indexB - indexA;
                }
                default:
                    return 0;
            }
        });

        if (filteredCategories.length === 0 && searchTerm.trim()) {
            container.innerHTML = '<p style="text-align: center; padding: 20px 0; color: var(--light-text-secondary);">No categories found matching your search.</p>';
        } else if (filteredCategories.length === 0) {
            container.innerHTML = '<p style="text-align: center; padding: 20px 0; color: var(--light-text-secondary);">No categories yet. Add one to get started!</p>';
        } else {
            container.innerHTML = filteredCategories.map(cat => {
                const count = stats[cat.id] || 0;
                const briefcaseSVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="7" width="20" height="14" rx="2" ry="2"></rect><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"></path></svg>`;
                const excludeIcon = cat.excludeHolidays ? `<span class="exclude-icon" title="Counts workdays only">${briefcaseSVG}</span>` : '';
                // ICS categories are read-only: no duplicate button, and the edit
                // button routes to subscription settings via openCategoryEditor.
                const isIcs = cat.type === 'ics';
                const typeBadge = cat.type === 'group' ? '(Group)' : (isIcs ? '<span class="category-sync-tag" title="Synced calendar subscription">Synced</span>' : '');
                return `
                    <div class="category-list-item" data-id="${cat.id}" style="border-left: 3px solid ${cat.color};">
                        <span class="category-list-item-content">
                            ${UI.escapeHtml(cat.emoji)} ${UI.escapeHtml(cat.name)} ${typeBadge} ${excludeIcon}
                            <span class="category-usage-count">${count}</span>
                        </span>
                        <div class="category-list-item-actions">
                            ${isIcs ? '' : `<button class="modal-btn btn-info btn-icon" data-duplicate-id="${cat.id}" title="Duplicate">${ICONS.duplicate}</button>`}
                            <button class="modal-btn btn-edit btn-icon" data-edit-id="${cat.id}" title="${isIcs ? 'Subscription settings' : 'Edit'}">${ICONS.edit}</button>
                            <button class="modal-btn btn-delete btn-icon" data-delete-id="${cat.id}" title="${isIcs ? 'Unsubscribe' : 'Delete'}">${ICONS.delete}</button>
                        </div>
                    </div>`;
            }).join('');
        }
    },

    /**
     * Render parsed categories in import modal
     */
    renderParsedCategories: (preserveSelection = false) => {
        const parsedCategoriesCache = getState.parsedCategoriesCache();
        const categoriesContainer = $('#parsed-categories-container');

        // Preserve current selection state if requested
        let currentSelections = {};
        if (preserveSelection) {
            $$('.import-checkbox').forEach(checkbox => {
                const index = checkbox.id.replace('import-check-', '');
                currentSelections[index] = checkbox.checked;
            });
        }

        categoriesContainer.innerHTML = parsedCategoriesCache.length > 0
            ? parsedCategoriesCache.map((cat, index) => {
                // Determine checked state: preserve existing selection OR default to non-duplicate
                let isChecked;
                if (preserveSelection && currentSelections.hasOwnProperty(index)) {
                    // If preserving and item becomes non-duplicate, check it; if duplicate, uncheck it
                    isChecked = cat.isDuplicate ? false : (currentSelections[index] || !cat.isDuplicate);
                } else {
                    // Default: only check non-duplicates
                    isChecked = !cat.isDuplicate;
                }

                const datesList = cat.dates.map(date => {
                    if (typeof date === 'string') {
                        // Format single date for display (YYYY-MM-DD to readable format)
                        const d = new Date(date + 'T12:00:00Z');
                        return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
                    } else if (date.start && date.end) {
                        // Format date range
                        const startD = new Date(date.start + 'T12:00:00Z');
                        const endD = new Date(date.end + 'T12:00:00Z');
                        return `${startD.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${endD.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;
                    }
                    return '';
                }).filter(Boolean);

                const briefcaseSVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="7" width="20" height="14" rx="2" ry="2"></rect><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"></path></svg>`;
                const excludeIcon = cat.excludeHolidays ? `<span class="exclude-icon" title="Counts workdays only">${briefcaseSVG}</span>` : '';

                return `
                <div class="import-preview-card ${cat.isDuplicate ? 'is-duplicate' : ''}" data-index="${index}">
                    <div class="import-preview-card-header">
                        <input type="checkbox" id="import-check-${index}" class="import-checkbox" ${isChecked ? 'checked' : ''}>
                        <span class="color-dot" style="background-color: ${cat.color};"></span>
                        <span class="name-display">${cat.emoji} ${cat.name} ${excludeIcon}</span>
                        <div class="import-card-actions">
                            <button class="modal-btn btn-info btn-icon" data-duplicate-parsed-index="${index}" title="Duplicate">${ICONS.duplicate}</button>
                            <button class="modal-btn btn-edit btn-icon" data-edit-parsed-index="${index}" title="Edit">${ICONS.edit}</button>
                            <button class="modal-btn btn-delete btn-icon" data-delete-parsed-index="${index}" title="Delete">${ICONS.delete}</button>
                        </div>
                    </div>
                    <div class="import-dates-preview">
                        <strong>${cat.dates.length} date${cat.dates.length === 1 ? '' : 's'}:</strong> ${datesList.join(', ')}
                    </div>
                    <div class="import-duplicate-warning">Name already exists. Please edit.</div>
                </div>`;
            }).join('')
            : '<p>No valid events found. Please check your format.</p>';
    },

    /**
     * Update import button state based on duplicates
     */
    updateImportButtonState: () => {
        const hasDuplicate = [...$$('.import-checkbox:checked')].some(cb => cb.closest('.import-preview-card').classList.contains('is-duplicate'));
        $('#confirm-import-btn').disabled = hasDuplicate;
        UI.updateSelectAllState();
    },

    /**
     * Update Select All checkbox state based on non-duplicate items
     */
    updateSelectAllState: () => {
        const selectAllCheckbox = $('#import-select-all');
        if (!selectAllCheckbox) return;

        const nonDuplicateCheckboxes = [...$$('.import-checkbox')].filter(cb =>
            !cb.closest('.import-preview-card').classList.contains('is-duplicate')
        );

        if (nonDuplicateCheckboxes.length === 0) {
            selectAllCheckbox.checked = false;
            selectAllCheckbox.indeterminate = false;
            return;
        }

        const checkedCount = nonDuplicateCheckboxes.filter(cb => cb.checked).length;

        if (checkedCount === 0) {
            selectAllCheckbox.checked = false;
            selectAllCheckbox.indeterminate = false;
        } else if (checkedCount === nonDuplicateCheckboxes.length) {
            selectAllCheckbox.checked = true;
            selectAllCheckbox.indeterminate = false;
        } else {
            selectAllCheckbox.checked = false;
            selectAllCheckbox.indeterminate = true;
        }
    },

    /**
     * Update theme control button
     */
    updateThemeControl: (theme) => {
        // Legacy single button support
        const btn = $('#theme-toggle-btn');
        if (btn) btn.innerHTML = theme === 'midnight' ? `<span>☀️</span><span>Light Mode</span>` : `<span>🌙</span><span>Dark Mode</span>`;
        // Segmented theme toggle support
        const lightBtn = $('#theme-light-btn');
        const darkBtn = $('#theme-dark-btn');
        if (lightBtn && darkBtn) {
            const isDark = theme === 'midnight';
            lightBtn.classList.toggle('active', !isDark);
            darkBtn.classList.toggle('active', isDark);
        }
    },

    /**
     * Add current month as date range
     */
    addCurrentMonth: (container) => {
        const today = new Date();
        const year = today.getFullYear();
        const month = today.getMonth();

        // First day of current month
        const startDate = new Date(year, month, 1);
        // Last day of current month
        const endDate = new Date(year, month + 1, 0);

        const startFormatted = `${String(startDate.getDate()).padStart(2, '0')}-${String(startDate.getMonth() + 1).padStart(2, '0')}-${startDate.getFullYear()}`;
        const endFormatted = `${String(endDate.getDate()).padStart(2, '0')}-${String(endDate.getMonth() + 1).padStart(2, '0')}-${endDate.getFullYear()}`;

        UI.addDateEntry('range', startFormatted, endFormatted, container);
    },

    /**
     * Add next 7 days as date range
     */
    addNext7Days: (container) => {
        const today = new Date();
        const endDate = new Date(today);
        endDate.setDate(today.getDate() + 6); // +6 because today counts as day 1

        const startFormatted = `${String(today.getDate()).padStart(2, '0')}-${String(today.getMonth() + 1).padStart(2, '0')}-${today.getFullYear()}`;
        const endFormatted = `${String(endDate.getDate()).padStart(2, '0')}-${String(endDate.getMonth() + 1).padStart(2, '0')}-${endDate.getFullYear()}`;

        UI.addDateEntry('range', startFormatted, endFormatted, container);
    },

    /**
     * Add today as single date
     */
    addToday: (container) => {
        const today = new Date();
        const formatted = `${String(today.getDate()).padStart(2, '0')}-${String(today.getMonth() + 1).padStart(2, '0')}-${today.getFullYear()}`;
        UI.addDateEntry('single', formatted, '', container);
    },

    /**
     * Add tomorrow as single date
     */
    addTomorrow: (container) => {
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        const formatted = `${String(tomorrow.getDate()).padStart(2, '0')}-${String(tomorrow.getMonth() + 1).padStart(2, '0')}-${tomorrow.getFullYear()}`;
        UI.addDateEntry('single', formatted, '', container);
    },

    /**
     * Add this weekend as date range
     */
    addThisWeekend: (container) => {
        const today = new Date();
        const dayOfWeek = today.getDay();

        // Calculate this Saturday
        const saturday = new Date(today);
        saturday.setDate(today.getDate() + (6 - dayOfWeek));

        // Calculate this Sunday
        const sunday = new Date(saturday);
        sunday.setDate(saturday.getDate() + 1);

        const satFormatted = `${String(saturday.getDate()).padStart(2, '0')}-${String(saturday.getMonth() + 1).padStart(2, '0')}-${saturday.getFullYear()}`;
        const sunFormatted = `${String(sunday.getDate()).padStart(2, '0')}-${String(sunday.getMonth() + 1).padStart(2, '0')}-${sunday.getFullYear()}`;

        UI.addDateEntry('range', satFormatted, sunFormatted, container);
    },

    /**
     * Add work week (Monday-Friday) as date range
     */
    addWorkWeek: (container) => {
        const today = new Date();
        const dayOfWeek = today.getDay();

        // Calculate this Monday
        const monday = new Date(today);
        const daysFromMonday = dayOfWeek === 0 ? -6 : -(dayOfWeek - 1);
        monday.setDate(today.getDate() + daysFromMonday);

        // Calculate this Friday
        const friday = new Date(monday);
        friday.setDate(monday.getDate() + 4);

        const monFormatted = `${String(monday.getDate()).padStart(2, '0')}-${String(monday.getMonth() + 1).padStart(2, '0')}-${monday.getFullYear()}`;
        const friFormatted = `${String(friday.getDate()).padStart(2, '0')}-${String(friday.getMonth() + 1).padStart(2, '0')}-${friday.getFullYear()}`;

        UI.addDateEntry('range', monFormatted, friFormatted, container);
    },

    /**
     * Add every Monday in current year
     */
    addEveryMonday: (container) => {
        const currentYear = getState.currentYear();
        const mondays = [];

        // Start from January 1st of current year
        let date = new Date(currentYear, 0, 1);

        // Find the first Monday
        while (date.getDay() !== 1) {
            date.setDate(date.getDate() + 1);
        }

        // Collect all Mondays for the year
        while (date.getFullYear() === currentYear) {
            const formatted = `${String(date.getDate()).padStart(2, '0')}-${String(date.getMonth() + 1).padStart(2, '0')}-${date.getFullYear()}`;
            mondays.push(formatted);
            date.setDate(date.getDate() + 7); // Next Monday
        }

        // Add each Monday as individual single date
        mondays.forEach(mondayDate => {
            UI.addDateEntry('single', mondayDate, '', container);
        });
    },

    /**
     * Add all weekdays (Mon-Fri) for current month
     */
    addWeekdays: (container) => {
        const today = new Date();
        const year = today.getFullYear();
        const month = today.getMonth();

        // Get first and last day of current month
        const firstDay = new Date(year, month, 1);
        const lastDay = new Date(year, month + 1, 0);

        const weekdays = [];
        const currentDate = new Date(firstDay);

        // Iterate through all days in the month
        while (currentDate <= lastDay) {
            const dayOfWeek = currentDate.getDay();
            // Monday = 1, Tuesday = 2, ..., Friday = 5
            if (dayOfWeek >= 1 && dayOfWeek <= 5) {
                const formatted = `${String(currentDate.getDate()).padStart(2, '0')}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${currentDate.getFullYear()}`;
                weekdays.push(formatted);
            }
            currentDate.setDate(currentDate.getDate() + 1);
        }

        // Add as single range if consecutive, or multiple ranges if there are gaps
        if (weekdays.length > 0) {
            UI.addDateEntry('range', weekdays[0], weekdays[weekdays.length - 1], container);
        }
    },

    /**
     * Add every Friday in current year
     */
    addEveryFriday: (container) => {
        const currentYear = getState.currentYear();
        const fridays = [];

        // Start from January 1st of current year
        let date = new Date(currentYear, 0, 1);

        // Find the first Friday
        while (date.getDay() !== 5) {
            date.setDate(date.getDate() + 1);
        }

        // Collect all Fridays for the year
        while (date.getFullYear() === currentYear) {
            const formatted = `${String(date.getDate()).padStart(2, '0')}-${String(date.getMonth() + 1).padStart(2, '0')}-${date.getFullYear()}`;
            fridays.push(formatted);
            date.setDate(date.getDate() + 7); // Next Friday
        }

        // Add each Friday as individual single date
        fridays.forEach(fridayDate => {
            UI.addDateEntry('single', fridayDate, '', container);
        });
    },

    /**
     * Add same date every month (15th of each month in current year)
     */
    addMonthly: (container) => {
        const today = new Date();
        const currentYear = getState.currentYear();
        const dayOfMonth = 15; // Using 15th as default - could be made configurable

        const monthlyDates = [];

        // Add 15th of each month in current year
        for (let month = 0; month < 12; month++) {
            const date = new Date(currentYear, month, dayOfMonth);
            // Check if the date is valid (handles months with fewer days)
            if (date.getMonth() === month) {
                const formatted = `${String(date.getDate()).padStart(2, '0')}-${String(date.getMonth() + 1).padStart(2, '0')}-${date.getFullYear()}`;
                monthlyDates.push(formatted);
            }
        }

        // Add each monthly date as individual single date
        monthlyDates.forEach(monthlyDate => {
            UI.addDateEntry('single', monthlyDate, '', container);
        });
    },

    /**
     * Add last week of current month
     */
    addLastWeekOfMonth: (container) => {
        const today = new Date();
        const currentYear = today.getFullYear();
        const currentMonth = today.getMonth();

        // Get last day of current month
        const lastDay = new Date(currentYear, currentMonth + 1, 0);
        const lastDate = lastDay.getDate();

        // Find last Monday of the month
        let lastMonday = new Date(currentYear, currentMonth, lastDate);
        while (lastMonday.getDay() !== 1) {
            lastMonday.setDate(lastMonday.getDate() - 1);
        }

        // Get the Friday of that week (4 days later)
        const lastFriday = new Date(lastMonday);
        lastFriday.setDate(lastMonday.getDate() + 4);

        const mondayFormatted = `${String(lastMonday.getDate()).padStart(2, '0')}-${String(lastMonday.getMonth() + 1).padStart(2, '0')}-${lastMonday.getFullYear()}`;
        const fridayFormatted = `${String(lastFriday.getDate()).padStart(2, '0')}-${String(lastFriday.getMonth() + 1).padStart(2, '0')}-${lastFriday.getFullYear()}`;

        UI.addDateEntry('range', mondayFormatted, fridayFormatted, container);
    },

    /**
     * Add every weekend in current year
     */
    addEveryWeekend: (container) => {
        const currentYear = getState.currentYear();
        const weekends = [];

        // Start from January 1st of current year
        let date = new Date(currentYear, 0, 1);

        // Find the first Saturday
        while (date.getDay() !== 6) {
            date.setDate(date.getDate() + 1);
        }

        // Collect all weekends (Saturday-Sunday) for the year
        while (date.getFullYear() === currentYear) {
            const saturday = new Date(date);
            const sunday = new Date(date);
            sunday.setDate(saturday.getDate() + 1);

            // Only add if Sunday is still in the same year
            if (sunday.getFullYear() === currentYear) {
                const satFormatted = `${String(saturday.getDate()).padStart(2, '0')}-${String(saturday.getMonth() + 1).padStart(2, '0')}-${saturday.getFullYear()}`;
                const sunFormatted = `${String(sunday.getDate()).padStart(2, '0')}-${String(sunday.getMonth() + 1).padStart(2, '0')}-${sunday.getFullYear()}`;
                weekends.push({start: satFormatted, end: sunFormatted});
            }

            // Move to next Saturday
            date.setDate(date.getDate() + 7);
        }

        weekends.forEach(weekend => {
            UI.addDateEntry('range', weekend.start, weekend.end, container);
        });
    },

    /**
     * Clear all dates from container
     */
    clearAllDates: (container) => {
        container.innerHTML = '';
        UI.updateClearAllButton(container);
    },

    /**
     * Update visibility of clear all button based on content
     */
    updateClearAllButton: (container) => {
        const datesGroup = container.closest('[id$="-dates-group"]');
        const clearBtn = datesGroup?.querySelector('.clear-all-dates-btn');
        if (clearBtn) {
            clearBtn.style.display = container.children.length > 0 ? 'flex' : 'none';
        }
    },

    /**
     * Show undo toast notification
     */
    showUndoToast: (message, undoAction) => {
        const toast = $('#undo-toast');
        const messageEl = $('#undo-message');
        const undoBtn = $('#undo-action');

        if (!toast || !messageEl || !undoBtn) return;

        messageEl.textContent = message;
        toast.style.display = 'block';

        // Remove old listeners and add new one
        const newUndoBtn = undoBtn.cloneNode(true);
        undoBtn.parentNode.replaceChild(newUndoBtn, undoBtn);

        newUndoBtn.addEventListener('click', () => {
            undoAction();
            UI.hideUndoToast();
        });

        // Auto-hide after 6 seconds
        setTimeout(() => {
            if (toast.style.display === 'block') {
                UI.hideUndoToast();
            }
        }, 6000);
    },

    /**
     * Hide undo toast notification
     */
    hideUndoToast: () => {
        const toast = $('#undo-toast');
        if (toast) {
            toast.style.display = 'none';
            setState.undoState(null);
        }
    },

    /**
     * Create undo state for category deletion
     */
    createCategoryUndo: (category) => {
        const config = getState.config();
        const categoryIndex = config.eventCategories.findIndex(c => c.id === category.id);

        setState.undoState({
            type: 'category_delete',
            data: { category, index: categoryIndex }
        });

        UI.showUndoToast(`"${category.name}" deleted`, () => {
            const currentConfig = getState.config();
            const undoData = getState.undoState();

            if (undoData && undoData.type === 'category_delete') {
                currentConfig.eventCategories.splice(undoData.data.index, 0, undoData.data.category);
                setState.config(currentConfig);
                Store.save();
                UI.populateCategoryList();
            }
        });
    },

    /**
     * Create undo state for date removal
     */
    createDateUndo: (dateItem, container) => {
        const isRange = dateItem.classList.contains('range');
        const startInput = dateItem.querySelector('.date-display-input');
        const endInput = dateItem.querySelector('.date-input-end');

        const undoData = {
            type: 'date_remove',
            data: {
                isRange,
                startDate: startInput.value,
                endDate: isRange ? endInput.value : '',
                container
            }
        };

        setState.undoState(undoData);

        UI.showUndoToast('Date removed', () => {
            const currentUndo = getState.undoState();
            if (currentUndo && currentUndo.type === 'date_remove') {
                const { isRange, startDate, endDate, container } = currentUndo.data;
                UI.addDateEntry(isRange ? 'range' : 'single', startDate, endDate, container);
            }
        });
    },

    /**
     * Create undo state for clear all dates
     */
    createClearAllUndo: (container) => {
        const dateItems = [...container.children];
        const datesData = dateItems.map(item => {
            const isRange = item.classList.contains('range');
            const startInput = item.querySelector('.date-display-input');
            const endInput = item.querySelector('.date-input-end');

            return {
                isRange,
                startDate: startInput.value,
                endDate: isRange ? endInput.value : ''
            };
        });

        setState.undoState({
            type: 'clear_all_dates',
            data: { datesData, container }
        });

        UI.showUndoToast(`${datesData.length} dates cleared`, () => {
            const currentUndo = getState.undoState();
            if (currentUndo && currentUndo.type === 'clear_all_dates') {
                const { datesData, container } = currentUndo.data;
                datesData.forEach(dateData => {
                    UI.addDateEntry(
                        dateData.isRange ? 'range' : 'single',
                        dateData.startDate,
                        dateData.endDate,
                        container
                    );
                });
            }
        });
    },

    /**
     * Show category name suggestions
     */
    showNameSuggestions: (inputElement) => {
        const container = inputElement.parentElement;
        const suggestionsDiv = container.querySelector('.name-suggestions');

        // Early return if suggestions div doesn't exist
        if (!suggestionsDiv) {
            return;
        }

        const inputValue = inputElement.value.trim();
        const smartSuggestions = Utils.getSmartCategoryNameSuggestions();
        const suggestions = Utils.getSuggestedCategoryNames(inputValue);

        let html = '';

        // Smart suggestions (recent + most used combined)
        if (smartSuggestions.length > 0 && (!inputValue || smartSuggestions.some(name =>
            name.toLowerCase().includes(inputValue.toLowerCase())))) {
            const filteredSmart = inputValue ?
                smartSuggestions.filter(name => name.toLowerCase().includes(inputValue.toLowerCase())) :
                smartSuggestions;

            if (filteredSmart.length > 0) {
                html += `
                    <div class="name-suggestion-section">
                        <div class="name-suggestion-title">Smart Suggestions</div>
                        ${filteredSmart.map(name =>
                            `<button type="button" class="name-suggestion-item smart" data-name="${name}">${name}</button>`
                        ).join('')}
                    </div>
                `;
            }
        }

        // Popular suggestions
        if (suggestions.length > 0) {
            html += `
                <div class="name-suggestion-section">
                    <div class="name-suggestion-title">${inputValue ? 'Matching' : 'Popular'}</div>
                    ${suggestions.map(name =>
                        `<button type="button" class="name-suggestion-item popular" data-name="${name}">${name}</button>`
                    ).join('')}
                </div>
            `;
        }

        if (html) {
            suggestionsDiv.innerHTML = html;
            suggestionsDiv.style.display = 'block';

            // Add click handlers
            suggestionsDiv.querySelectorAll('.name-suggestion-item').forEach(item => {
                item.addEventListener('click', () => {
                    const selectedName = item.dataset.name;
                    inputElement.value = selectedName;
                    suggestionsDiv.style.display = 'none';
                    inputElement.focus();

                    // Trigger input event for any listeners
                    inputElement.dispatchEvent(new Event('input', { bubbles: true }));
                });
            });
        } else {
            suggestionsDiv.style.display = 'none';
        }
    },

    /**
     * Hide category name suggestions
     */
    hideNameSuggestions: (inputElement) => {
        const container = inputElement.parentElement;
        const suggestionsDiv = container.querySelector('.name-suggestions');
        if (suggestionsDiv) {
            setTimeout(() => {
                suggestionsDiv.style.display = 'none';
            }, 150); // Small delay to allow for clicks
        }
    },

    /**
     * Show emoji picker modal
     */
    showEmojiPickerModal: (inputId) => {
        // Get smart suggestions (EXACTLY like original)
        const mostUsed = Utils.getMostUsedEmojis();
        const recent = Utils.getRecentEmojis();
        const popular = Utils.getPopularEmojis();
        const categories = Utils.getEmojiCategories();

        // Build emoji picker content WITHOUT header (modal already has header)
        const emojiPickerHTML = `
            <div class="emoji-picker-header">
                <div class="search-input-wrapper">
                    <input type="text"
                           id="emoji-search-input"
                           class="emoji-search-input"
                           placeholder="Search emojis..."
                           autocomplete="off">
                    <button type="button" class="emoji-search-clear" style="display: none;">
                        <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                            <path d="M9 3L3 9M3 3L9 9" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
                        </svg>
                    </button>
                </div>
            </div>
            <div class="emoji-picker-content">

                <!-- Search Results -->
                <div class="emoji-search-results" style="display: none;">
                    <div class="emoji-grid" id="search-results-grid"></div>
                </div>

                <!-- Smart Suggestions -->
                ${(mostUsed.length > 0 || recent.length > 0) ? `
                    <div class="emoji-section">
                        <div class="emoji-section-title">Smart Suggestions</div>
                        <div class="emoji-grid">
                            ${[...new Set([...recent, ...mostUsed])].slice(0, 16).map(emoji => {
                                const validatedEmoji = Utils.validateEmoji(emoji);
                                return `<button type="button" class="emoji-btn" data-emoji="${emoji}" title="${emoji}">${validatedEmoji}</button>`;
                            }).join('')}
                        </div>
                    </div>
                ` : ''}

                <!-- Category Tabs with Navigation -->
                <div class="emoji-picker-tabs-container">
                    <button class="emoji-nav-btn emoji-nav-left" type="button">‹</button>
                    <div class="emoji-picker-tabs">
                        <div class="emoji-tab-item active" data-category="popular">Popular</div>
                        ${Object.keys(categories).map(category =>
                            `<div class="emoji-tab-item" data-category="${category}">${category.split(' ')[0]}</div>`
                        ).join('')}
                    </div>
                    <button class="emoji-nav-btn emoji-nav-right" type="button">›</button>
                </div>

                <!-- Category Content -->
                <div class="emoji-picker-categories">
                    <div class="emoji-category active" data-category="popular">
                        <div class="emoji-grid">
                            ${popular.map(emoji => {
                                const validatedEmoji = Utils.validateEmoji(emoji);
                                return `<button type="button" class="emoji-btn" data-emoji="${emoji}" title="${emoji}">${validatedEmoji}</button>`;
                            }).join('')}
                        </div>
                    </div>
                    ${Object.entries(categories).map(([categoryName, emojis]) => `
                        <div class="emoji-category" data-category="${categoryName}">
                            <div class="emoji-grid">
                                ${emojis.map(emoji => {
                                    const validatedEmoji = Utils.validateEmoji(emoji);
                                    return `<button type="button" class="emoji-btn" data-emoji="${emoji}" title="${emoji}">${validatedEmoji}</button>`;
                                }).join('')}
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;

        // Insert into modal body
        $('#emoji-picker-modal .modal-body').innerHTML = emojiPickerHTML;

        // Set up EXACTLY the original functionality
        const modalBody = $('#emoji-picker-modal .modal-body');

        // Setup navigation buttons (EXACTLY like original)
        const tabsContainer = modalBody.querySelector('.emoji-picker-tabs');
        const leftBtn = modalBody.querySelector('.emoji-nav-left');
        const rightBtn = modalBody.querySelector('.emoji-nav-right');

        const updateNavButtons = () => {
            if (tabsContainer.scrollLeft <= 0) {
                leftBtn.disabled = true;
                leftBtn.style.opacity = '0.3';
            } else {
                leftBtn.disabled = false;
                leftBtn.style.opacity = '1';
            }

            if (tabsContainer.scrollLeft >= tabsContainer.scrollWidth - tabsContainer.clientWidth) {
                rightBtn.disabled = true;
                rightBtn.style.opacity = '0.3';
            } else {
                rightBtn.disabled = false;
                rightBtn.style.opacity = '1';
            }
        };

        leftBtn.addEventListener('click', () => {
            tabsContainer.scrollBy({ left: -120, behavior: 'smooth' });
            setTimeout(updateNavButtons, 300);
        });

        rightBtn.addEventListener('click', () => {
            tabsContainer.scrollBy({ left: 120, behavior: 'smooth' });
            setTimeout(updateNavButtons, 300);
        });

        tabsContainer.addEventListener('scroll', updateNavButtons);
        updateNavButtons(); // Initial state

        // Add event listeners (EXACTLY like original)
        modalBody.addEventListener('click', (e) => {
            if (e.target.matches('.emoji-btn')) {
                const emoji = e.target.dataset.emoji;
                const input = $(`#${inputId}`);
                if (input) {
                    // Replace existing value with single emoji (only one emoji allowed)
                    input.value = emoji;
                    // Trigger change event
                    input.dispatchEvent(new Event('change', { bubbles: true }));

                    // Save usage
                    Utils.saveEmojiUsage(emoji);
                    Utils.saveRecentEmoji(emoji);

                    // Close modal after emoji selection
                    UI.showModal('emoji-picker-modal', false);
                }
            } else if (e.target.matches('.emoji-tab-item')) {
                // Switch category (EXACTLY like original)
                modalBody.querySelectorAll('.emoji-tab-item').forEach(tab => tab.classList.remove('active'));
                modalBody.querySelectorAll('.emoji-category').forEach(cat => cat.classList.remove('active'));

                e.target.classList.add('active');
                const category = e.target.dataset.category;
                const targetCategory = modalBody.querySelector(`[data-category="${category}"].emoji-category`);
                if (targetCategory) {
                    targetCategory.classList.add('active');
                }
            }
        });

        // Search functionality (with clear button like Search Categories)
        const searchInput = modalBody.querySelector('#emoji-search-input');
        const searchClear = modalBody.querySelector('.emoji-search-clear');
        const searchResults = modalBody.querySelector('.emoji-search-results');
        const searchGrid = modalBody.querySelector('#search-results-grid');
        const emojiSections = modalBody.querySelector('.emoji-picker-categories');
        const smartSuggestions = modalBody.querySelector('.emoji-section');
        const tabsWrapper = modalBody.querySelector('.emoji-picker-tabs-container');

        let searchTimeout;

        searchInput.addEventListener('input', (e) => {
            const query = e.target.value.trim();
            searchClear.style.display = query ? 'block' : 'none';

            clearTimeout(searchTimeout);
            const debounceTime = query.length === 1 ? 500 : 250;

            searchTimeout = setTimeout(() => {
                if (query.length >= 1) {
                    const results = Utils.searchEmojis(query);

                    if (results.length > 0) {
                        searchGrid.innerHTML = results.map(result => {
                            const validatedEmoji = Utils.validateEmoji(result.emoji);
                            const keywords = result.keywords.slice(0, 2).join(', ');
                            const fuzzyIndicator = keywords.includes('*') ? ' (similar)' : '';
                            return `<button type="button" class="emoji-btn" data-emoji="${result.emoji}" title="${result.emoji} - ${keywords}${fuzzyIndicator}">${validatedEmoji}</button>`;
                        }).join('');

                        searchResults.style.display = 'block';
                        emojiSections.style.display = 'none';
                        if (smartSuggestions) smartSuggestions.style.display = 'none';
                        tabsWrapper.style.display = 'none';
                    } else {
                        const suggestion = query.length < 3 ? 'Try typing more characters...' :
                                         'Try different keywords like "happy", "food", "work"';
                        searchGrid.innerHTML = `
                            <div class="emoji-no-results">
                                <div style="font-size: 2em; margin-bottom: 10px;">😕</div>
                                <div style="margin-bottom: 5px;">No emojis found for "${query}"</div>
                                <div class="emoji-search-hint" style="font-size: 0.9em; opacity: 0.7;">${suggestion}</div>
                            </div>
                        `;
                        searchResults.style.display = 'block';
                        emojiSections.style.display = 'none';
                        if (smartSuggestions) smartSuggestions.style.display = 'none';
                        tabsWrapper.style.display = 'none';
                    }
                } else {
                    searchResults.style.display = 'none';
                    emojiSections.style.display = 'block';
                    if (smartSuggestions) smartSuggestions.style.display = 'block';
                    tabsWrapper.style.display = 'flex';
                }
            }, debounceTime);
        });

        // Search clear functionality
        searchClear.addEventListener('click', () => {
            searchInput.value = '';
            searchClear.style.display = 'none';
            searchInput.focus();
            searchResults.style.display = 'none';
            emojiSections.style.display = 'block';
            if (smartSuggestions) smartSuggestions.style.display = 'block';
            tabsWrapper.style.display = 'flex';
        });

        // Show the modal
        UI.showModal('emoji-picker-modal', true);
    },

    /**
     * Collect the event details for one day, grouped by category.
     * Sources: a subscription's eventsByDate map, and local date entries in
     * object form that carry a title or time. Returns [{ cat, entries }] where
     * entries are { title, time, endTime?, location?, desc? }.
     */
    dayDetailsFor: (dateStr, activityIds = null) => {
        return Model.eventsOnDate(getState.config().eventCategories, dateStr, activityIds)
            .map(({ calendar, events, editable }) => ({ cat: calendar, entries: events, editable }));
    },

    /**
     * Tap/click peek for a day's events: titles, times, locations, notes.
     * Built entirely with textContent, since some titles come from remote
     * feeds. Supports day-to-day navigation and editing local events.
     */
    showDayPeek: (dayEl) => {
        UI.closeDayPeek();
        const dateStr = typeof dayEl === 'string' ? dayEl : dayEl.dataset.date;
        const el = typeof dayEl === 'string'
            ? document.querySelector(`.day[data-date="${dateStr}"]:not(.other-month)`) ||
              document.querySelector(`.day[data-date="${dateStr}"]`)
            : dayEl;

        const ids = el && el.dataset.activities
            ? el.dataset.activities.split(',').filter(Boolean)
            : null;
        const groups = UI.dayDetailsFor(dateStr, ids);
        if (!groups.length && typeof dayEl !== 'string') return;

        const peek = document.createElement('div');
        peek.className = 'day-peek';
        peek.id = 'day-peek';

        // Header: ‹ date › — the arrows walk day by day with the peek open.
        const heading = document.createElement('div');
        heading.className = 'day-peek-header';
        const mkNav = (delta, label) => {
            const btn = document.createElement('button');
            btn.type = 'button';
            btn.className = 'day-peek-nav';
            btn.textContent = delta < 0 ? '‹' : '›';
            btn.title = label;
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                UI.showDayPeek(addDays(dateStr, delta));
            });
            return btn;
        };
        const dateLabel = document.createElement('div');
        dateLabel.className = 'day-peek-date';
        const [y, m, d] = dateStr.split('-').map(Number);
        dateLabel.textContent = new Date(Date.UTC(y, m - 1, d)).toLocaleDateString(undefined,
            { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });
        heading.appendChild(mkNav(-1, 'Previous day'));
        heading.appendChild(dateLabel);
        heading.appendChild(mkNav(1, 'Next day'));
        peek.appendChild(heading);

        // Quick-add straight from the peek: opens the editor with this date
        // (and the details panel) ready to fill.
        const addBtn = document.createElement('button');
        addBtn.type = 'button';
        addBtn.className = 'day-peek-add';
        addBtn.textContent = '+ Add event';
        addBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            import('./events.js').then(({ Events }) => Events.quickAddOnDate(dateStr));
        });
        peek.appendChild(addBtn);

        if (!groups.length) {
            const empty = document.createElement('div');
            empty.className = 'day-peek-empty';
            empty.textContent = 'No events this day';
            peek.appendChild(empty);
        }

        groups.forEach(({ cat, entries, editable }) => {
            const catRow = document.createElement('div');
            catRow.className = 'day-peek-cat';
            catRow.style.setProperty('--peek-color', cat.color || '#0891b2');
            const catName = document.createElement('span');
            catName.textContent = `${cat.emoji || '🔗'} ${cat.name}`;
            catRow.appendChild(catName);
            if (editable) {
                const edit = document.createElement('button');
                edit.type = 'button';
                edit.className = 'day-peek-edit';
                edit.textContent = '✎ Edit';
                edit.title = `Edit "${cat.name}"`;
                edit.addEventListener('click', (e) => {
                    e.stopPropagation();
                    UI.openCategoryEditor(cat.id);
                });
                catRow.appendChild(edit);
            }
            peek.appendChild(catRow);

            entries.forEach(ev => {
                const row = document.createElement('div');
                row.className = 'day-peek-event';

                const head = document.createElement('div');
                head.className = 'day-peek-event-head';
                if (ev.time) {
                    const time = document.createElement('span');
                    time.className = 'day-peek-time';
                    time.textContent = ev.endTime ? `${ev.time}–${ev.endTime}` : ev.time;
                    head.appendChild(time);
                }
                const title = document.createElement('span');
                title.className = 'day-peek-title';
                title.textContent = ev.title;
                head.appendChild(title);
                row.appendChild(head);

                if (ev.location) {
                    const loc = document.createElement('div');
                    loc.className = 'day-peek-loc';
                    loc.textContent = `📍 ${ev.location}`;
                    row.appendChild(loc);
                }
                if (ev.notes) {
                    const desc = document.createElement('div');
                    desc.className = 'day-peek-desc';
                    desc.textContent = ev.notes;
                    row.appendChild(desc);
                }
                peek.appendChild(row);
            });
        });

        document.body.appendChild(peek);

        // Position near the day cell when it is on screen; when the peek was
        // navigated to a date outside the rendered months, stay where it was.
        const rect = el ? el.getBoundingClientRect() : UI._peekRect;
        const pw = peek.offsetWidth, ph = peek.offsetHeight;
        if (rect) {
            let left = rect.left + rect.width / 2 - pw / 2;
            left = Math.max(8, Math.min(left, window.innerWidth - pw - 8));
            let top = rect.bottom + 6;
            if (top + ph > window.innerHeight - 8) top = rect.top - ph - 6;
            peek.style.left = `${Math.round(left)}px`;
            peek.style.top = `${Math.round(Math.max(8, top))}px`;
        } else {
            peek.style.left = `${Math.round((window.innerWidth - pw) / 2)}px`;
            peek.style.top = '80px';
        }
        if (el) UI._peekRect = rect;

        requestAnimationFrame(() => peek.classList.add('visible'));
    },

    closeDayPeek: () => {
        const peek = document.getElementById('day-peek');
        if (peek) peek.remove();
    },

    /**
     * Flatten every titled event — local entries and synced feeds — into
     * [{ date, time, endTime, title, location, notes, cat }] for the search
     * modal and the upcoming strip.
     */
    collectAllEvents: () => {
        return Model.allEvents(getState.config().eventCategories).map(ev => ({
            date: ev.start,
            endDate: ev.end !== ev.start ? ev.end : null,
            time: ev.time,
            endTime: ev.endTime,
            title: ev.title,
            location: ev.location,
            notes: ev.notes,
            cat: ev.calendar
        }));
    },

    /** Compact strip above the calendars: the next few upcoming events. */
    renderUpcomingStrip: () => {
        const strip = $('#upcoming-strip');
        if (!strip) return;

        const today = Utils.formatDate(new Date());
        const upcoming = UI.collectAllEvents()
            .filter(ev => (ev.endDate || ev.date) >= today)
            .sort((a, b) => a.date.localeCompare(b.date) ||
                            (a.time || '99:99').localeCompare(b.time || '99:99'))
            .slice(0, 5);

        strip.textContent = '';
        if (!upcoming.length) { strip.style.display = 'none'; return; }

        const label = document.createElement('span');
        label.className = 'upcoming-label';
        label.textContent = 'Upcoming';
        strip.appendChild(label);

        upcoming.forEach(ev => {
            const chip = document.createElement('button');
            chip.type = 'button';
            chip.className = 'upcoming-chip';
            chip.style.setProperty('--chip-color', ev.cat.color || '#64748b');
            const [y, m, d] = ev.date.split('-').map(Number);
            const when = new Date(Date.UTC(y, m - 1, d)).toLocaleDateString(undefined,
                { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'UTC' });
            const whenEl = document.createElement('span');
            whenEl.className = 'upcoming-when';
            whenEl.textContent = ev.time ? `${when} · ${ev.time}` : when;
            const titleEl = document.createElement('span');
            titleEl.className = 'upcoming-title';
            titleEl.textContent = `${ev.cat.emoji || ''} ${ev.title}`.trim();
            chip.appendChild(whenEl);
            chip.appendChild(titleEl);
            chip.addEventListener('click', () => UI.jumpToDate(ev.date));
            strip.appendChild(chip);
        });
        strip.style.display = 'flex';
    },

    /** Navigate the calendar to a date and open its peek. */
    jumpToDate: (dateStr) => {
        const [y, m] = dateStr.split('-').map(Number);
        setState.currentYear(y);
        setState.currentMonth(m - 1);
        import('./events.js').then(({ Events }) => Events.updateNavigationDisplay?.());
        setTimeout(() => {
            const el = document.querySelector(`.day[data-date="${dateStr}"]:not(.other-month)`) ||
                       document.querySelector(`.day[data-date="${dateStr}"]`);
            if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
            UI.showDayPeek(dateStr);
        }, 150);
    },

    /** Render event-search results for a query. */
    renderEventSearchResults: (query) => {
        const container = $('#event-search-results');
        if (!container) return;
        container.textContent = '';

        const q = (query || '').trim().toLowerCase();
        if (q.length < 2) {
            const hint = document.createElement('div');
            hint.className = 'event-search-hint';
            hint.textContent = 'Type at least two characters to search names, locations, notes, and calendar names.';
            container.appendChild(hint);
            return;
        }

        const today = Utils.formatDate(new Date());
        const matches = UI.collectAllEvents()
            .filter(ev =>
                ev.title.toLowerCase().includes(q) ||
                (ev.location || '').toLowerCase().includes(q) ||
                (ev.notes || '').toLowerCase().includes(q) ||
                ev.cat.name.toLowerCase().includes(q))
            .sort((a, b) => {
                // Future results first (soonest first), then the recent past.
                const aFuture = a.date >= today, bFuture = b.date >= today;
                if (aFuture !== bFuture) return aFuture ? -1 : 1;
                return aFuture ? a.date.localeCompare(b.date) : b.date.localeCompare(a.date);
            })
            .slice(0, 50);

        if (!matches.length) {
            const none = document.createElement('div');
            none.className = 'event-search-hint';
            none.textContent = 'No events match.';
            container.appendChild(none);
            return;
        }

        matches.forEach(ev => {
            const row = document.createElement('button');
            row.type = 'button';
            row.className = 'event-search-row';
            row.style.setProperty('--chip-color', ev.cat.color || '#64748b');

            const [y, m, d] = ev.date.split('-').map(Number);
            const when = new Date(Date.UTC(y, m - 1, d)).toLocaleDateString(undefined,
                { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });

            const whenEl = document.createElement('div');
            whenEl.className = 'event-search-when';
            whenEl.textContent = ev.time ? `${when} · ${ev.time}${ev.endTime ? '–' + ev.endTime : ''}` : when;

            const titleEl = document.createElement('div');
            titleEl.className = 'event-search-title';
            titleEl.textContent = `${ev.cat.emoji || ''} ${ev.title}`.trim();

            row.appendChild(titleEl);
            row.appendChild(whenEl);
            if (ev.location) {
                const locEl = document.createElement('div');
                locEl.className = 'event-search-loc';
                locEl.textContent = `📍 ${ev.location}`;
                row.appendChild(locEl);
            }
            row.addEventListener('click', () => {
                UI.showModal('event-search-modal', false);
                UI.jumpToDate(ev.date);
            });
            container.appendChild(row);
        });
    },

    /**
     * Escape text for safe interpolation into innerHTML.
     * Subscription names can come straight from a remote feed's X-WR-CALNAME,
     * so they are untrusted.
     */
    escapeHtml: (value) => String(value == null ? '' : value)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;'),

    /** Human-readable "time since" for a sync timestamp. */
    formatSyncTime: (timestamp) => {
        if (!timestamp) return 'Never synced';
        const seconds = Math.floor((Date.now() - timestamp) / 1000);
        if (seconds < 60) return 'Synced just now';
        const minutes = Math.floor(seconds / 60);
        if (minutes < 60) return `Synced ${minutes} min ago`;
        const hours = Math.floor(minutes / 60);
        if (hours < 24) return `Synced ${hours}h ago`;
        const days = Math.floor(hours / 24);
        return `Synced ${days}d ago`;
    },

    /** Render the subscription list. */
    populateSubscriptionList: () => {
        const container = $('#subscription-list-container');
        if (!container) return;

        const subscriptions = Sync.getSubscriptions();
        const esc = UI.escapeHtml;

        if (!subscriptions.length) {
            container.innerHTML = `
                <div class="subscription-empty">
                    <div class="subscription-empty-icon">🔗</div>
                    <h3>No calendar subscriptions yet</h3>
                    <p>Add an <code>.ics</code> link from Google Calendar, Outlook, iCloud,
                       or any service that publishes one.</p>
                </div>`;
            return;
        }

        container.innerHTML = subscriptions.map(sub => {
            const disabled = sub.enabled === false;
            const status = sub.lastError
                ? `<span class="subscription-status error" title="${esc(sub.lastError)}">⚠ ${esc(sub.lastError)}</span>`
                : `<span class="subscription-status ok">${esc(UI.formatSyncTime(sub.lastSyncAt))}${
                        sub.dateCount ? ` · ${sub.dateCount} date${sub.dateCount === 1 ? '' : 's'}` : ''
                   }${sub.truncated ? ' · truncated' : ''}</span>`;

            return `
                <div class="subscription-item${disabled ? ' disabled' : ''}" data-subscription-id="${esc(sub.id)}"
                     style="border-left: 3px solid ${esc(sub.color)};">
                    <div class="subscription-main">
                        <span class="subscription-emoji">${esc(sub.emoji || '🔗')}</span>
                        <div class="subscription-text">
                            <div class="subscription-name">
                                ${esc(sub.name || 'Untitled calendar')}
                                ${disabled ? '<span class="subscription-badge">Hidden</span>' : ''}
                            </div>
                            <div class="subscription-url" title="${esc(sub.url)}">${esc(sub.url)}</div>
                            ${status}
                        </div>
                    </div>
                    <div class="subscription-actions">
                        <button type="button" class="icon-btn" data-sync-subscription="${esc(sub.id)}"
                                title="Refresh now" ${sub.syncing ? 'disabled' : ''}>
                            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" width="16" height="16"
                                 stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                <path d="M23 4v6h-6"/><path d="M1 20v-6h6"/>
                                <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/>
                            </svg>
                        </button>
                        <button type="button" class="icon-btn" data-edit-subscription="${esc(sub.id)}" title="Edit">
                            ${ICONS.edit}
                        </button>
                        <button type="button" class="icon-btn danger" data-delete-subscription="${esc(sub.id)}" title="Unsubscribe">
                            ${ICONS.delete}
                        </button>
                    </div>
                </div>`;
        }).join('');
    },

    /** Open the subscription editor; omit the id to add a new one. */
    openSubscriptionEditor: (subscriptionId = null) => {
        const sub = subscriptionId
            ? Sync.getSubscriptions().find(s => s.id === subscriptionId)
            : null;

        $('#subscription-error-message').style.display = 'none';
        $('#subscription-editor-title').textContent = sub ? 'Edit Calendar' : 'Add Calendar';
        $('#subscription-id-input').value = sub ? sub.id : '';
        $('#subscription-url-input').value = sub ? sub.url : '';
        $('#subscription-name-input').value = sub ? (sub.name || '') : '';
        $('#subscription-emoji-input').value = sub ? (sub.emoji || '🔗') : '🔗';
        $('#subscription-color-input').value = sub ? (sub.color || '#0891b2') : '#0891b2';
        $('#subscription-exclude-holidays').checked = sub ? !!sub.excludeHolidays : false;
        $('#subscription-enabled').checked = sub ? sub.enabled !== false : true;
        $('#subscription-delete-btn').style.display = sub ? 'inline-flex' : 'none';

        UI.showModal('ics-subscriptions-modal', true);
        UI.switchModalView('ics-subscriptions-modal', '#subscription-editor-view');
    },

    /** Open the sync settings view. */
    openSubscriptionSettings: () => {
        $('#subscription-interval-input').value = String(Sync.getSyncIntervalMinutes());
        $('#subscription-proxy-input').value = Sync.getProxyUrl();
        const testResult = $('#proxy-test-result');
        if (testResult) testResult.style.display = 'none';
        UI.showModal('ics-subscriptions-modal', true);
        UI.switchModalView('ics-subscriptions-modal', '#subscription-settings-view');
    },

    /** Transient status line under the subscription list. */
    showSyncStatus: (message, kind = 'info') => {
        const el = $('#subscription-sync-status');
        if (!el) return;
        el.textContent = message;
        el.className = `subscription-sync-status ${kind}`;
        el.style.display = 'block';
        clearTimeout(UI._syncStatusTimer);
        UI._syncStatusTimer = setTimeout(() => { el.style.display = 'none'; }, 5000);
    },

    // Mini year overview is deprecated; full year view uses 12 full calendars via UI.rebuild()
};
