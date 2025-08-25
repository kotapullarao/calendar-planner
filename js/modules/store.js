/**
 * Data Persistence Module
 * Handles loading and saving data to localStorage
 */

import { getState, setState } from './constants.js';

// Data Management Object
export const Store = {
    /**
     * Load configuration from localStorage
     */
    load: () => {
        try {
            const savedConfig = localStorage.getItem('calendar-plan-config');
            const config = savedConfig ? JSON.parse(savedConfig) : { eventCategories: [] };
            setState.config(config);
        } catch (e) {
            console.error("Failed to load data from localStorage.", e);
            setState.config({ eventCategories: [] });
        }
    },

    /**
     * Save current configuration to localStorage
     */
    save: () => {
        try {
            const config = getState.config();
            localStorage.setItem('calendar-plan-config', JSON.stringify(config));
        } catch (e) { 
            console.error("Failed to save data to localStorage.", e); 
        }
    },

    /**
     * Load theme from localStorage and apply it
     */
    loadTheme: () => {
        const savedTheme = localStorage.getItem('calendar-plan-theme') || 'light';
        document.documentElement.setAttribute('data-theme', savedTheme);
        // Import UI module dynamically to avoid circular dependency
        import('./ui.js').then(({ UI }) => {
            UI.updateThemeControl(savedTheme);
        });
    },

    /**
     * Save theme to localStorage
     */
    saveTheme: (theme) => localStorage.setItem('calendar-plan-theme', theme)
};