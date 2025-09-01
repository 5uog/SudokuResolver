// docs/js/scroll.js
function getTopbarHeight() {
    // --topbar-h があればそれを優先。なければ実寸を取る
    const cssVar = getComputedStyle(document.documentElement).getPropertyValue('--topbar-h').trim();
    if (cssVar) return parseInt(cssVar, 10) || 56;
    const bar = document.querySelector('.sr-topbar, .topbar');
    return bar ? Math.round(bar.getBoundingClientRect().height) : 56;
}

function prefersReducedMotion() {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

function scrollToTarget(target) {
    if (!target) return;

    // 一旦フォーカス可能化（A11y）
    const restoreTabindex = !target.hasAttribute('tabindex');
    if (restoreTabindex) target.setAttribute('tabindex', '-1');

    const doScroll = () => {
        const topbarH = getTopbarHeight();
        const rect = target.getBoundingClientRect();
        const absoluteY = window.pageYOffset + rect.top;
        const y = Math.max(absoluteY - (topbarH + 12), 0);
        window.scrollTo({ top: y, behavior: prefersReducedMotion() ? 'auto' : 'smooth' });
        target.focus({ preventScroll: true });
    };

    // レイアウトが揺れる（画像/数式）ケースに2回ほど追いスクロール
    doScroll();
    requestAnimationFrame(doScroll);
    setTimeout(doScroll, 180); // KaTeX/画像の遅延に保険
}

function handleAnchorClick(e) {
    const a = e.target.closest('a[href]');
    if (!a) return;

    // 同一ページ内のハッシュのみ捕捉
    const url = new URL(a.href, location.href);
    if (url.pathname !== location.pathname || !url.hash) return;

    const id = decodeURIComponent(url.hash.slice(1));
    if (!id) return;

    const target = document.getElementById(id);
    if (!target) return;

    e.preventDefault();
    // 同じアンカーを連打しても動くように、先に一旦 hash を外すトリック
    if (location.hash === `#${id}`) {
        history.replaceState(null, '', ' ');
    }
    history.pushState(null, '', `#${id}`);
    scrollToTarget(target);
}

function handleInitialHash() {
    if (location.hash.length > 1) {
        const id = decodeURIComponent(location.hash.slice(1));
        const target = document.getElementById(id);
        if (target) {
            requestAnimationFrame(() => scrollToTarget(target));
        }
    }
}

function handleHashChange() {
    // 戻る/進むにも対応
    handleInitialHash();
}

// ===== init =====
document.addEventListener('click', handleAnchorClick, false);
window.addEventListener('load', handleInitialHash, false);
window.addEventListener('hashchange', handleHashChange, false);
