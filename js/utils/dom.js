/**
 * DOM Utilities
 *
 * Only the selector shorthands are used. Six further helpers
 * (createElement, addClass, removeClass, toggleClass, hasClass, delegate)
 * lived here unreferenced since the project began and were removed — notably
 * `delegate`, whose absence from the codebase is why event handling grew into
 * one 400-line hand-rolled dispatch chain instead.
 */

export const $ = selector => document.querySelector(selector);
export const $$ = selector => document.querySelectorAll(selector);
