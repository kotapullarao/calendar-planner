/**
 * Constants and Global State Module
 * Contains all constants, DOM selectors, and global state variables
 */

// DOM Selector Utilities
export const $ = selector => document.querySelector(selector);
export const $$ = selector => document.querySelectorAll(selector);

// Month Names
export const MONTH_NAMES = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
];

// SVG Icons
export const ICONS = {
    delete: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>`,
    duplicate: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>`,
    edit: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>`
};

// Global State Variables
export let CONFIG = { eventCategories: [] };
export let activeFilter = 'all';
export let currentYear = new Date().getFullYear();
export let parsedCategoriesCache = [];
export let isDragging = false;
export let undoState = null;

// State setters for external modules to update global state
export const setState = {
    config: (newConfig) => { CONFIG = newConfig; },
    activeFilter: (filter) => { activeFilter = filter; },
    currentYear: (year) => { currentYear = year; },
    parsedCategoriesCache: (cache) => { parsedCategoriesCache = cache; },
    isDragging: (dragging) => { isDragging = dragging; },
    undoState: (state) => { undoState = state; }
};

// State getters for external modules to access global state
export const getState = {
    config: () => CONFIG,
    activeFilter: () => activeFilter,
    currentYear: () => currentYear,
    parsedCategoriesCache: () => parsedCategoriesCache,
    isDragging: () => isDragging,
    undoState: () => undoState
};