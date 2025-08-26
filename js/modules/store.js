/**
 * Data Persistence Module
 * Handles loading and saving data to localStorage
 */

import { getState, setState } from '../core/state.js';
import { APP_CONFIG } from '../config/constants.js';

// Data Management Object
export const Store = {
    /**
     * Load configuration from localStorage
     */
    load: () => {
        try {
            const savedConfig = localStorage.getItem(APP_CONFIG.STORAGE_KEYS.CONFIG);
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
            localStorage.setItem(APP_CONFIG.STORAGE_KEYS.CONFIG, JSON.stringify(config));
        } catch (e) { 
            console.error("Failed to save data to localStorage.", e); 
        }
    },

    /**
     * Load theme from localStorage and apply it
     */
    loadTheme: () => {
        const savedTheme = localStorage.getItem(APP_CONFIG.STORAGE_KEYS.THEME) || APP_CONFIG.THEMES.LIGHT;
        document.documentElement.setAttribute('data-theme', savedTheme);
        // Import UI module dynamically to avoid circular dependency
        import('./ui.js').then(({ UI }) => {
            UI.updateThemeControl(savedTheme);
        });
    },

    /**
     * Save theme to localStorage
     */
    saveTheme: (theme) => localStorage.setItem(APP_CONFIG.STORAGE_KEYS.THEME, theme)
};