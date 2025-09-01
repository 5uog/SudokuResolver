/* ======================================================
                   docs/js/core/events.js
    UA/MQL/features + Tiny EventBus + rAF batching queue
   ====================================================== */

// ---------- UA flags (safe on SSR) ----------
const UA = (typeof navigator !== 'undefined' ? navigator.userAgent : '').toLowerCase();

/** @type {boolean} */ export const isWindows = /\bwindows\b/.test(UA);
/** @type {boolean} */ export const isMac = /\bmacintosh|mac os x\b/.test(UA);
/** @type {boolean} */ export const isAndroid = /\bandroid\b/.test(UA);
/** @type {boolean} */ export const isIOS = /\biphone|ipad|ipod\b/.test(UA);
/** @type {boolean} */ export const isMobile = isAndroid || isIOS;
/** @type {boolean} */ export const isTouch = (typeof window !== 'undefined' && (
    'ontouchstart' in window || (navigator?.maxTouchPoints ?? 0) > 0
));

// ---------- Shared MQL (safe dummies on SSR) ----------
const safeMQL = (q) => {
    const mql = (typeof window !== 'undefined' && window.matchMedia) ? window.matchMedia(q) : null;
    return mql || { matches: false, media: q, addEventListener() { }, removeEventListener() { } };
};

export const prefersDarkMQL = safeMQL('(prefers-color-scheme: dark)');
export const prefersLightMQL = safeMQL('(prefers-color-scheme: light)');
export const reducedMotionMQL = safeMQL('(prefers-reduced-motion: reduce)');

// ---------- Feature flags ----------
const cssSupports = (prop, value) => {
    try { return !!(CSS && CSS.supports && CSS.supports(prop, value)); } catch { return false; }
};
const selectorSupports = (sel) => {
    try { return !!(CSS && CSS.supports && CSS.supports(`selector(${sel})`)); } catch { return false; }
};

export const features = {
    passiveEvents: (() => {
        let supported = false;
        try {
            const opts = Object.defineProperty({}, 'passive', { get() { supported = true; } });
            window.addEventListener('test', null, opts);
            window.removeEventListener('test', null, opts);
        } catch { }
        return supported;
    })(),
    scrollBehavior: 'scrollBehavior' in (document?.documentElement?.style ?? {}),
    backdropFilter: cssSupports('backdrop-filter', 'blur(2px)') || cssSupports('-webkit-backdrop-filter', 'blur(2px)'),
    cssHas: selectorSupports(':has(*)'),
};

// ---------- Tiny EventBus ----------
/**
 * @callback EventListener
 * @param {*} [detail]
 * @returns {void}
 */

/** @type {Map<string, Set<EventListener>>} */
const handlers = new Map();

/**
 * Subscribe a listener.
 * @param {string} type
 * @param {EventListener} fn
 * @returns {() => void} disposer
 */
export function on(type, fn) {
    if (!handlers.has(type)) handlers.set(type, new Set());
    handlers.get(type).add(fn);
    return () => off(type, fn);
}

/**
 * Subscribe a once-only listener.
 * @param {string} type
 * @param {EventListener} fn
 * @returns {() => void} disposer
 */
export function once(type, fn) {
    const dispose = on(type, (detail) => {
        dispose();
        try { fn(detail); } catch { }
    });
    return dispose;
}

/**
 * Unsubscribe.
 * @param {string} type
 * @param {EventListener} fn
 */
export function off(type, fn) {
    const set = handlers.get(type);
    if (!set) return;
    set.delete(fn);
    if (set.size === 0) handlers.delete(type);
}

/**
 * Emit an event (keep going even if listeners throw).
 * @param {string} type
 * @param {*} [detail]
 */
export function emit(type, detail) {
    const set = handlers.get(type);
    if (!set || set.size === 0) return;
    [...set].forEach(fn => { try { fn(detail); } catch { } });
}

/**
 * Clear all listeners (or a single type if provided).
 * @param {string} [type]
 */
export function clear(type) {
    if (type == null) handlers.clear();
    else handlers.delete(type);
}

// ---------- rAF batching queue (scroll/resize composition) ----------
/** @type {(cb: FrameRequestCallback) => number} */
const raf = (typeof requestAnimationFrame === 'function')
    ? requestAnimationFrame
    : (cb) => setTimeout(() => cb(performance?.now?.() ?? Date.now()), 16);

let scheduled = false;
/** @type {Set<Function>} */ const rafTasks = new Set();
/** @type {Map<string, Function>} */ const keyed = new Map();

/**
 * Enqueue a task for the next frame.
 * @param {Function} fn
 */
export function rafQueue(fn) {
    rafTasks.add(fn);
    schedule();
}

/**
 * Enqueue only once per frame by key.
 * @param {string} key
 * @param {Function} fn
 */
export function rafQueueOnce(key, fn) {
    if (keyed.has(key)) return;
    const wrapper = () => {
        keyed.delete(key);
        fn();
    };
    keyed.set(key, wrapper);
    rafTasks.add(wrapper);
    schedule();
}

/** Flush immediately (test/sync). */
export function rafFlush() {
    if (!scheduled && rafTasks.size === 0) return;
    scheduled = false;
    const tasks = Array.from(rafTasks);
    rafTasks.clear();
    keyed.clear();
    for (let i = 0; i < tasks.length; i++) {
        try { tasks[i](); } catch { }
    }
}

/** Drop all queued tasks without running. */
export function rafClear() {
    scheduled = false;
    rafTasks.clear();
    keyed.clear();
}

function schedule() {
    if (scheduled) return;
    scheduled = true;
    raf(() => {
        scheduled = false;
        const tasks = Array.from(rafTasks);
        rafTasks.clear();
        keyed.clear();
        for (let i = 0; i < tasks.length; i++) {
            try { tasks[i](); } catch { }
        }
    });
}
