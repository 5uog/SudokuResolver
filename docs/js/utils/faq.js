/* ======================================================
                   docs/js/utils/faq.js
       FAQ アコーディオン（単一オープン・堅牢版/回転式）
   ====================================================== */

let _inited = false;

/**
 * @typedef {Object} FaqOptions
 * @property {string}  [item='.faq__item']
 * @property {string}  [header='.faq__header']
 * @property {string}  [content='.faq__content']
 * @property {boolean} [allowMultiOpen=false]
 * @property {number}  [duration=250]
 * @property {string}  [iconBase='add-outline'] // Ionicons: 常にこの名前を維持
 * @property {string}  [riBase='ri-add-line']   // Remix: 常にこのクラスを維持
 */
const DEFAULTS = Object.freeze({
    item: '.faq__item',
    header: '.faq__header',
    content: '.faq__content',
    allowMultiOpen: false,
    duration: 250,
    iconBase: 'add-outline',
    riBase: 'ri-add-line',
});

const _handlers = new WeakMap(); // item -> { click, keydown }
const _state = new WeakMap();    // item -> { anim:false, ver:0 }

function uid(prefix = 'faq') {
    return `${prefix}-${Math.random().toString(36).slice(2, 9)}`;
}

function getState(item) {
    let s = _state.get(item);
    if (!s) { s = { anim: false, ver: 0 }; _state.set(item, s); }
    return s;
}

function setCollapsed(el) {
    el.style.height = '0px';
    el.style.overflow = 'hidden';
}

function expand(el) {
    el.style.height = 'auto';
    const target = el.scrollHeight;
    el.style.height = '0px';
    requestAnimationFrame(() => {
        el.style.height = `${target}px`;
    });
}

function collapse(el) {
    const cur = el.scrollHeight;
    el.style.height = `${cur}px`;
    requestAnimationFrame(() => {
        el.style.height = '0px';
    });
}

/** header 内の .faq__icon に基底アイコンを保証（**回転だけで表現**） */
function ensureBaseIcon(header, opts) {
    const icon = header.querySelector('.faq__icon');
    if (!icon) return;

    // Ionicons
    if (icon.tagName === 'ION-ICON') {
        // name が未設定ならのみ設定（既に指定されていれば尊重）
        if (!icon.getAttribute('name')) {
            icon.setAttribute('name', opts.iconBase);
        }
        return;
    }

    // Remix Icons（後方互換）
    const base = opts.riBase;
    if (base) {
        // すでに ri-* が付いているなら保持、無ければ base を付与
        const hasRi = Array.from(icon.classList).some(c => c.startsWith('ri-'));
        if (!hasRi) icon.classList.add(base);
    }
}

/** アイコンの状態更新（回転式なので何もしないが、将来拡張のフックとして残す） */
function updateIconRotationOnly(/* header, isOpen, opts */) {
    // no-op: 親 .faq-open による CSS transform に委ねる
}

function openItem(item, opts) {
    const header = item.querySelector(opts.header);
    const content = item.querySelector(opts.content);
    if (!header || !content) return;

    const st = getState(item);
    if (st.anim) return;
    st.anim = true;
    st.ver++;
    const myVer = st.ver;

    item.classList.add('faq-open');
    header.setAttribute('aria-expanded', 'true');
    updateIconRotationOnly(header, true, opts);

    const onEnd = (e) => {
        if (e.propertyName !== 'height') return;
        const stNow = getState(item);
        content.removeEventListener('transitionend', onEnd);
        if (stNow.ver === myVer && item.classList.contains('faq-open')) {
            content.style.height = 'auto';
        }
        stNow.anim = false;
    };

    const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches;
    if (reduced) {
        content.style.transition = 'none';
        content.style.height = 'auto';
        st.anim = false;
        return;
    }

    content.addEventListener('transitionend', onEnd);
    expand(content);
}

function closeItem(item, opts) {
    const header = item.querySelector(opts.header);
    const content = item.querySelector(opts.content);
    if (!header || !content) return;

    const st = getState(item);
    if (st.anim) st.ver++;
    else { st.anim = true; st.ver++; }
    const myVer = st.ver;

    item.classList.remove('faq-open');
    header.setAttribute('aria-expanded', 'false');
    updateIconRotationOnly(header, false, opts);

    const onEnd = (e) => {
        if (e.propertyName !== 'height') return;
        const stNow = getState(item);
        content.removeEventListener('transitionend', onEnd);
        stNow.anim = false;
    };

    const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches;
    if (reduced) {
        content.style.transition = 'none';
        setCollapsed(content);
        st.anim = false;
        return;
    }

    content.addEventListener('transitionend', onEnd);
    collapse(content);
}

function toggleItem(targetItem, opts, group) {
    const st = getState(targetItem);
    if (st.anim) return;

    const isOpen = targetItem.classList.contains('faq-open');
    if (!opts.allowMultiOpen) {
        group.forEach(it => {
            if (it !== targetItem && it.classList.contains('faq-open')) closeItem(it, opts);
        });
    }
    isOpen ? closeItem(targetItem, opts) : openItem(targetItem, opts);
}

export function init(options = {}) {
    if (_inited) return;
    const opts = { ...DEFAULTS, ...options };

    const items = Array.from(document.querySelectorAll(opts.item));
    if (!items.length) { _inited = true; return; }

    // 初期正規化（単一オープン）
    if (!opts.allowMultiOpen) {
        let keptOne = false;
        items.forEach(item => {
            if (item.classList.contains('faq-open')) {
                if (!keptOne) keptOne = true;
                else {
                    const c = item.querySelector(opts.content);
                    const h = item.querySelector(opts.header);
                    if (c && h) {
                        item.classList.remove('faq-open');
                        h.setAttribute('aria-expanded', 'false');
                        setCollapsed(c);
                        // 回転式なのでアイコン更新は不要
                    }
                }
            }
        });
    }

    items.forEach(item => {
        const header = item.querySelector(opts.header);
        const content = item.querySelector(opts.content);
        if (!header || !content) return;

        // ARIA
        const contentId = content.id || uid('faq-content');
        content.id = contentId;
        header.setAttribute('role', 'button');
        header.setAttribute('aria-controls', contentId);
        header.setAttribute('aria-expanded', item.classList.contains('faq-open') ? 'true' : 'false');
        if (!header.hasAttribute('tabindex')) header.tabIndex = 0;

        // アイコンの基底形状を保証（以後は回転だけで表現）
        ensureBaseIcon(header, opts);

        // 初期高さ
        if (item.classList.contains('faq-open')) {
            content.style.height = 'auto';
            content.style.overflow = 'hidden';
        } else {
            setCollapsed(content);
        }

        // ハンドラ
        const handler = (ev) => {
            if (ev.type === 'keydown' && !(ev.key === ' ' || ev.key === 'Enter')) return;
            ev.preventDefault();
            toggleItem(item, opts, items);
        };
        header.addEventListener('click', handler);
        header.addEventListener('keydown', handler);
        _handlers.set(item, { click: handler, keydown: handler });

        // state 初期化
        getState(item);
    });

    _inited = true;
}

export function destroy(options = {}) {
    const opts = { ...DEFAULTS, ...options };
    const items = document.querySelectorAll(opts.item);
    items.forEach(item => {
        const header = item.querySelector(opts.header);
        const content = item.querySelector(opts.content);
        if (!header || !content) return;

        const h = _handlers.get(item);
        if (h) {
            header.removeEventListener('click', h.click);
            header.removeEventListener('keydown', h.keydown);
            _handlers.delete(item);
        }
        header.removeAttribute('role');
        header.removeAttribute('aria-controls');
        header.removeAttribute('aria-expanded');
        header.removeAttribute('tabindex');

        content.style.height = '';
        content.style.overflow = '';
        item.classList.remove('faq-open');

        _state.delete(item);
    });
    _inited = false;
}
