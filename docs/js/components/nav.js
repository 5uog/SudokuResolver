/* ======================================================
                 docs/js/components/nav.js
   ====================================================== */

export function renderNavbar(active = '') {
    // プレースホルダ要素を探す（なければ body 先頭に作る）
    let el = document.getElementById('sr-topbar');
    if (!el) {
        el = document.createElement('div');
        el.id = 'sr-topbar';
        document.body.prepend(el);
    }

    // active に応じて .is-active / aria-current を付与
    const isActive = (key) =>
        active === key ? ' aria-current="page" class="nav__link is-active"' : ' class="nav__link"';

    // header を描画
    el.innerHTML = `
        <header class="header" id="header">
            <div class="blob-animate"></div>

            <nav class="nav container" aria-label="メインナビゲーション">
                <a href="/docs/#top" class="nav__logo">数独Resolver</a>
                <div class="nav__menu">
                    <ul class="nav__list">
                        <li><a href="/docs/#features"${isActive('features')}>特徴</a></li>
                        <li><a href="/docs/#faq"${isActive('faq')}>よくあるご質問</a></li>
                        <li><a href="/docs/#approach"${isActive('approach')}>研究路線</a></li>
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
