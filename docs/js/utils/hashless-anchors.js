/* ======================================================
   docs/js/utils/hashless-anchors.js
   URLに#idを付けずにアンカーへスクロール（同一文書内のみ）
   - クリック時: デフォルト遷移を抑止してスクロール（URLは変えない）
   - 直リンク時: 初回だけ#idへスクロール後にURLからハッシュを除去
   - 固定ヘッダのオフセット、内側スクロール容器、動的挿入にも強い
   ====================================================== */

let _inited = false;

/**
 * @typedef {Object} HashlessOptions
 * @property {number}  [headerOffset]                 固定ヘッダ分(px)。未指定→CSS変数 --header-height→56。
 * @property {number}  [innerOffset=8]               内側スクロール容器での余白(px)。
 * @property {string[]} [containerSelectors]          候補セレクタ。無ければ自動検出 or window。
 * @property {boolean} [detectScrollableAncestor=true] 最寄りのスクロール祖先を自動検出。
 * @property {boolean} [smooth=true]                  スムーススクロール有効。
 */
const DEFAULTS = Object.freeze({
    headerOffset: undefined,
    innerOffset: 8,
    containerSelectors: ['.approach__frame'],
    detectScrollableAncestor: true,
    smooth: true,
});

export function initHashlessAnchors(opts = {}) {
    if (_inited) _debug('[hashless] already inited');
    _inited = true;

    const cfg = { ...DEFAULTS, ...opts };
    const headerOffset = getHeaderOffset(cfg.headerOffset);
    const containerEls = (cfg.containerSelectors || [])
        .map(sel => document.querySelector(sel))
        .filter(Boolean);

    // a) 初期ハッシュ（直リンク）対応：スクロール後にURLから#を除去
    if (location.hash) {
        const id = decodeURIComponent(location.hash.slice(1));
        const target = document.getElementById(id);
        if (target) {
            requestAnimationFrame(() => {
                requestAnimationFrame(() => {
                    scrollToTarget(target, {
                        headerOffset,
                        innerOffset: cfg.innerOffset,
                        containerEls,
                        detectScrollableAncestor: cfg.detectScrollableAncestor,
                        smooth: cfg.smooth
                    });
                    history.replaceState(null, '', location.pathname + location.search);
                });
            });
        }
    }

    // b) 同一文書内アンカーのクリック横取り（委譲 / 動的DOMにも効く）
    document.addEventListener('click', (ev) => {
        if (ev.defaultPrevented || ev.button !== 0 || ev.metaKey || ev.ctrlKey || ev.shiftKey || ev.altKey) return;

        const a = ev.target.closest('a[href]');
        if (!a) return;

        let href;
        try { href = new URL(a.getAttribute('href'), location.href); } catch { return; }

        // 同一ドキュメント + ハッシュつきのみ対象
        if (!(href.origin === location.origin && normalizePath(href.pathname) === normalizePath(location.pathname) && href.hash)) {
            return;
        }

        const id = decodeURIComponent(href.hash.slice(1));
        const target = document.getElementById(id);
        if (!target) return;

        // ここで完全に横取り（他のスクロール系が介入しないように）
        ev.preventDefault();
        ev.stopImmediatePropagation();

        scrollToTarget(target, {
            headerOffset,
            innerOffset: cfg.innerOffset,
            containerEls,
            detectScrollableAncestor: cfg.detectScrollableAncestor,
            smooth: cfg.smooth
        });
    }, { capture: true });
}

/* ========================= ヘルパ ========================= */

function _debug(..._args) { /* console.debug(..._args) */ }

function normalizePath(p) {
    return p.replace(/\/index\.html?$/i, '/');
}

function getHeaderOffset(fallbackPx) {
    if (typeof fallbackPx === 'number') return fallbackPx;
    const root = getComputedStyle(document.documentElement);
    const varVal = root.getPropertyValue('--header-height').trim();
    const px = parseFloat(varVal);
    return Number.isFinite(px) ? px : 56;
}

function isScrollable(el) {
    const cs = getComputedStyle(el);
    const oy = cs.overflowY;
    if (!(oy === 'auto' || oy === 'scroll')) return false;
    return el.scrollHeight > Math.ceil(el.clientHeight + 1);
}

function nearestScrollableAncestor(from) {
    let el = from.parentElement;
    while (el && el !== document.body) {
        if (isScrollable(el)) return el;
        el = el.parentElement;
    }
    return null;
}

function pickScrollContainer(containerEls, target, detectScrollableAncestor) {
    for (const el of containerEls) {
        if (el.contains(target)) return el;
    }
    if (detectScrollableAncestor) {
        const found = nearestScrollableAncestor(target);
        if (found) return found;
    }
    return null; // window
}

function scrollToTarget(target, { headerOffset, innerOffset, containerEls, detectScrollableAncestor, smooth }) {
    const container = pickScrollContainer(containerEls, target, detectScrollableAncestor);
    const behavior = smooth ? 'smooth' : 'auto';

    if (!container) {
        // ページ全体スクロール（固定ヘッダ分を引く）
        const rect = target.getBoundingClientRect();
        const y = window.scrollY + rect.top - headerOffset;
        window.scrollTo({ top: Math.max(0, y), behavior });
        return;
    }

    // 内側スクロール容器（ヘッダの影響は無いので innerOffset だけ）
    const cRect = container.getBoundingClientRect();
    const tRect = target.getBoundingClientRect();
    const current = container.scrollTop;
    const delta = tRect.top - cRect.top - innerOffset;
    container.scrollTo({ top: Math.max(0, current + delta), behavior });
}
