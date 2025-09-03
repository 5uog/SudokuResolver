/* ======================================================
                 docs/js/components/nav.js
   ====================================================== */

/**
 * import.meta.url から /docs/ を起点に base を決定
 * - GH Pages:  /SudokuResolver/            （/docs/ がURLに現れない → GHヒューリスティックへ）
 * - ローカル:  /docs/
 */
function getBasePath() {
    try {
        const u = new URL(import.meta.url);
        const p = u.pathname; // 例: /docs/js/components/nav.js
        const i = p.indexOf('/docs/');
        if (i !== -1) {
            // /docs/ を「ディレクトリ」として返す
            const base = p.slice(0, i + '/docs/'.length); // => "/docs/"
            return base.endsWith('/') ? base : base + '/';
        }
    } catch { /* ignore */ }

    // GH Pages project: https://username.github.io/repo/...
    const segs = location.pathname.split('/').filter(Boolean);
    if (location.hostname.endsWith('github.io') && segs.length > 0) {
        return `/${segs[0]}/`; // => "/SudokuResolver/"
    }

    // 最終フォールバック
    return '/';
}

/** 現在のページが base 直下の index.html なら true */
function needsIndexHtmlInLinks(base) {
    // 例: location.pathname = "/docs/index.html" なら dir = "/docs/"
    const dir = location.pathname.replace(/[^/]+$/, ''); // 末尾のファイル名を削る
    const atIndexHtml = /\/index\.html?$/.test(location.pathname);
    return atIndexHtml && dir === base;
}

/** 外部リンクに rel=noopener/noreferrer を補完 */
function hardenExternalLinks(root = document) {
    root.querySelectorAll('a[href^="http"]').forEach((a) => {
        const rel = (a.getAttribute('rel') || '').split(/\s+/).filter(Boolean);
        if (!rel.includes('noopener')) rel.push('noopener');
        if (!rel.includes('noreferrer')) rel.push('noreferrer');
        a.setAttribute('rel', rel.join(' ').trim());
    });
}

/** active に応じた a 要素のclass/aria-currentを返す */
function linkAttrs(isActive) {
    return isActive
        ? 'class="nav__link active-link" aria-current="page"'
        : 'class="nav__link"';
}

/** HTMLエスケープ最小限（表示ラベル用） */
function esc(s) {
    return String(s).replace(/[&<>"']/g, (m) => (
        { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]
    ));
}

/**
 * モバイル開閉（ハンバーガー）の初期化
 * - aria-controls / aria-expanded を維持
 * - 外側クリック / ESC で閉じる
 * - ブレークポイントを跨いだら状態リセット
 */
function initToggle({ topbar, menu, toggle, linkSelector = '.nav__link' }) {
    if (!topbar || !menu || !toggle) return;

    let open = false;

    const setState = (wantOpen) => {
        open = !!wantOpen;
        toggle.setAttribute('aria-expanded', String(open));
        menu.dataset.state = open ? 'open' : 'closed';
    };

    const openMenu = () => setState(true);
    const closeMenu = () => setState(false);
    const toggleMenu = () => setState(!open);

    toggle.addEventListener('click', (e) => {
        e.preventDefault();
        toggleMenu();
    });

    // メニュー内リンククリックで閉じる
    menu.addEventListener('click', (e) => {
        const a = e.target.closest(linkSelector);
        if (a) closeMenu();
    });

    // 外側クリックで閉じる
    const onDocClick = (e) => {
        if (!open) return;
        if (topbar.contains(e.target)) return;
        closeMenu();
    };
    document.addEventListener('click', onDocClick, { capture: true });

    // ESC で閉じる
    const onKey = (e) => {
        if (!open) return;
        if (e.key === 'Escape') {
            e.preventDefault();
            closeMenu();
            toggle.focus();
        }
    };
    document.addEventListener('keydown', onKey);

    // レスポンシブ境界（>=768pxでJS開閉を無効相当＝閉状態へ）
    const mq = window.matchMedia('(min-width: 768px)');
    const handleMatch = () => {
        if (mq.matches) setState(false);
    };
    mq.addEventListener?.('change', handleMatch);
    handleMatch();

    // 再レンダ時のためのクリーンアップを返す（必要なら使用）
    return () => {
        document.removeEventListener('click', onDocClick, { capture: true });
        document.removeEventListener('keydown', onKey);
        mq.removeEventListener?.('change', handleMatch);
    };
}

/**
 * ナビゲーション描画 + トグル初期化
 * @param {string} active - 'features' | 'faq' | 'approach' | '' など
 * @param {object} options
 *  - mountId: 既存の挿入先ID（既定: 'sr-topbar'）
 *  - logoSizes: sizes属性（既定: '28px'）
 */
export function renderNavbar(active = '', options = {}) {
    const { mountId = 'sr-topbar', logoSizes = '28px' } = options;

    // プレースホルダ（なければ作る）
    let el = document.getElementById(mountId);
    if (!el) {
        el = document.createElement('div');
        el.id = mountId;
        document.body.prepend(el);
    }

    const base = getBasePath();
    const baseForHome = needsIndexHtmlInLinks(base) ? `${base}index.html` : base;

    // トップ（Home）へのリンク生成（必要なら #fragment 付与）
    const home = (fragment = '') => `${baseForHome}${fragment ? `#${fragment}` : ''}`;
    // 別ページ（例: math/approach.html）へのリンク（今回メニューはHome内のセクション想定）
    const path = (p, fragment = '') =>
        `${base}${p.replace(/^\//, '')}${fragment ? `#${fragment}` : ''}`;

    // 便利関数：リンクタグ生成
    const makeLink = (href, key, label) =>
        `<a href="${href}" ${linkAttrs(active === key)}>${esc(label)}</a>`;

    // --- header 描画（モバイル切替ボタンを内包） ---
    el.innerHTML = `
    <header class="header" id="header">
        <div class="blob-animate"></div>

        <nav class="nav container" aria-label="メインナビゲーション">
            <a href="${home('top')}" class="nav__logo">
                <img src="${base}assets/logos/topbar-logo-64.webp" srcset="${base}assets/logos/topbar-logo-28.webp 28w, ${base}assets/logos/topbar-logo-64.webp 64w, ${base}assets/logos/topbar-logo-132.webp 132w" sizes="${logoSizes}" alt="数独Resolver logo" width="28" height="28" class="nav__logo-img"/>
                <span>数独Resolver</span>
            </a>

            <button class="nav__toggle" type="button" aria-controls="sr-navmenu" aria-expanded="false" aria-label="メニューを開閉">
                <span aria-hidden="true"></span>
            </button>

            <div id="sr-navmenu" class="nav__menu" data-state="closed">
                <ul class="nav__list">
                    <li>${makeLink(home('features'), 'features', '特徴')}</li>
                    <li>${makeLink(home('faq'), 'faq', 'よくあるご質問')}</li>
                    <li>${makeLink(home('approach'), 'approach', '研究路線')}</li>
                </ul>
            </div>
        </nav>
    </header>
  `;

    // 外部リンクの rel 補完
    hardenExternalLinks(el);

    // モバイル開閉 初期化
    const topbar = el.querySelector('nav.nav');
    const menu = el.querySelector('#sr-navmenu');
    const toggle = el.querySelector('.nav__toggle');
    initToggle({ topbar, menu, toggle });

    return el;
}

/**
 * 既存ページからの簡易呼び出し用（別名）
 * - 今後フックやオプションを増やす余地を残す
 */
export function initNavbar(active = '', options = {}) {
    return renderNavbar(active, options);
}
