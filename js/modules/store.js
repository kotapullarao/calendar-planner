/**
 * Data Persistence Module
 * Handles loading and saving data to localStorage
 */

import { getState, setState } from '../core/state.js';
import { APP_CONFIG } from '../config/constants.js';
import { KEYS, migrateConfig, describeMigration } from '../core/schema.js';

// Data Management Object
export const Store = {
    /**
     * Load configuration from localStorage, migrating it if needed.
     *
     * A migration writes a backup of the untouched original first, so a bad
     * upgrade is recoverable rather than destructive. Only one backup is kept:
     * the point is to survive the upgrade that just ran, and keeping a history
     * would double storage for every future migration.
     */
    load: () => {
        let raw = null;
        try {
            raw = localStorage.getItem(APP_CONFIG.STORAGE_KEYS.CONFIG);
            const parsed = raw ? JSON.parse(raw) : null;
            const { config, changed, report } = migrateConfig(parsed);

            if (changed && raw) {
                // Back up before the migrated shape replaces the original.
                try {
                    localStorage.setItem(KEYS.BACKUP, JSON.stringify({
                        savedAt: new Date().toISOString(),
                        reason: describeMigration(report),
                        config: parsed
                    }));
                } catch (backupError) {
                    // Out of quota, most likely. Proceed without a backup rather
                    // than refusing to start, but say so.
                    console.warn('Could not write a pre-migration backup:', backupError);
                }
            }

            setState.config(config);

            if (changed) {
                console.log('Calendar Planner: migrated stored data —', describeMigration(report));
                if (report.entriesDropped) {
                    console.warn('Dropped unparseable date entries:', report.droppedSamples);
                }
                Store.save();
            }
        } catch (e) {
            console.error('Failed to load data from localStorage.', e);
            // Preserve whatever was there for inspection rather than
            // overwriting it with an empty config on the next save.
            if (raw) {
                try {
                    localStorage.setItem(KEYS.BACKUP, JSON.stringify({
                        savedAt: new Date().toISOString(),
                        reason: 'config could not be parsed',
                        raw
                    }));
                } catch (_) { /* nothing more we can do */ }
            }
            setState.config({ schemaVersion: 2, eventCategories: [] });
        }
    },

    /** The pre-migration backup, if one exists. */
    getBackup: () => {
        try {
            const raw = localStorage.getItem(KEYS.BACKUP);
            return raw ? JSON.parse(raw) : null;
        } catch (e) {
            return null;
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
     * Change the config in one step: mutate, persist, announce.
     *
     * Callers previously had to remember `getState.config()`, mutate,
     * `setState.config()`, `Store.save()`, and `UI.rebuild()` in that order,
     * and nothing enforced it — a change could persist without repainting or
     * repaint without persisting. Doing all of it here makes that class of
     * mistake impossible to make by omission.
     *
     *   Store.commit(config => { config.eventCategories.push(cat); });
     *
     * The mutator may instead return a replacement config, for the cases that
     * reassign wholesale rather than mutate in place. Pass
     * `{ persist: false }` for changes that should repaint without being
     * written, though those are usually view state and belong in setState.
     */
    commit: (mutator, { persist = true } = {}) => {
        const current = getState.config();
        const replacement = typeof mutator === 'function' ? mutator(current) : mutator;
        const next = replacement || current;

        // Set first so Store.save() writes the new value; the notification it
        // raises is batched, so listeners run once after this returns and see
        // state and storage already agreeing.
        setState.config(next);
        if (persist) Store.save();
        return next;
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
    saveTheme: (theme) => localStorage.setItem(APP_CONFIG.STORAGE_KEYS.THEME, theme),

    /**
     * Load gradient theme from localStorage
     */
    loadGradientTheme: () => {
        return localStorage.getItem(APP_CONFIG.STORAGE_KEYS.GRADIENT_THEME) || 'dusk';
    },

    /**
     * Save gradient theme to localStorage
     */
    saveGradientTheme: (gradientTheme) => localStorage.setItem(APP_CONFIG.STORAGE_KEYS.GRADIENT_THEME, gradientTheme),

    /**
     * Load custom gradient data from localStorage
     */
    loadCustomGradient: () => {
        try {
            const data = localStorage.getItem(APP_CONFIG.STORAGE_KEYS.GRADIENT_THEME + '-custom');
            return data ? JSON.parse(data) : null;
        } catch (error) {
            console.warn('Failed to load custom gradient:', error);
            return null;
        }
    },

    /**
     * Save custom gradient data to localStorage
     */
    saveCustomGradient: (gradientData) => {
        try {
            localStorage.setItem(APP_CONFIG.STORAGE_KEYS.GRADIENT_THEME + '-custom', JSON.stringify(gradientData));
        } catch (error) {
            console.warn('Failed to save custom gradient:', error);
        }
    },

    /**
     * Load stats hidden preference
     */
    loadStatsHidden: () => {
        try {
            const v = localStorage.getItem(APP_CONFIG.STORAGE_KEYS.STATS_HIDDEN);
            if (v !== null) setState.statsHidden(v === '1');
        } catch (e) {}
    },

    /** Save stats hidden preference */
    saveStatsHidden: (hidden) => {
        try { localStorage.setItem(APP_CONFIG.STORAGE_KEYS.STATS_HIDDEN, hidden ? '1' : '0'); } catch (e) {}
    }
};