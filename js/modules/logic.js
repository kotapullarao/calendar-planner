/**
 * Business Logic Module
 * Contains all business logic functions for calculations, parsing, and data processing
 */

import { getState } from '../core/state.js';
import { MONTH_NAMES } from '../config/constants.js';
import { Utils } from './utils.js';

// Business Logic Object
export const Logic = {
    /**
     * Check if a category name is a duplicate
     */
    checkForDuplicate: (categoryData) => {
        const config = getState.config();
        const nameLower = categoryData.name.trim().toLowerCase();
        return config.eventCategories.some(cat => cat.id !== categoryData.id && cat.name.trim().toLowerCase() === nameLower);
    },

    /**
     * Calculate statistics for all categories
     */
    calculateStats: () => {
        const config = getState.config();
        const currentYear = getState.currentYear();
        const stats = {};
        const publicHolidayDates = Logic.getPublicHolidayDates();
        
        config.eventCategories.forEach(c => {
            let count = 0;
            
            if (c.type === 'group') {
                // For groups, find intersection (dates when ALL child categories are active)
                const childCategories = c.childCategoryIds.map(id => config.eventCategories.find(cat => cat.id === id)).filter(Boolean);
                if (childCategories.length === 0) {
                    stats[c.id] = 0;
                    return;
                }
                
                // Get all dates for each child category
                const childDateSets = childCategories.map(cat => {
                    const dateSet = new Set();
                    cat.dates.forEach(date => {
                        const startDateStr = (typeof date === 'string' ? date : date.start);
                        const endDateStr = (typeof date === 'string' ? date : date.end || date.start);
                        if (!startDateStr || !endDateStr || isNaN(new Date(startDateStr)) || isNaN(new Date(endDateStr))) return;
                        const startDate = new Date(startDateStr + 'T12:00:00Z');
                        const endDate = new Date(endDateStr + 'T12:00:00Z');
                        for (let d = new Date(startDate); d <= endDate; d.setUTCDate(d.getUTCDate() + 1)) {
                            if (d.getUTCFullYear() === currentYear) {
                                dateSet.add(Utils.formatDate(d));
                            }
                        }
                    });
                    return dateSet;
                });
                
                // Find intersection: dates that appear in ALL child categories
                const intersectionDates = new Set();
                if (childDateSets.length > 0) {
                    childDateSets[0].forEach(dateStr => {
                        if (childDateSets.every(dateSet => dateSet.has(dateStr))) {
                            intersectionDates.add(dateStr);
                        }
                    });
                }
                
                // Count intersection dates, respecting holiday exclusions
                intersectionDates.forEach(dateStr => {
                    const d = new Date(dateStr + 'T12:00:00Z');
                    const dayOfWeek = d.getUTCDay();
                    // For group intersections, exclude if ANY child category excludes holidays
                    const shouldExcludeHolidays = childCategories.some(cat => cat.excludeHolidays);
                    if (shouldExcludeHolidays && (dayOfWeek === 0 || dayOfWeek === 6 || publicHolidayDates.has(dateStr))) return;
                    count++;
                });
            } else {
                // For single categories, use existing logic
                const datesToCount = new Set();
                c.dates.forEach(date => {
                    const startDateStr = (typeof date === 'string' ? date : date.start);
                    const endDateStr = (typeof date === 'string' ? date : date.end || date.start);
                    if (!startDateStr || !endDateStr || isNaN(new Date(startDateStr)) || isNaN(new Date(endDateStr))) return;
                    const startDate = new Date(startDateStr + 'T12:00:00Z');
                    const endDate = new Date(endDateStr + 'T12:00:00Z');
                    for (let d = new Date(startDate); d <= endDate; d.setUTCDate(d.getUTCDate() + 1)) {
                        if (d.getUTCFullYear() === currentYear) {
                            datesToCount.add(Utils.formatDate(d));
                        }
                    }
                });

                datesToCount.forEach(dateStr => {
                    const d = new Date(dateStr + 'T12:00:00Z');
                    const dayOfWeek = d.getUTCDay();
                    if (c.excludeHolidays && (dayOfWeek === 0 || dayOfWeek === 6 || publicHolidayDates.has(dateStr))) return;
                    count++;
                });
            }
            
            stats[c.id] = count;
        });
        return stats;
    },

    /**
     * Get all public holiday dates as a Set
     */
    getPublicHolidayDates: () => {
        const config = getState.config();
        const publicHolidayDates = new Set();
        // Only local categories can act as the holiday source. Subscribing to a
        // feed named e.g. "UK Public Holidays" would otherwise silently change
        // the counts of every other category that excludes holidays.
        const publicHolidayCategory = config.eventCategories.find(c =>
            c.type !== 'ics' && c.name.toLowerCase().includes('public holiday'));
        
        if (publicHolidayCategory) {
            publicHolidayCategory.dates.forEach(date => {
                if (typeof date === 'string') publicHolidayDates.add(date);
                else if (date?.start && date.end) {
                    const startDate = new Date(date.start + 'T12:00:00Z');
                    const endDate = new Date(date.end + 'T12:00:00Z');
                    for (let d = new Date(startDate); d <= endDate; d.setUTCDate(d.getUTCDate() + 1)) {
                        publicHolidayDates.add(Utils.formatDate(d));
                    }
                }
            });
        }
        return publicHolidayDates;
    },

    /**
     * Get months that should be displayed based on current filter
     */
    getMonthsToDisplay: () => {
        const activeFilter = getState.activeFilter();
        const currentYear = getState.currentYear();
        const currentMonth = getState.currentMonth();
        const config = getState.config();
        
        // Check if we're in month view (not year overview)
        const isMonthView = typeof document !== 'undefined' && 
            document.getElementById('month-view-btn') && 
            document.getElementById('month-view-btn').classList.contains('active');
        
        if (activeFilter === 'all') {
            if (isMonthView) {
                // Month view: show only current month
                return [{ year: currentYear, month: currentMonth }];
            } else {
                // Year view: show all 12 months
                return Array.from({length: 12}, (_, i) => ({ year: currentYear, month: i }));
            }
        }

        const eventMonths = new Set();
        const category = config.eventCategories.find(c => c.id === activeFilter);
        if (category) {
            const catsToScan = category.type === 'group'
                ? category.childCategoryIds.map(id => config.eventCategories.find(c => c.id === id)).filter(Boolean)
                : [category];
            catsToScan.forEach(cat => {
                cat.dates.forEach(date => {
                    const dStart = new Date((typeof date === 'string' ? date : date.start) + 'T12:00:00Z');
                    const dEnd = new Date((typeof date === 'string' ? date : date.end || date.start) + 'T12:00:00Z');
                    for (let d = dStart; d <= dEnd; d.setUTCDate(d.getUTCDate() + 1)) {
                        if (d.getUTCFullYear() === currentYear) eventMonths.add(`${d.getUTCFullYear()}-${d.getUTCMonth()}`);
                    }
                });
            });
        }
        return [...eventMonths]
            .map(ym => ({ year: parseInt(ym.split('-')[0]), month: parseInt(ym.split('-')[1]) }))
            .sort((a, b) => a.year - b.year || a.month - b.month);
    },

    /**
     * Parse categories from text input
     */
    parseCategoriesFromText: (text) => {
        const currentYear = getState.currentYear();
        text = text.replace(/(KDK Marriage.*?)(\d.*)/i, '$1\n$2');
        const lines = text.split('\n').map(l => l.trim()).filter(l => l && !l.startsWith('--'));
        let categories = [];
        let currentCategory = null;

        lines.forEach((line, index) => {
            const dates = Logic.parseDatesFromText(line);
            const isTitle = dates.length === 0 && line.length > 2;

            if (isTitle) {
                // Create a new category for the title
                currentCategory = {
                    id: `parsed-${Date.now()}-${categories.length}`, 
                    name: line, 
                    emoji: Utils.getEmoji(line),
                    color: Utils.getRandomColor(), 
                    dates: [], 
                    type: 'single', 
                    excludeHolidays: false, 
                    childCategoryIds: []
                };
                categories.push(currentCategory);
            } else if (dates.length > 0) {
                // Add dates to the current category (or create default if none)
                if (!currentCategory) {
                    currentCategory = {
                        id: `parsed-${Date.now()}-${categories.length}`, 
                        name: 'Untitled Events', 
                        emoji: '🗓️',
                        color: Utils.getRandomColor(), 
                        dates: [], 
                        type: 'single', 
                        excludeHolidays: false, 
                        childCategoryIds: []
                    };
                    categories.push(currentCategory);
                }
                currentCategory.dates.push(...dates);
            }
        });
        
        // Remove duplicate dates within each category
        categories.forEach(category => {
            const seenDates = new Set();
            category.dates = category.dates.filter(date => {
                const dateKey = typeof date === 'string' ? date : JSON.stringify(date);
                if (seenDates.has(dateKey)) {
                    return false;
                }
                seenDates.add(dateKey);
                return true;
            });
        });
        
        return categories.filter(c => c.dates.length > 0);
    },

    /**
     * Parse dates from a text line
     */
    parseDatesFromText: (text) => {
        // Use actual current year for parsing, not the calendar display year
        const currentYear = new Date().getFullYear();
        const currentMonth = new Date().getMonth(); // 0-based index
        const dates = new Set();
        let processedText = text.replace(/(\d+)(st|nd|rd|th)/g, '$1').toLowerCase();
        const monthPattern = `(?:${MONTH_NAMES.map(m => m.substring(0, 3).toLowerCase()).join('|')})[a-z]*`;
        const fullMonthPattern = `(?:${MONTH_NAMES.map(m => m.toLowerCase()).join('|')})`;
        
        // PRIORITY STEP 1A: Handle multiple dates with month specified 
        const multipleDatesWithMonthRegex = new RegExp(`(\\d{1,2}(?:[,\\s]+(?:and\\s+|&\\s*)?\\d{1,2})+)\\s+(${monthPattern})`, 'g');
        let match;
        while ((match = multipleDatesWithMonthRegex.exec(processedText)) !== null) {
            const monthIndex = MONTH_NAMES.findIndex(mn => mn.toLowerCase().startsWith(match[2]));
            if (monthIndex !== -1) {
                const days = match[1]
                    .replace(/\s*&\s*/g, ',')
                    .replace(/\s+and\s+/g, ',')
                    .replace(/\s+/g, ',')
                    .replace(/,+/g, ',')
                    .split(',')
                    .map(d => parseInt(d.trim()))
                    .filter(d => d && d >= 1 && d <= 31);
                
                days.forEach(day => {
                    const dateStr = Utils.formatDate(new Date(Date.UTC(currentYear, monthIndex, day)));
                    dates.add(dateStr);
                });
                
                return Array.from(dates);
            }
        }
        
        // PRIORITY STEP 1B: Handle multiple dates without month (use current month)
        const multipleDatesNoMonthRegex = new RegExp(`^\\s*(\\d{1,2}(?:[,\\s]+(?:and\\s+|&\\s*)?\\d{1,2})+)\\s*$`, 'g');
        while ((match = multipleDatesNoMonthRegex.exec(processedText)) !== null) {
            const days = match[1]
                .replace(/\s*&\s*/g, ',')
                .replace(/\s+and\s+/g, ',')
                .replace(/\s+/g, ',')
                .replace(/,+/g, ',')
                .split(',')
                .map(d => parseInt(d.trim()))
                .filter(d => d && d >= 1 && d <= 31);
            
            days.forEach(day => {
                const dateStr = Utils.formatDate(new Date(Date.UTC(currentYear, currentMonth, day)));
                dates.add(dateStr);
            });
            
            return Array.from(dates);
        }
        
        // Step 2: Handle simple date formats that aren't handled by complex patterns below
        // ISO dates: YYYY-MM-DD
        const isoDateRegex = new RegExp(`(?<!\\d-)(\\d{4}-\\d{2}-\\d{2})(?!\\d|-)`, 'g');
        processedText = processedText.replace(isoDateRegex, (match, dateStr) => {
            dates.add(dateStr);
            return ' <<ISO_DATE_PROCESSED>> ';
        });
        
        // DD-MM-YYYY dates
        const ddmmyyyyRegex = new RegExp(`(?<!\\d)(\\d{1,2}-\\d{1,2}-\\d{4})(?!\\d)`, 'g');
        processedText = processedText.replace(ddmmyyyyRegex, (match, dateStr) => {
            const converted = Utils.formatDateForNative(dateStr);
            if (converted) dates.add(converted);
            return ' <<DDMMYYYY_PROCESSED>> ';
        });
        
        // DD/MM/YYYY dates  
        const ddmmyyyySlashRegex = new RegExp(`(?<!\\d)(\\d{1,2}/\\d{1,2}/\\d{4})(?!\\d)`, 'g');
        processedText = processedText.replace(ddmmyyyySlashRegex, (match, dateStr) => {
            const converted = Utils.formatDateForNative(dateStr.replace(/\//g, '-'));
            if (converted) dates.add(converted);
            return ' <<DDMMYYYY_SLASH_PROCESSED>> ';
        });
        
        // Early return if simple formats found dates
        if (dates.size > 0) {
            return Array.from(dates);
        }
        
        const dateRegexes = [
            // Most specific patterns first to prevent overlapping matches
            
            // ISO format ranges: YYYY-MM-DD to YYYY-MM-DD
            { regex: new RegExp(`(\\d{4}-\\d{2}-\\d{2})\\s*(?:to|through|until|thru|-|–|—)\\s*(\\d{4}-\\d{2}-\\d{2})`, 'g'), fn: m => ({ start: m[1], end: m[2] }) },
            
            // DD-MM-YYYY ranges: 01-01-2024 to 05-01-2024
            { regex: new RegExp(`(\\d{1,2}-\\d{1,2}-\\d{4})\\s*(?:to|through|until|thru|-|–|—)\\s*(\\d{1,2}-\\d{1,2}-\\d{4})`, 'g'), fn: m => ({ start: Utils.formatDateForNative(m[1]), end: Utils.formatDateForNative(m[2]) }) },
            
            // DD/MM/YYYY ranges: 01/01/2024 to 05/01/2024
            { regex: new RegExp(`(\\d{1,2}/\\d{1,2}/\\d{4})\\s*(?:to|through|until|thru|-|–|—)\\s*(\\d{1,2}/\\d{1,2}/\\d{4})`, 'g'), fn: m => ({ start: Utils.formatDateForNative(m[1].replace(/\//g, '-')), end: Utils.formatDateForNative(m[2].replace(/\//g, '-')) }) },
            
            // DD.MM.YYYY ranges: 01.01.2024 to 05.01.2024
            { regex: new RegExp(`(\\d{1,2}\\.\\d{1,2}\\.\\d{4})\\s*(?:to|through|until|thru|-|–|—)\\s*(\\d{1,2}\\.\\d{1,2}\\.\\d{4})`, 'g'), fn: m => ({ start: Utils.formatDateForNative(m[1].replace(/\./g, '-')), end: Utils.formatDateForNative(m[2].replace(/\./g, '-')) }) },
            
            // American format MM/DD/YYYY ranges: 01/15/2024 to 01/20/2024
            { regex: new RegExp(`(?:from\\s+)?(\\d{1,2}/\\d{1,2}/\\d{2,4})\\s*(?:to|through|until|thru|-|–|—)\\s*(\\d{1,2}/\\d{1,2}/\\d{2,4})`, 'gi'), fn: m => {
                const date1 = m[1].split('/'); const date2 = m[2].split('/');
                const year1 = date1[2].length === 2 ? '20' + date1[2] : date1[2];
                const year2 = date2[2].length === 2 ? '20' + date2[2] : date2[2];
                return { start: `${year1}-${date1[0].padStart(2, '0')}-${date1[1].padStart(2, '0')}`, end: `${year2}-${date2[0].padStart(2, '0')}-${date2[1].padStart(2, '0')}` };
            }},
            
            // Month DD to Month DD (cross-month ranges): Jan 15 to Feb 20
            { regex: new RegExp(`(${monthPattern})\\s+(\\d{1,2})\\s*(?:to|through|until|thru|-|–|—)\\s*(${monthPattern})\\s+(\\d{1,2})`, 'g'), fn: m => {
                const m1 = MONTH_NAMES.findIndex(mn => mn.toLowerCase().startsWith(m[1]));
                const m2 = MONTH_NAMES.findIndex(mn => mn.toLowerCase().startsWith(m[3]));
                if (m1 === -1 || m2 === -1) return null;
                return { start: Utils.formatDate(new Date(Date.UTC(currentYear, m1, parseInt(m[2])))), end: Utils.formatDate(new Date(Date.UTC(currentYear, m2, parseInt(m[4])))) };
            }},
            
            // DD to DD Month (same month ranges): 15 to 20 January
            { regex: new RegExp(`(\\d{1,2})\\s*(?:to|through|until|thru|-|–|—)\\s*(\\d{1,2})\\s+(${monthPattern})`, 'g'), fn: m => {
                const monthIndex = MONTH_NAMES.findIndex(mn => mn.toLowerCase().startsWith(m[3]));
                if (monthIndex === -1) return null;
                return { start: Utils.formatDate(new Date(Date.UTC(currentYear, monthIndex, parseInt(m[1])))), end: Utils.formatDate(new Date(Date.UTC(currentYear, monthIndex, parseInt(m[2])))) };
            }},
            
            // DD Month to DD Month (same month range): 15 Jan to 20 Jan
            { regex: new RegExp(`(\\d{1,2})\\s+(${monthPattern})\\s*(?:to|through|until|thru|-|–|—)\\s*(\\d{1,2})\\s+(${monthPattern})`, 'g'), fn: m => {
                const m1 = MONTH_NAMES.findIndex(mn => mn.toLowerCase().startsWith(m[2]));
                const m2 = MONTH_NAMES.findIndex(mn => mn.toLowerCase().startsWith(m[4]));
                if (m1 === -1 || m2 === -1) return null;
                return { start: Utils.formatDate(new Date(Date.UTC(currentYear, m1, parseInt(m[1])))), end: Utils.formatDate(new Date(Date.UTC(currentYear, m2, parseInt(m[3])))) };
            }},
            
            // Week/Weekday references: "first Monday of January", "last Friday of December"
            { regex: new RegExp(`(first|second|third|fourth|last|final)\\s+(monday|tuesday|wednesday|thursday|friday|saturday|sunday)\\s+(?:of|in)\\s+(${monthPattern})`, 'g'), fn: m => {
                const monthIndex = MONTH_NAMES.findIndex(mn => mn.toLowerCase().startsWith(m[3]));
                if (monthIndex === -1) return null;
                const weekdayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
                const targetWeekday = weekdayNames.indexOf(m[2]);
                if (targetWeekday === -1) return null;
                
                let date;
                if (m[1] === 'last' || m[1] === 'final') {
                    date = new Date(Date.UTC(currentYear, monthIndex + 1, 0)); // Last day of month
                    while (date.getUTCDay() !== targetWeekday) date.setUTCDate(date.getUTCDate() - 1);
                } else {
                    const occurrence = {'first': 1, 'second': 2, 'third': 3, 'fourth': 4}[m[1]];
                    date = new Date(Date.UTC(currentYear, monthIndex, 1));
                    while (date.getUTCDay() !== targetWeekday) date.setUTCDate(date.getUTCDate() + 1);
                    date.setUTCDate(date.getUTCDate() + (occurrence - 1) * 7);
                    if (date.getUTCMonth() !== monthIndex) return null; // Occurrence doesn't exist
                }
                return Utils.formatDate(date);
            }},
            
            // Every weekday in month: "every Monday in January", "all Fridays in March"
            { regex: new RegExp(`(?:every|all)\\s+(monday|tuesday|wednesday|thursday|friday|saturday|sunday)s?\\s+(?:of|in)\\s+(${monthPattern})`, 'g'), fn: m => {
                const monthIndex = MONTH_NAMES.findIndex(mn => mn.toLowerCase().startsWith(m[2]));
                if (monthIndex === -1) return [];
                const weekdayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
                const targetWeekday = weekdayNames.indexOf(m[1]);
                if (targetWeekday === -1) return [];
                
                const dates = [];
                let date = new Date(Date.UTC(currentYear, monthIndex, 1));
                while (date.getUTCDay() !== targetWeekday) date.setUTCDate(date.getUTCDate() + 1);
                
                while (date.getUTCMonth() === monthIndex) {
                    dates.push(Utils.formatDate(new Date(date)));
                    date.setUTCDate(date.getUTCDate() + 7);
                }
                return dates;
            }},
            
            // Note: Simple single date patterns (ISO, DD-MM-YYYY, DD/MM/YYYY) are handled in Step 2 above
            
            // DD.MM.YYYY single dates: 01.01.2024
            { regex: new RegExp(`(?<!\\d)(\\d{1,2}\\.\\d{1,2}\\.\\d{4})(?!\\d)`, 'g'), fn: m => Utils.formatDateForNative(m[1].replace(/\./g, '-')) },
            
            // Single day-month combinations: DD Month, Month DD
            { regex: new RegExp(`(\\d{1,2})\\s+(${monthPattern})`, 'g'), fn: m => {
                const monthIndex = MONTH_NAMES.findIndex(mn => mn.toLowerCase().startsWith(m[2]));
                if (monthIndex === -1) return null;
                return Utils.formatDate(new Date(Date.UTC(currentYear, monthIndex, parseInt(m[1]))));
            }},
            
            { regex: new RegExp(`(${monthPattern})\\s+(\\d{1,2})(?:st|nd|rd|th)?`, 'g'), fn: m => {
                const monthIndex = MONTH_NAMES.findIndex(mn => mn.toLowerCase().startsWith(m[1]));
                if (monthIndex === -1) return null;
                return Utils.formatDate(new Date(Date.UTC(currentYear, monthIndex, parseInt(m[2]))));
            }},
            
            // Whole month: "January", "Jan", "entire March"
            { regex: new RegExp(`(?:entire|whole|all\\s+of\\s+)?(${fullMonthPattern})(?!\\s+\\d)`, 'g'), fn: m => {
                const monthIndex = MONTH_NAMES.findIndex(mn => mn.toLowerCase() === m[1]);
                if (monthIndex === -1) return [];
                const daysInMonth = new Date(Date.UTC(currentYear, monthIndex + 1, 0)).getUTCDate();
                const dates = [];
                for (let day = 1; day <= daysInMonth; day++) {
                    dates.push(Utils.formatDate(new Date(Date.UTC(currentYear, monthIndex, day))));
                }
                return dates;
            }}
        ];
        
        // Process in order of priority to avoid overlapping matches
        for (const { regex, fn } of dateRegexes) {
            let hasMatches = false;
            processedText = processedText.replace(regex, (match, ...args) => {
                try {
                    const parsed = fn([match, ...args]);
                    if (Array.isArray(parsed)) {
                        parsed.filter(Boolean).forEach(d => {
                            const dateStr = typeof d === 'string' ? d : JSON.stringify(d);
                            dates.add(dateStr);
                        });
                        hasMatches = true;
                    } else if (parsed) {
                        const dateStr = typeof parsed === 'string' ? parsed : JSON.stringify(parsed);
                        dates.add(dateStr);
                        hasMatches = true;
                    }
                } catch (e) {
                    console.warn('Date parsing error:', e, 'for match:', match);
                }
                return '<<PARSED>>'; // Use unique placeholder to prevent re-matching
            });
            
            // If we found matches with this pattern, clean up and break early for overlapping patterns
            if (hasMatches) {
                processedText = processedText.replace(/<<PARSED>>/g, ' ');
            }
        }
        
        // Convert back from Set, handling both string dates and date range objects
        const uniqueDates = Array.from(dates).map(d => {
            try {
                return d.startsWith('{') ? JSON.parse(d) : d;
            } catch (e) {
                return d;
            }
        }).filter(Boolean);
        
        return uniqueDates;
    },

    /**
     * Get event counts per month for the current year
     */
    getEventCounts: () => {
        const config = getState.config();
        const currentYear = getState.currentYear();
        const monthlyCounts = Array.from({length: 12}, (_, month) => ({
            year: currentYear,
            month: month,
            count: 0
        }));
        
        config.eventCategories.forEach(category => {
            if (category.type === 'group') {
                // For groups, count dates when ALL child categories are active
                const childCategories = category.childCategoryIds
                    .map(id => config.eventCategories.find(cat => cat.id === id))
                    .filter(Boolean);
                
                if (childCategories.length === 0) return;
                
                // Get all dates for each child category
                const childDateSets = childCategories.map(cat => {
                    const dateSet = new Set();
                    cat.dates.forEach(date => {
                        const startDateStr = (typeof date === 'string' ? date : date.start);
                        const endDateStr = (typeof date === 'string' ? date : date.end || date.start);
                        if (!startDateStr || !endDateStr) return;
                        
                        const startDate = new Date(startDateStr + 'T12:00:00Z');
                        const endDate = new Date(endDateStr + 'T12:00:00Z');
                        for (let d = new Date(startDate); d <= endDate; d.setUTCDate(d.getUTCDate() + 1)) {
                            if (d.getUTCFullYear() === currentYear) {
                                dateSet.add(d.toISOString().split('T')[0]);
                            }
                        }
                    });
                    return dateSet;
                });
                
                // Find intersection: dates that appear in ALL child categories
                if (childDateSets.length > 0) {
                    const intersection = [...childDateSets[0]].filter(date =>
                        childDateSets.every(set => set.has(date))
                    );
                    
                    intersection.forEach(dateStr => {
                        const d = new Date(dateStr + 'T12:00:00Z');
                        const month = d.getUTCMonth();
                        monthlyCounts[month].count++;
                    });
                }
            } else {
                // For single categories, count all their dates
                category.dates.forEach(date => {
                    const startDateStr = (typeof date === 'string' ? date : date.start);
                    const endDateStr = (typeof date === 'string' ? date : date.end || date.start);
                    if (!startDateStr || !endDateStr) return;
                    
                    const startDate = new Date(startDateStr + 'T12:00:00Z');
                    const endDate = new Date(endDateStr + 'T12:00:00Z');
                    for (let d = new Date(startDate); d <= endDate; d.setUTCDate(d.getUTCDate() + 1)) {
                        if (d.getUTCFullYear() === currentYear) {
                            const month = d.getUTCMonth();
                            monthlyCounts[month].count++;
                        }
                    }
                });
            }
        });
        
        return monthlyCounts;
    },

    /**
     * Get categories that have events on a specific date
     */
    getCategoriesByDate: (dateStr) => {
        const config = getState.config();
        const targetDate = new Date(dateStr + 'T12:00:00Z');
        const matchingCategories = [];
        
        config.eventCategories.forEach(category => {
            let hasEventOnDate = false;
            
            if (category.type === 'group') {
                // For groups, check if ALL child categories have events on this date
                const childCategories = category.childCategoryIds
                    .map(id => config.eventCategories.find(cat => cat.id === id))
                    .filter(Boolean);
                
                if (childCategories.length === 0) return;
                
                const allChildrenHaveEvent = childCategories.every(cat => {
                    return cat.dates.some(date => {
                        const startDateStr = (typeof date === 'string' ? date : date.start);
                        const endDateStr = (typeof date === 'string' ? date : date.end || date.start);
                        if (!startDateStr || !endDateStr) return false;
                        
                        const startDate = new Date(startDateStr + 'T12:00:00Z');
                        const endDate = new Date(endDateStr + 'T12:00:00Z');
                        return targetDate >= startDate && targetDate <= endDate;
                    });
                });
                
                hasEventOnDate = allChildrenHaveEvent;
            } else {
                // For single categories, check if any date range includes this date
                hasEventOnDate = category.dates.some(date => {
                    const startDateStr = (typeof date === 'string' ? date : date.start);
                    const endDateStr = (typeof date === 'string' ? date : date.end || date.start);
                    if (!startDateStr || !endDateStr) return false;
                    
                    const startDate = new Date(startDateStr + 'T12:00:00Z');
                    const endDate = new Date(endDateStr + 'T12:00:00Z');
                    return targetDate >= startDate && targetDate <= endDate;
                });
            }
            
            if (hasEventOnDate) {
                matchingCategories.push(category);
            }
        });
        
        return matchingCategories;
    }
};