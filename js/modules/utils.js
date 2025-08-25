/**
 * Utility Functions Module
 * Contains all utility functions for date formatting, validation, and other helpers
 */

// Utility Functions Object
export const Utils = {
    /**
     * Format a Date object to YYYY-MM-DD string
     */
    formatDate: date => {
        const year = date.getUTCFullYear();
        const month = String(date.getUTCMonth() + 1).padStart(2, '0');
        const day = String(date.getUTCDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    },

    /**
     * Convert YYYY-MM-DD to DD-MM-YYYY for display
     */
    formatDateForDisplay: (dateStr) => {
        if (!dateStr || !/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return '';
        const [year, month, day] = dateStr.split('-');
        return `${day}-${month}-${year}`;
    },

    /**
     * Convert DD-MM-YYYY to YYYY-MM-DD for native inputs
     */
    formatDateForNative: (dateStr) => {
        if (!dateStr || !/^\d{1,2}-\d{1,2}-\d{4}$/.test(dateStr)) return '';
        const [day, month, year] = dateStr.split('-');
        // Ensure day and month are zero-padded
        return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
    },

    /**
     * Validate DD-MM-YYYY date format
     */
    validateDate: (dateStr) => {
        if (!/^\d{1,2}-\d{1,2}-\d{4}$/.test(dateStr)) return false;
        const [day, month, year] = dateStr.split('-').map(Number);
        if (month < 1 || month > 12 || day < 1 || year < 1000) return false;

        const date = new Date(year, month - 1, day);
        return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day;
    },

    /**
     * Check if a date falls within any of the given date ranges
     */
    isDateInRanges: (date, ranges) => {
        if (!ranges) return false;
        const formattedDate = Utils.formatDate(date);
        return ranges.some(range => {
            if (typeof range === 'string') return formattedDate === range;
            return range?.start && range?.end && formattedDate >= range.start && formattedDate <= range.end;
        });
    },

    /**
     * Generate a random hex color
     */
    getRandomColor: () => '#' + Math.floor(Math.random() * 16777215).toString(16).padStart(6, '0'),

    /**
     * Get appropriate emoji for a given title/keyword
     */
    getEmoji: (title) => {
        const emojiMap = { 
            'bill': '💸', 'birthday': '🎂', 'coffee': '☕️', 'date': '❤️', 'doctor': '👨‍⚕️', 
            'drinks': '🍺', 'game': '🎲', 'hair': '💇', 'lunch': '🍽️', 'dinner': '🍽️', 
            'meeting': '🤝', 'movie': '🎬️', 'music': '🎵', 'package': '📦', 'party': '🎉', 
            'sport': '⚽', 'ticket': '🎫', 'travel': '✈️', 'vacation': '🏖️', 'wedding': '💒', 
            'work': '💼', 'workout': '🏋️', 'valentine': '💑', 'easter': '🐰', 'halloween': '🎃', 
            'christmas': '🎅', 'new year': '🍾', 'holiday': '🎉', 'leave': '🌴', 'wfh': '🏠', 
            'marriage': '💍' 
        };
        const lowerTitle = title.toLowerCase();
        for (const keyword in emojiMap) {
            if (lowerTitle.includes(keyword)) return emojiMap[keyword];
        }
        return '🗓️';
    }
};