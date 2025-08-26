/**
 * DOM Utilities
 * Helper functions for DOM manipulation
 */

// DOM Selector Utilities
export const $ = selector => document.querySelector(selector);
export const $$ = selector => document.querySelectorAll(selector);

// DOM manipulation helpers
export const createElement = (tag, className = '', innerHTML = '') => {
    const element = document.createElement(tag);
    if (className) element.className = className;
    if (innerHTML) element.innerHTML = innerHTML;
    return element;
};

export const addClass = (element, ...classes) => {
    if (element) element.classList.add(...classes);
};

export const removeClass = (element, ...classes) => {
    if (element) element.classList.remove(...classes);
};

export const toggleClass = (element, className) => {
    if (element) return element.classList.toggle(className);
};

export const hasClass = (element, className) => {
    return element ? element.classList.contains(className) : false;
};

// Event delegation helper
export const delegate = (selector, eventType, callback) => {
    document.addEventListener(eventType, (e) => {
        const target = e.target.closest(selector);
        if (target) {
            callback(e, target);
        }
    });
};