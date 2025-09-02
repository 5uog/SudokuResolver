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

export function renderNavbar(active = '') {
    // プレースホルダ（なければ作る）
    let el = document.getElementById('sr-topbar');
    if (!el) {
        el = document.createElement('div');
        el.id = 'sr-topbar';
        document.body.prepend(el);
    }

    const base = getBasePath();
    const baseForHome = needsIndexHtmlInLinks(base) ? `${base}index.html` : base;

    // トップ（Home）へのリンク生成（必要なら #fragment 付与）
    const home = (fragment = '') => `${baseForHome}${fragment ? `#${fragment}` : ''}`;

    // 別ページ（例: math/approach.html）へのリンク（こちらは index.html 明示不要）
    const path = (p, fragment = '') =>
        `${base}${p.replace(/^\//, '')}${fragment ? `#${fragment}` : ''}`;

    // active に応じて .is-active / aria-current
    const isActive = (key) =>
        active === key ? ' aria-current="page" class="nav__link is-active"' : ' class="nav__link"';

    // header 描画
    el.innerHTML = `
        <header class="header" id="header">
            <div class="blob-animate"></div>

            <nav class="nav container" aria-label="メインナビゲーション">
                <a href="${home('top')}" class="nav__logo">数独Resolver</a>
                <div class="nav__menu">
                    <ul class="nav__list">
                        <li><a href="${home('features')}"${isActive('features')}>特徴</a></li>
                        <li><a href="${home('faq')}"${isActive('faq')}>よくあるご質問</a></li>
                        <li><a href="${home('approach')}"${isActive('approach')}>研究路線</a></li>
                        <!-- 別ページ化するなら:
                             <li><a href="${path('math/approach.html')}"${isActive('approach')}>研究路線</a></li> -->
                    </ul>
                </div>
            </nav>
        </header>
    `;

    // 外部リンクの rel 補完
    el.querySelectorAll('a[href^="http"]').forEach((a) => {
        const rel = (a.getAttribute('rel') || '').split(/\s+/);
        if (!rel.includes('noopener')) rel.push('noopener');
        if (!rel.includes('noreferrer')) rel.push('noreferrer');
        a.setAttribute('rel', rel.join(' ').trim());
    });
}
