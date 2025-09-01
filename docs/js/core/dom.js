/* ======================================================
                     docs/js/core/dom.js
      Selector, data-attr, boolean-attr, observe helpers
   ====================================================== */

/**
 * Query a single element.
 * @param {string} sel
 * @param {ParentNode} [root=document]
 * @returns {Element|null}
 */
export const $ = (sel, root = document) => root.querySelector(sel);

/**
 * Query multiple elements as a real array.
 * @param {string} sel
 * @param {ParentNode} [root=document]
 * @returns {Element[]}
 */
export const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

/**
 * Read data-* attribute.
 * @param {HTMLElement} el
 * @param {string} key
 * @param {*} [fallback=null]
 * @returns {*}
 */
export function data(el, key, fallback = null) {
    const v = el?.dataset?.[key];
    return (v == null || v === '') ? fallback : v;
}

/**
 * Set/clear a boolean attribute.
 * @param {Element} el
 * @param {string} name
 * @param {boolean} on
 */
export function setBoolAttr(el, name, on) {
    if (!el) return;
    if (on) el.setAttribute(name, '');
    else el.removeAttribute(name);
}

/**
 * Whether the element is within a form-like context.
 * （コピー許可例外：.allow-select）
 * @param {Element} el
 * @returns {boolean}
 */
export function isFormish(el) {
    return !!el?.closest('input, textarea, select, [contenteditable="true"], .allow-select');
}

/**
 * Observe mutations with a small, safe wrapper.
 * @param {Node} target
 * @param {MutationCallback} callback
 * @param {MutationObserverInit} [options={ childList:true, subtree:true }]
 * @returns {() => void} disposer
 */
export function observe(target, callback, options = { childList: true, subtree: true }) {
    if (!target) return () => { };
    const obs = new MutationObserver(callback);
    obs.observe(target, options);
    return () => obs.disconnect();
}
