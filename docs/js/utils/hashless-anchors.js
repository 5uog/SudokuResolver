/* ======================================================
   docs/js/utils/hashless-anchors.js (no-reflow rev)
   URLに#idを付けずにアンカーへスクロール（同一文書内のみ）
   - クリック時: デフォルト遷移を抑止して scrollIntoView()（URLは変えない）
   - 直リンク時: 初回だけ #id へスクロール後に URL からハッシュを除去
   - 固定ヘッダのオフセットは CSS の scroll-margin-top で吸収（測定なし）
   - 内側スクロール容器は個別の scroll-margin-top で上書き
   ====================================================== */

let _inited = false;

/**
 * @typedef {Object} HashlessOptions
 * @property {number}  [headerOffset]                  固定ヘッダ分(px)。未指定→CSS変数 --header-height→56。
 * @property {number}  [innerOffset=8]                内側スクロール容器の上マージン(px)。
 * @property {string[]} [containerSelectors=['.approach__frame','.approach__scroll']]
 * @property {boolean} [smooth=true]                   スムーススクロール。
 */
const DEFAULTS = Object.freeze({
    headerOffset: undefined,
    innerOffset: 8,
    containerSelectors: ['.approach__frame', '.approach__scroll'],
    smooth: true,
});

export function initHashlessAnchors(opts = {}) {
    if (_inited) { /* already inited */ return; }
    _inited = true;

    const cfg = { ...DEFAULTS, ...opts };

    // --- 1) CSS を注入：scroll-margin-top でオフセット解決（測らない）
    const headerOffset = resolveHeaderOffset(cfg.headerOffset);
    installStylesOnce();
    // ルート用（固定ヘッダぶん）
    document.documentElement.style.setProperty('--sr-anchor-offset', `${headerOffset}px`);

    // 内側スクロール容器用（指定セレクタに一括付与）
    const containers = (cfg.containerSelectors || [])
        .flatMap(sel => Array.from(document.querySelectorAll(sel)))
        .filter(Boolean);
    for (const el of containers) {
        el.style.setProperty('--hashless-inner-offset', `${cfg.innerOffset}px`);
    }

    // --- 2) 直リンク対応：描画安定後に scrollIntoView → ハッシュ除去
    if (location.hash) {
        const id = decodeURIComponent(location.hash.slice(1));
        const target = document.getElementById(id);
        if (target) {
            // 2フレーム待ってからスクロール（初期レイアウト確定後）
            requestAnimationFrame(() => {
                requestAnimationFrame(() => {
                    scrollIntoViewSmart(target, { smooth: cfg.smooth });
                    // URL から #… を外す（履歴は汚さない）
                    history.replaceState(null, '', location.pathname + location.search);
                });
            });
        }
    }

    // --- 3) 同一文書内アンカーのクリック横取り（委譲 / 動的DOMにも効く）
    document.addEventListener('click', (ev) => {
        if (ev.defaultPrevented || ev.button !== 0 || ev.metaKey || ev.ctrlKey || ev.shiftKey || ev.altKey) return;

        const a = ev.target && ev.target.closest ? ev.target.closest('a[href]') : null;
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

        // 他のスクロール系が介入しないよう完全に横取り
        ev.preventDefault();
        ev.stopImmediatePropagation();

        scrollIntoViewSmart(target, { smooth: cfg.smooth });
    }, { capture: true });
}

/* ========================= ヘルパ ========================= */

function normalizePath(p) {
    return p.replace(/\/index\.html?$/i, '/');
}

function resolveHeaderOffset(fallbackPx) {
    if (typeof fallbackPx === 'number') return fallbackPx;
    // CSS変数 --header-height（無ければ 56）
    const cs = getComputedStyle(document.documentElement);
    const v = parseFloat(cs.getPropertyValue('--header-height').trim());
    return Number.isFinite(v) ? v : 56;
}

function scrollIntoViewSmart(target, { smooth }) {
    // scroll-margin-top が効くので、単純に scrollIntoView でOK
    target.scrollIntoView({
        behavior: smooth ? 'smooth' : 'auto',
        block: 'start',
        inline: 'nearest',
    });
}

function installStylesOnce() {
    if (document.getElementById('hashless-anchors-style')) return;
    const css = `
        /* ===== hashless-anchors (no-reflow) ===== */
        :root { --sr-anchor-offset: 56px; }
        [id] { scroll-margin-top: var(--sr-anchor-offset); }

        /* 内側スクロール容器ではヘッダ影響を打ち消し、個別の余白だけを使う */
        .approach__frame [id],
        .approach__scroll [id] {
            scroll-margin-top: var(--hashless-inner-offset, 8px);
        }

        /* （任意）スムーススクロールをCSSで既定化したい場合はコメントアウト解除
        html { scroll-behavior: smooth; } 
        */
    `;
    const el = document.createElement('style');
    el.id = 'hashless-anchors-style';
    el.textContent = css;
    document.head.appendChild(el);
}
