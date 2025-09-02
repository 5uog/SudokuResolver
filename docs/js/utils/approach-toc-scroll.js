/* ======================================================
               docs/js/approach-toc-scroll.js
  Approach TOC クリック → 対応見出しへオフセット付きスクロール
   - トップレベル副作用なし（init() で初期化）
   - ウィンドウ/内側スクロール両対応（優先：内側）
   - 固定ヘッダ分のオフセット（CSS変数を確実に px に解決）
   - 初期ハッシュ/戻る進む(hashchange)にも対応
   - クリックは capture + stopImmediatePropagation で重複防止
   ====================================================== */

let _inited = false;
let _opts;
let _clickHandler = null;
let _hashHandler = null;
let _busy = false; // 再入防止

const DEFAULTS = Object.freeze({
    tocSelector: '.approach__toc-inner', // TOC ルート
    contentRoot: '.approach__scroll',    // 見出しが入っているルート
    containerSelector: '.approach__scroll', // 内側スクロール容器
    headings: 'h1[id], h2[id], h3[id]',
    extraOffset: 12,                  // 固定ヘッダ高に足すゆとりpx
    activateClass: 'is-active',       // クリック時の簡易ハイライト
    updateURLHash: true,              // スクロール後にURLハッシュ更新
    smooth: true,                     // スムーズスクロール
    retryDelays: [0, 16, 180],        // レイアウト揺れへの追いスクロール(ms)
});

/* ---------------------------
 * CSS 長さ（px）を“実測”で解決
 * --------------------------- */
function toPx(lengthStr, refEl = document.documentElement) {
    const div = document.createElement('div');
    div.style.position = 'absolute';
    div.style.visibility = 'hidden';
    div.style.height = lengthStr;
    refEl.appendChild(div);
    const px = div.getBoundingClientRect().height;
    div.remove();
    return px || 0;
}

/** 固定ヘッダの推定高さ（--sr-anchor-offset → --topbar-h → --header-height） */
function getAnchorOffset(containerEl) {
    const root = document.documentElement;
    const csRoot = getComputedStyle(root);
    const csCont = containerEl ? getComputedStyle(containerEl) : null;

    // 優先1: --sr-anchor-offset（あればそのまま）
    const v1 = (csCont && csCont.getPropertyValue('--sr-anchor-offset').trim()) ||
        csRoot.getPropertyValue('--sr-anchor-offset').trim();
    if (v1) {
        return toPx(v1, containerEl || root);
    }

    // 優先2: --topbar-h（なければ --header-height）
    const topbar = csRoot.getPropertyValue('--topbar-h').trim() ||
        csRoot.getPropertyValue('--header-height').trim() ||
        '56px';

    const base = toPx(topbar, containerEl || root);
    return base + (_opts?.extraOffset || 0);
}

/** スクロールターゲットのY座標を算出（container基準 or ドキュメント基準） */
function computeScrollTop(targetEl, container) {
    if (!container || container === window ||
        container === document || container === document.scrollingElement) {
        // window スクロール
        const rect = targetEl.getBoundingClientRect();
        return window.pageYOffset + rect.top;
    }
    // 内側スクロール（container内での相対オフセット）
    const tRect = targetEl.getBoundingClientRect();
    const cRect = container.getBoundingClientRect();
    return container.scrollTop + (tRect.top - cRect.top);
}

function getScrollContainer(selector) {
    if (!selector) return window;
    const el = document.querySelector(selector);
    return el || window;
}

function doScroll(container, top, behavior) {
    // CSS の scroll-behavior と干渉しないよう“直接指定”
    if (container === window) {
        window.scrollTo({ top, behavior });
    } else {
        container.scrollTo({ top, behavior });
    }
}

/* ---------------------------
 * スクロール本体（追いスクロール付き）
 * --------------------------- */
function scrollWithin(container, target, opt = {}) {
    if (!container || !target) return;

    const offset = getAnchorOffset(container);
    const rawTop = computeScrollTop(target, container);
    const goal = Math.max(0, rawTop - offset);

    const behavior = (_opts.smooth && opt.smooth !== false) ? 'smooth' : 'auto';
    doScroll(container, goal, behavior);

    // 画像遅延/KaTeX再組版でズレた場合に追いスクロール
    const deltas = opt.retryDelays || _opts.retryDelays || [];
    deltas.forEach(delay => {
        setTimeout(() => {
            const raw2 = computeScrollTop(target, container);
            const goal2 = Math.max(0, raw2 - offset);
            const diff = Math.abs(goal2 - (container === window ? window.pageYOffset : container.scrollTop));
            if (diff > 2) {
                doScroll(container, goal2, 'auto'); // ここは即時で微修正
            }
        }, delay);
    });
}

/* ---------------------------
 * クリックでスクロール（重複防止版）
 * --------------------------- */
function handleClick(ev) {
    const a = ev.target.closest('a[href^="#"]');
    if (!a) return;

    // TOC 内のリンク以外は無視
    const tocRoot = document.querySelector(_opts.tocSelector);
    if (!tocRoot || !tocRoot.contains(a)) return;

    const id = decodeURIComponent(a.getAttribute('href') || '').replace(/^#/, '');
    if (!id) return;

    // 他の汎用アンカーハンドラを“先に止める”
    ev.preventDefault();
    ev.stopPropagation();
    if (typeof ev.stopImmediatePropagation === 'function') ev.stopImmediatePropagation();

    if (_busy) return; // 再入防止
    _busy = true;

    const contentRoot = document.querySelector(_opts.contentRoot) || document;
    const target = contentRoot.querySelector(`#${CSS.escape(id)}`);
    if (!target) { _busy = false; return; }

    const container = getScrollContainer(_opts.containerSelector);

    scrollWithin(container, target, { smooth: true });

    // URL ハッシュ更新（ネイティブのガタつきを避ける）
    if (_opts.updateURLHash) {
        const newHash = `#${encodeURIComponent(id)}`;
        if (newHash !== location.hash) {
            history.pushState(null, '', newHash);
        }
    }

    // 簡易アクティブ表示
    tocRoot.querySelectorAll(`a.${_opts.activateClass}`).forEach(x => x.classList.remove(_opts.activateClass));
    a.classList.add(_opts.activateClass);

    // 短時間で解除（多重クリック連打の暴発抑制）
    setTimeout(() => { _busy = false; }, 200);
}

/* ---------------------------
 * 初期ハッシュ / hashchange
 * --------------------------- */
function scrollToHash(hash, { smooth = false } = {}) {
    if (!hash) return;
    const id = decodeURIComponent(hash.replace(/^#/, ''));
    if (!id) return;

    const contentRoot = document.querySelector(_opts.contentRoot) || document;
    const target = contentRoot.querySelector(`#${CSS.escape(id)}`);
    if (!target) return;

    const container = getScrollContainer(_opts.containerSelector);
    scrollWithin(container, target, { smooth, retryDelays: [0, 120, 360] });
}

export function init(options = {}) {
    if (_inited) return;
    _opts = { ...DEFAULTS, ...options };

    const tocRoot = document.querySelector(_opts.tocSelector);
    const contentRoot = document.querySelector(_opts.contentRoot);
    if (!tocRoot || !contentRoot) return;

    // クリック：capture + 非パッシブで最優先フック
    _clickHandler = handleClick;
    document.addEventListener('click', _clickHandler, { capture: true, passive: false });

    // 初期ハッシュ（遅延挿入直後を想定して rAF 後に）
    if (location.hash) {
        requestAnimationFrame(() => scrollToHash(location.hash, { smooth: false }));
    }

    // 戻る/進む
    _hashHandler = () => scrollToHash(location.hash, { smooth: true });
    window.addEventListener('hashchange', _hashHandler, { passive: true });

    _inited = true;
}

export function destroy() {
    if (!_inited) return;
    try { document.removeEventListener('click', _clickHandler, { capture: true }); } catch { }
    try { window.removeEventListener('hashchange', _hashHandler); } catch { }
    _clickHandler = null;
    _hashHandler = null;
    _opts = null;
    _inited = false;
}
