/* ======================================================
                  docs/js/utils/scroll.js
                アンカー & offset スクロール
   ------------------------------------------------------
   - 固定ヘッダ分のオフセットを考慮して #id にスクロール
   - reduce-motion を尊重し、rAF 合成で位置を安定化
   - 初期ハッシュ / hashchange / クリックを横断処理
   - scroll-margin-top を自動考慮（任意で無効化可）
   - セクション可視率に応じてナビの active/aria-current を同期
   - 内側スクロール容器（div など）へも対応
   - 公開API: getTopbarHeight(),
              scrollToTarget(),
              scrollToTop(),
              initAnchorOffsetScroll(options),
              destroyAnchorOffsetScroll()
   ====================================================== */

import { reducedMotionMQL, rafQueueOnce } from '../core/events.js';

/**
 * @typedef {Object} AnchorScrollOptions
 * @property {string}   [cssVarName='--topbar-h']         固定ヘッダ高の CSS カスタムプロパティ名
 * @property {string}   [topbarSelector='.sr-topbar, .topbar'] ヘッダ候補セレクタ
 * @property {number}   [extraOffset=12]                  ヘッダ高に足すゆとりpx
 * @property {boolean}  [smooth=true]                     reduce-motion でない場合に smooth するか
 * @property {number[]} [retryDelays=[0,16,180]]          レイアウト揺れに対する追いスクロール(ms)
 * @property {boolean}  [respectScrollMargin=true]        target の scroll-margin-top を加味するか
 * @property {'window'|'auto'|Element|string} [scrollContainer='window']
 *           スクロール先の容器。'window'（既定） / 'auto'（targetの最寄りスクロール容器） /
 *           Element / CSS セレクタ文字列
 * @property {Object}   [activeLink]                      セクション可視に応じたリンク強調の設定
 */

/* ------------------------------
 * モジュール内状態
 * ------------------------------ */
let _inited = false;
let _opts   /** @type {AnchorScrollOptions|null} */ = null;
const _handlers = { click: null, load: null, hashchange: null, pageshow: null };

/* ------------------------------
 * 内部ユーティリティ
 * ------------------------------ */
const _reducedMQL =
    reducedMotionMQL ??
    (typeof window !== 'undefined' && window.matchMedia
        ? window.matchMedia('(prefers-reduced-motion: reduce)')
        : null);

const _rafOnce = (key, fn) => {
    if (typeof rafQueueOnce === 'function') return rafQueueOnce(key, fn);
    return requestAnimationFrame(() => { try { fn(); } catch { /* noop */ } });
};

function _pageYOffset() {
    return window.pageYOffset ?? window.scrollY ?? document.documentElement.scrollTop ?? 0;
}

function _normalizePath(p) {
    return String(p || '').replace(/\/index\.html$/, '/');
}

function _findAnchor(id) {
    if (!id) return null;
    let el = document.getElementById(id);
    if (el) return el;
    const byName = document.querySelector(`a[name="${CSS.escape(id)}"]`);
    return byName || null;
}

function _isRenderable(el) {
    if (!(el instanceof Element)) return false;
    const style = getComputedStyle(el);
    if (style.display === 'none' || style.visibility === 'hidden') return false;
    return true;
}

/* ------------------------------
 * 固定ヘッダ高の取得（CSS変数優先）
 * ------------------------------ */
export function getTopbarHeight({
    cssVarName = '--topbar-h',
    topbarSelector = '.sr-topbar, .topbar',
} = {}) {
    const raw = getComputedStyle(document.documentElement).getPropertyValue(cssVarName).trim();
    if (raw) {
        const n = parseInt(raw, 10);
        if (!Number.isNaN(n) && n >= 0) return n;
    }
    const bar = document.querySelector(topbarSelector);
    return bar ? Math.round(bar.getBoundingClientRect().height) : 56;
}

/* ------------------------------
 * スクロール容器の解決
 * ------------------------------ */
function _findScrollContainer(el) {
    let node = el?.parentElement;
    while (node) {
        const s = getComputedStyle(node);
        if ((s.overflowY === 'auto' || s.overflowY === 'scroll') && node.scrollHeight > node.clientHeight) {
            return node;
        }
        node = node.parentElement;
    }
    return null;
}

function _resolveScrollContainer(target) {
    const sc = _opts?.scrollContainer ?? 'window';
    if (sc === 'window') return null; // null を window 扱いに統一
    if (sc === 'auto') return _findScrollContainer(target) || null;
    if (typeof sc === 'string') {
        try { return document.querySelector(sc) || null; } catch { return null; }
    }
    if (sc && sc.nodeType === 1) return sc;
    return null;
}

/* ------------------------------
 * 先頭へスクロール（公開API）
 * ------------------------------ */
export function scrollToTop({ smooth = true } = {}) {
    const wantsSmooth = !!(smooth && !_reducedMQL?.matches);
    const behavior = wantsSmooth ? 'smooth' : 'auto';
    window.scrollTo({ top: 0, left: 0, behavior });
}

/* ------------------------------
 * ターゲットへオフセット付きスクロール
 * ------------------------------ */
export function scrollToTarget(target, {
    cssVarName = _opts?.cssVarName ?? '--topbar-h',
    topbarSelector = _opts?.topbarSelector ?? '.sr-topbar, .topbar',
    extraOffset = _opts?.extraOffset ?? 12,
    smooth = _opts?.smooth ?? true,
    retryDelays = _opts?.retryDelays ?? [0, 16, 180],
    respectScrollMargin = _opts?.respectScrollMargin ?? true,
    scrollContainer = _opts?.scrollContainer ?? 'window',
} = {}) {
    if (!target || target === document.documentElement || target === document.body) {
        return scrollToTop({ smooth });
    }
    if (!_isRenderable(target)) return;

    const addedTabindex = !target.hasAttribute('tabindex');
    if (addedTabindex) target.setAttribute('tabindex', '-1');

    const doScroll = () => {
        const container = (scrollContainer === _opts?.scrollContainer)
            ? _resolveScrollContainer(target)
            : (scrollContainer === 'window' ? null
                : (scrollContainer === 'auto' ? _findScrollContainer(target) || null
                    : (typeof scrollContainer === 'string'
                        ? (document.querySelector(scrollContainer) || null)
                        : (scrollContainer && scrollContainer.nodeType === 1 ? scrollContainer : null))));

        const topbarH = getTopbarHeight({ cssVarName, topbarSelector });

        // scroll-margin-top
        let smt = 0;
        if (respectScrollMargin) {
            const c = getComputedStyle(target);
            const v = parseFloat(c.scrollMarginTop || '0');
            if (!Number.isNaN(v)) smt = Math.max(0, v);
        }
        const offset = topbarH + extraOffset + smt;

        const wantsSmooth = !!(smooth && !_reducedMQL?.matches);

        if (!container) {
            // window
            const rect = target.getBoundingClientRect();
            const yAbs = _pageYOffset() + rect.top;
            const y = Math.max(yAbs - offset, 0);
            const delta = Math.abs(_pageYOffset() - y);
            const behavior = delta < 2 ? 'auto' : (wantsSmooth ? 'smooth' : 'auto');
            window.scrollTo({ top: y, behavior });
        } else {
            // 内側コンテナ
            const tRect = target.getBoundingClientRect();
            const cRect = container.getBoundingClientRect();
            const y = Math.max(container.scrollTop + (tRect.top - cRect.top) - offset, 0);
            const behavior = wantsSmooth ? 'smooth' : 'auto';
            container.scrollTo({ top: y, behavior });
        }

        try { target.focus?.({ preventScroll: true }); } catch { /* noop */ }
        if (addedTabindex) setTimeout(() => target.removeAttribute('tabindex'), 250);
    };

    for (const ms of retryDelays) {
        if (ms === 0) _rafOnce('anchor@0', doScroll);
        else setTimeout(() => _rafOnce(`anchor@${ms}`, doScroll), ms);
    }
}

/* ------------------------------
 * クリック・ハッシュ処理
 * ------------------------------ */
function _shouldHandleClick(e, a) {
    if (!a) return false;
    if (e.defaultPrevented) return false;
    if (e.button !== 0) return false;
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return false;
    if (a.getAttribute('target') && a.getAttribute('target') !== '_self') return false;
    if (a.hasAttribute('download')) return false;

    const href = a.getAttribute('href');
    if (!href) return false;

    const url = new URL(href, location.href);
    if (url.origin !== location.origin) return false;
    if (_normalizePath(url.pathname) !== _normalizePath(location.pathname)) return false;
    return true;
}

function handleAnchorClick(e) {
    const a = e.target.closest?.('a[href]');
    if (!_shouldHandleClick(e, a)) return;

    const url = new URL(a.getAttribute('href'), location.href);
    const idRaw = (url.hash || '').slice(1);
    const id = idRaw ? decodeURIComponent(idRaw) : '';

    if (!id || id.toLowerCase() === 'top') {
        e.preventDefault();
        if (location.hash) history.replaceState(null, '', _normalizePath(location.pathname) + location.search);
        scrollToTop({ smooth: _opts?.smooth !== false });
        return;
    }

    const target = _findAnchor(id);
    if (!target) return;

    e.preventDefault();
    if (location.hash === `#${id}`) {
        history.replaceState(null, '', _normalizePath(location.pathname) + location.search);
    }
    history.pushState(null, '', `#${id}`);

    _rafOnce('anchor@click', () => scrollToTarget(target, _opts || undefined));
}

function _scrollIfHashPresent() {
    const raw = location.hash;
    if (!raw) return;

    const id = decodeURIComponent(raw.slice(1));
    if (!id || id.toLowerCase() === 'top') {
        _rafOnce('anchor@init-top', () => scrollToTop({ smooth: _opts?.smooth !== false }));
        return;
    }

    const target = _findAnchor(id);
    if (!target) return;
    _rafOnce('anchor@init', () => scrollToTarget(target, _opts || undefined));
}

function handleHashChange() {
    _scrollIfHashPresent();
}

/* ======================================================
 * セクション可視率に基づく active-link/aria-current
 * ====================================================== */

let _active = {
    enabled: false,
    sections: [],
    observer: null,
    idToLinks: new Map(),
    ratios: new Map(),
    currentId: null
};

const ACTIVE_DEFAULTS = Object.freeze({
    enable: false,
    sectionSelector: 'section[id]',
    linkQuery: (id) => `.nav__menu a[href*="#${CSS.escape(id)}"], .approach__toc a[href="#${CSS.escape(id)}"]`,
    activeClass: 'active-link',
    setAriaCurrent: true,
    minVisibleRatio: 0.3,
    bottomGuardRatio: 0.4,
    headerOffsetPx: null, // 明示したい場合のみ。null なら自動推定
});

function _updateActiveLinks(nextId) {
    if (_active.currentId === nextId) return;
    const prev = _active.currentId;
    _active.currentId = nextId || null;

    if (prev) {
        const prevLinks = _active.idToLinks.get(prev) || [];
        prevLinks.forEach(a => {
            a.classList.remove(_opts?.activeLink?.activeClass || ACTIVE_DEFAULTS.activeClass);
            if (_opts?.activeLink?.setAriaCurrent ?? ACTIVE_DEFAULTS.setAriaCurrent) {
                a.removeAttribute('aria-current');
            }
        });
    }

    if (nextId) {
        const nextLinks = _active.idToLinks.get(nextId) || [];
        nextLinks.forEach(a => {
            a.classList.add(_opts?.activeLink?.activeClass || ACTIVE_DEFAULTS.activeClass);
            if (_opts?.activeLink?.setAriaCurrent ?? ACTIVE_DEFAULTS.setAriaCurrent) {
                a.setAttribute('aria-current', 'page');
            }
        });
    }
}

function _onIntersections(entries) {
    for (const entry of entries) {
        const id = entry.target.id;
        if (!id) continue;
        _active.ratios.set(id, entry.isIntersecting ? entry.intersectionRatio : 0);
    }

    const minRatio = _opts?.activeLink?.minVisibleRatio ?? ACTIVE_DEFAULTS.minVisibleRatio;
    let bestId = null; let bestRatio = minRatio;
    for (const [id, r] of _active.ratios.entries()) {
        if (r > bestRatio) { bestRatio = r; bestId = id; }
    }

    if (!bestId) {
        const y = _pageYOffset();
        let nearest = null; let nearestDy = Infinity;
        for (const sec of _active.sections) {
            const top = sec.getBoundingClientRect().top + y;
            const dy = Math.abs(top - y);
            if (dy < nearestDy) { nearest = sec; nearestDy = dy; }
        }
        bestId = nearest?.id || null;
    }

    _updateActiveLinks(bestId);
}

function _initSectionActiveLinks() {
    const cfg = { ...ACTIVE_DEFAULTS, ...(_opts?.activeLink || {}) };
    if (!cfg.enable) return;

    _active.enabled = true;

    _active.sections = Array.from(document.querySelectorAll(cfg.sectionSelector))
        .filter(_isRenderable)
        .filter(sec => !!sec.id);

    _active.idToLinks.clear();
    for (const sec of _active.sections) {
        const id = sec.id;
        const qs = cfg.linkQuery(id);
        const links = qs ? Array.from(document.querySelectorAll(qs)) : [];
        _active.idToLinks.set(id, links);
        _active.ratios.set(id, 0);
    }
    if (_active.sections.length === 0) return;

    // IO の root を決定：scrollContainer が window 以外ならそのコンテナ
    // （コンテナ内で可視判定を行う）
    const sampleTarget = _active.sections[0];
    const container = _resolveScrollContainer(sampleTarget);

    // ヘッダ分の上側オフセット（window のときだけ適用）
    let topOffset = 0;
    if (cfg.headerOffsetPx != null) {
        topOffset = Math.max(0, Number(cfg.headerOffsetPx) || 0);
    } else {
        if (!container) { // window
            topOffset = getTopbarHeight({ cssVarName: _opts.cssVarName, topbarSelector: _opts.topbarSelector }) + (_opts.extraOffset ?? 12);
        } else {
            topOffset = 0; // 通常、内側コンテナはヘッダの下にあるため 0 で十分
        }
    }

    const bottomGuard = Math.max(0, Math.floor((container ? container.clientHeight : window.innerHeight) * (cfg.bottomGuardRatio ?? ACTIVE_DEFAULTS.bottomGuardRatio)));

    const io = new IntersectionObserver(_onIntersections, {
        root: container || null,
        rootMargin: `-${topOffset}px 0px -${bottomGuard}px 0px`,
        threshold: [0, 0.25, 0.5, 0.75, 1],
    });
    _active.observer = io;

    _active.sections.forEach(sec => io.observe(sec));

    _rafOnce('active@init', () => {
        _onIntersections(_active.sections.map(sec => ({
            target: sec,
            isIntersecting: true,
            intersectionRatio: 0
        })));
        _scrollIfHashPresent();
    });
}

function _destroySectionActiveLinks() {
    if (!_active.enabled) return;
    _active.observer?.disconnect();
    _active.observer = null;
    _active.sections = [];
    _active.ratios.clear();
    if (_active.currentId) _updateActiveLinks(null);
    _active.idToLinks.clear();
    _active.currentId = null;
    _active.enabled = false;
}

/* ------------------------------
 * 初期化 / 破棄
 * ------------------------------ */
export function initAnchorOffsetScroll(options = {}) {
    if (_inited) return;
    _inited = true;

    const { activeLink: userActive = undefined, ...rest } = options;

    _opts = {
        cssVarName: '--topbar-h',
        topbarSelector: '.sr-topbar, .topbar',
        extraOffset: 12,
        smooth: true,
        retryDelays: [0, 16, 180],
        respectScrollMargin: true,
        scrollContainer: 'window',
        ...rest,
        activeLink: { ...ACTIVE_DEFAULTS, ...(userActive || {}) },
    };

    _handlers.click = handleAnchorClick;
    _handlers.load = _scrollIfHashPresent;
    _handlers.hashchange = handleHashChange;
    _handlers.pageshow = (e) => { if (e.persisted) _scrollIfHashPresent(); };

    document.addEventListener('click', _handlers.click, false);
    window.addEventListener('load', _handlers.load, false);
    window.addEventListener('hashchange', _handlers.hashchange, false);
    window.addEventListener('pageshow', _handlers.pageshow, false);

    _initSectionActiveLinks();
}

export function destroyAnchorOffsetScroll() {
    if (!_inited) return;
    _destroySectionActiveLinks();

    document.removeEventListener('click', _handlers.click, false);
    window.removeEventListener('load', _handlers.load, false);
    window.removeEventListener('hashchange', _handlers.hashchange, false);
    window.removeEventListener('pageshow', _handlers.pageshow, false);
    _handlers.click = _handlers.load = _handlers.hashchange = _handlers.pageshow = null;
    _opts = null;
    _inited = false;
}
