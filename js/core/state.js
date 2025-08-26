/**
 * Application State Management
 * Centralized state with controlled access
 */

import { DEFAULT_CONFIG } from '../config/constants.js';

// Global State Variables
let CONFIG = { ...DEFAULT_CONFIG };
let activeFilter = 'all';
let currentYear = new Date().getFullYear();
let parsedCategoriesCache = [];
let isDragging = false;
let undoState = null;

// State setters - controlled mutation
export const setState = {
    config: (newConfig) => { CONFIG = newConfig; },
    activeFilter: (filter) => { activeFilter = filter; },
    currentYear: (year) => { currentYear = year; },
    parsedCategoriesCache: (cache) => { parsedCategoriesCache = cache; },
    isDragging: (dragging) => { isDragging = dragging; },
    undoState: (state) => { undoState = state; }
};

// State getters - controlled access
export const getState = {
    config: () => CONFIG,
    activeFilter: () => activeFilter,
    currentYear: () => currentYear,
    parsedCategoriesCache: () => parsedCategoriesCache,
    isDragging: () => isDragging,
    undoState: () => undoState
};