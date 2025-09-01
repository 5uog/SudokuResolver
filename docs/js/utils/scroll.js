/* ======================================================
                  docs/js/utils/scroll.js
          アンカー & offset スクロール（強化版）
   ------------------------------------------------------
   - 固定ヘッダ分のオフセットを考慮して #id にスクロール
   - reduce-motion を尊重し、rAF 合成で位置を安定化
   - 初期ハッシュ / hashchange / クリックを横断処理
   - scroll-margin-top を自動考慮（任意で無効化可）
   - 公開API: getTopbarHeight(), 
              scrollToTarget(), 
              initAnchorOffsetScroll(options), 
              destroyAnchorOffsetScroll()
   ====================================================== */

import { reducedMotionMQL, rafQueueOnce } from '../core/events.js';

/**
 * @typedef {Object} AnchorScrollOptions
 * @property {string}   [cssVarName='--topbar-h']     固定ヘッダ高の CSS カスタムプロパティ名
 * @property {string}   [topbarSelector='.sr-topbar, .topbar'] ヘッダ候補セレクタ
 * @property {number}   [extraOffset=12]              ヘッダ高に足すゆとりpx
 * @property {boolean}  [smooth=true]                 reduce-motion でない場合に smooth するか
 * @property {number[]} [retryDelays=[0,16,180]]      レイアウト揺れに対する追いスクロール(ms)
 * @property {boolean}  [respectScrollMargin=true]    target の scroll-margin-top を加味するか
 */

/* ------------------------------
 * モジュール内状態
 * ------------------------------ */
let _inited = false;
let _opts   /** @type {AnchorScrollOptions|null} */ = null;
const _handlers = { click: null, load: null, hashchange: null };

/* ------------------------------
 * 内部ユーティリティ
 * ------------------------------ */
const _reducedMQL =
    reducedMotionMQL ??
    (typeof window !== 'undefined' && window.matchMedia
        ? window.matchMedia('(prefers-reduced-motion: reduce)')
        : null);

// rafQueueOnce が未提供でも rAF 一回で実行する
const _rafOnce = (key, fn) => {
    if (typeof rafQueueOnce === 'function') return rafQueueOnce(key, fn);
    return requestAnimationFrame(() => { try { fn(); } catch { /* noop */ } });
};

// スクロール可能なドキュメントの現在オフセットを取得（古いブラウザ考慮）
function _pageYOffset() {
    return window.pageYOffset ?? window.scrollY ?? document.documentElement.scrollTop ?? 0;
}

// アンカー候補を取得：id → name 属性の順に探索
function _findAnchor(id) {
    if (!id) return null;
    let el = document.getElementById(id);
    if (el) return el;
    // 古い <a name="..."> 対応（唯一に限定）
    const byName = document.querySelector(`a[name="${CSS.escape(id)}"]`);
    return byName || null;
}

// 要素が視認可能（display:none 等でない）かの緩い判定
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
 * ターゲットへオフセット付きスクロール
 * ------------------------------ */
export function scrollToTarget(target, {
    cssVarName = '--topbar-h',
    topbarSelector = '.sr-topbar, .topbar',
    extraOffset = 12,
    smooth = true,
    retryDelays = [0, 16, 180],
    respectScrollMargin = true,
} = {}) {
    if (!target) return;

    // 非表示要素は無視（:target 競合の防止）
    if (!_isRenderable(target)) return;

    // A11y: 一時的にフォーカス可能化
    const addedTabindex = !target.hasAttribute('tabindex');
    if (addedTabindex) target.setAttribute('tabindex', '-1');

    const doScroll = () => {
        const topbarH = getTopbarHeight({ cssVarName, topbarSelector });
        const rect = target.getBoundingClientRect();
        const absoluteY = _pageYOffset() + rect.top;

        // scroll-margin-top を考慮（CSS 側で指定があれば尊重）
        let smt = 0;
        if (respectScrollMargin) {
            const c = getComputedStyle(target);
            const v = parseFloat(c.scrollMarginTop || '0');
            if (!Number.isNaN(v)) smt = Math.max(0, v);
        }

        // 合計オフセット = 固定ヘッダ + 余白 + scroll-margin-top
        const offset = topbarH + extraOffset + smt;
        const y = Math.max(absoluteY - offset, 0);

        const wantsSmooth = !!(smooth && !_reducedMQL?.matches);
        // Safari の二重スクロール抑止のため、現在位置との差が小さい場合は auto
        const delta = Math.abs(_pageYOffset() - y);
        const behavior = delta < 2 ? 'auto' : (wantsSmooth ? 'smooth' : 'auto');

        window.scrollTo({ top: y, behavior });

        // スクロール後にフォーカス（追加スクロールは抑止）
        try { target.focus?.({ preventScroll: true }); } catch { /* noop */ }

        if (addedTabindex) {
            // 連打対策で少し待ってから戻す
            setTimeout(() => target.removeAttribute('tabindex'), 250);
        }
    };

    // レイアウト揺れ（KaTeX/画像ロードなど）に備えて複数回実行
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
    if (e.button !== 0) return false; // 左クリックのみ
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return false; // 新規タブ等はブラウザ任せ
    if (a.getAttribute('target') && a.getAttribute('target') !== '_self') return false;
    if (a.hasAttribute('download')) return false;

    const href = a.getAttribute('href');
    if (!href) return false;

    const url = new URL(href, location.href);
    if (url.origin !== location.origin) return false;
    if (url.pathname !== location.pathname) return false;
    if (!url.hash) return false;

    return true;
}

function handleAnchorClick(e) {
    const a = e.target.closest?.('a[href]');
    if (!_shouldHandleClick(e, a)) return;

    const url = new URL(a.getAttribute('href'), location.href);
    const id = decodeURIComponent(url.hash.slice(1));
    if (!id) return;

    const target = _findAnchor(id);
    if (!target) return;

    e.preventDefault();

    // 同一ハッシュ連打：一旦 hash を外してから push
    if (location.hash === `#${id}`) {
        history.replaceState(null, '', location.pathname + location.search);
    }
    history.pushState(null, '', `#${id}`);

    _rafOnce('anchor@click', () => scrollToTarget(target, _opts || undefined));
}

function _scrollIfHashPresent() {
    if (location.hash.length <= 1) return;
    const id = decodeURIComponent(location.hash.slice(1));
    const target = _findAnchor(id);
    if (!target) return;

    // 初期はレイアウト確定後（rAF + 追いスクロール）
    _rafOnce('anchor@init', () => scrollToTarget(target, _opts || undefined));
}

function handleHashChange() {
    // ブラウザ標準の #target スクロールが先に走る可能性があるため、
    // rAF で上書きする（固定ヘッダ分の補正を適用）
    _scrollIfHashPresent();
}

/* ------------------------------
 * 初期化 / 破棄
 * ------------------------------ */
export function initAnchorOffsetScroll(options = {}) {
    if (_inited) return;
    _inited = true;

    _opts = {
        cssVarName: '--topbar-h',
        topbarSelector: '.sr-topbar, .topbar',
        extraOffset: 12,
        smooth: true,
        retryDelays: [0, 16, 180],
        respectScrollMargin: true,
        ...options,
    };

    _handlers.click = handleAnchorClick;
    _handlers.load = _scrollIfHashPresent;
    _handlers.hashchange = handleHashChange;

    document.addEventListener('click', _handlers.click, false);
    window.addEventListener('load', _handlers.load, false);
    window.addEventListener('hashchange', _handlers.hashchange, false);
}

export function destroyAnchorOffsetScroll() {
    if (!_inited) return;
    document.removeEventListener('click', _handlers.click, false);
    window.removeEventListener('load', _handlers.load, false);
    window.removeEventListener('hashchange', _handlers.hashchange, false);
    _handlers.click = _handlers.load = _handlers.hashchange = null;
    _opts = null;
    _inited = false;
}
