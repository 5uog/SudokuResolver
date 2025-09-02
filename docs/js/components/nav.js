/* ======================================================
                 docs/js/components/nav.js
   ====================================================== */

function getBasePath() {
    // 1) canonical から最優先で取得（例: https://5uog.github.io/SudokuResolver/）
    const can = document.querySelector('link[rel="canonical"]');
    if (can?.href) {
        try {
            const u = new URL(can.href, location.href);
            // 末尾を必ずスラッシュに
            return u.pathname.endsWith('/') ? u.pathname : (u.pathname + '/');
        } catch { /* ignore */ }
    }

    // 2) GitHub Pages の project ページを推定（username.github.io/repo/...）
    const segs = location.pathname.split('/').filter(Boolean);
    if (location.hostname.endsWith('github.io') && segs.length > 0) {
        return `/${segs[0]}/`;
    }

    // 3) デフォルト（カスタムドメインやローカル dev）
    return '/';
}

export function renderNavbar(active = '') {
    // プレースホルダ要素を探す（なければ body 先頭に作る）
    let el = document.getElementById('sr-topbar');
    if (!el) {
        el = document.createElement('div');
        el.id = 'sr-topbar';
        document.body.prepend(el);
    }

    const base = getBasePath();

    // トップ（Home）へのリンク生成（必要に応じて #fragment を付与）
    const home = (fragment = '') => `${base}${fragment ? `#${fragment}` : ''}`;

    // 別ページ（例: Approach 専用ページ）に行くリンク
    const path = (p, fragment = '') =>
        `${base}${p.replace(/^\//, '')}${fragment ? `#${fragment}` : ''}`;

    // active に応じて .is-active / aria-current を付与
    const isActive = (key) =>
        active === key ? ' aria-current="page" class="nav__link is-active"' : ' class="nav__link"';

    // header を描画
    el.innerHTML = `
        <header class="header" id="header">
            <div class="blob-animate"></div>

            <nav class="nav container" aria-label="メインナビゲーション">
                <a href="${home('top')}" class="nav__logo">数独Resolver</a>
                <div class="nav__menu">
                    <ul class="nav__list">
                        <!-- Home 内セクションへの導線は「Home の URL + #id」にする -->
                        <li><a href="${home('features')}"${isActive('features')}>特徴</a></li>
                        <li><a href="${home('faq')}"${isActive('faq')}>よくあるご質問</a></li>
                        <li><a href="${home('approach')}"${isActive('approach')}>研究路線</a></li>
                        <!-- 将来、別ページ化するならこう：
                             <li><a href="${path('math/approach.html')}"${isActive('approach')}>研究路線</a></li> -->
                    </ul>
                </div>
            </nav>
        </header>
    `;

    // 外部リンクにはセキュリティ属性を補完
    el.querySelectorAll('a[href^="http"]').forEach((a) => {
        const rel = (a.getAttribute('rel') || '').split(/\s+/);
        if (!rel.includes('noopener')) rel.push('noopener');
        if (!rel.includes('noreferrer')) rel.push('noreferrer');
        a.setAttribute('rel', rel.join(' ').trim());
    });
}