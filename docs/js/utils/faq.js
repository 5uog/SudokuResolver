/* ======================================================
                   docs/js/utils/faq.js
       FAQ アコーディオン（単一オープン・堅牢版）
   ====================================================== */

let _inited = false;

/**
 * @typedef {Object} FaqOptions
 * @property {string}  [item='.faq__item']
 * @property {string}  [header='.faq__header']
 * @property {string}  [content='.faq__content']
 * @property {boolean} [allowMultiOpen=false]
 * @property {number}  [duration=250]
 */
const DEFAULTS = Object.freeze({
    item: '.faq__item',
    header: '.faq__header',
    content: '.faq__content',
    allowMultiOpen: false,
    duration: 250,
});

const _handlers = new WeakMap(); // item -> { click, keydown }
const _state = new WeakMap(); // item -> { anim:false, ver:0 }

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
    // measure
    el.style.height = 'auto';
    const target = el.scrollHeight;
    el.style.height = '0px';
    // next frame
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

function openItem(item, opts) {
    const header = item.querySelector(opts.header);
    const content = item.querySelector(opts.content);
    if (!header || !content) return;

    const st = getState(item);
    if (st.anim) return;        // アニメ中は無視
    st.anim = true;
    st.ver++;                   // 世代を進める（以降のendで照合）
    const myVer = st.ver;

    item.classList.add('faq-open');
    header.setAttribute('aria-expanded', 'true');

    // open: height -> auto へ移行（ただし世代チェック）
    const onEnd = (e) => {
        if (e.propertyName !== 'height') return;
        // 途中で close されていたら無視
        const stNow = getState(item);
        if (stNow.ver !== myVer || !item.classList.contains('faq-open')) {
            content.removeEventListener('transitionend', onEnd);
            stNow.anim = false;
            return;
        }
        content.style.height = 'auto';
        content.removeEventListener('transitionend', onEnd);
        stNow.anim = false;
    };

    // reduced-motion なら即時反映
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
    if (st.anim) {
        // アニメ中でも閉じる操作は受け付けるが、新しい世代にして
        // 既存のopen側のtransitionendを無効化する
        st.ver++;
    } else {
        st.anim = true;
        st.ver++;
    }
    const myVer = st.ver;

    item.classList.remove('faq-open');
    header.setAttribute('aria-expanded', 'false');

    const onEnd = (e) => {
        if (e.propertyName !== 'height') return;
        const stNow = getState(item);
        if (stNow.ver !== myVer) {
            content.removeEventListener('transitionend', onEnd);
            stNow.anim = false;
            return;
        }
        // 閉じ終わりは 0px のまま（autoにはしない）
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
    if (st.anim) return; // 自分がアニメ中なら無視（連打ガード）

    const isOpen = targetItem.classList.contains('faq-open');

    if (!opts.allowMultiOpen) {
        // 先に他を全部閉じる。開いている項目はアニメ中でも ver++ で無効化できる
        group.forEach(it => { if (it !== targetItem && it.classList.contains('faq-open')) closeItem(it, opts); });
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
                if (!keptOne) {
                    keptOne = true;
                } else {
                    const c = item.querySelector(opts.content);
                    const h = item.querySelector(opts.header);
                    if (c && h) {
                        item.classList.remove('faq-open');
                        h.setAttribute('aria-expanded', 'false');
                        setCollapsed(c);
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
