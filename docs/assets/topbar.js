// docs/assets/topbar.js
// ESM モジュール。将来CDNから別ライブラリをimportしたい場合もこの形にしておけばOK。
// 例）アイコンライブラリ等を使うなら：
// import { something } from 'https://cdn.jsdelivr.net/npm/somelib@x.y.z/+esm';

const STORAGE_KEY = 'sudoku:theme'; // 'light' | 'dark'

function getSystemPrefersDark() {
    return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
}

function applyTheme(theme) {
    const root = document.documentElement;
    if (theme === 'light') {
        root.setAttribute('data-theme', 'light');
    } else if (theme === 'dark') {
        root.setAttribute('data-theme', 'dark');
    } else {
        root.removeAttribute('data-theme');
    }
    // ← テーマ適用のたびに数式画像も差し替え
    updateFormulaImages(root.getAttribute('data-theme') || (getSystemPrefersDark() ? 'dark' : 'light'));
}

function loadInitialTheme() {
    const saved = localStorage.getItem(STORAGE_KEY);
    const initial = (saved === 'light' || saved === 'dark') ? saved : (getSystemPrefersDark() ? 'dark' : 'light');
    applyTheme(initial);
    return initial;
}

function toggleTheme() {
    const current = document.documentElement.getAttribute('data-theme') ||
        (getSystemPrefersDark() ? 'dark' : 'light');
    const next = current === 'dark' ? 'light' : 'dark';
    applyTheme(next);
    localStorage.setItem(STORAGE_KEY, next);
}

function setupThemeToggle() {
    const btn = document.getElementById('theme-toggle');
    if (!btn) return;
    btn.addEventListener('click', toggleTheme, { passive: true });
}

function updateFormulaImages(theme) {
    const dark = theme === 'dark';
    document.querySelectorAll('img.tex-img[data-light-src][data-dark-src]').forEach(img => {
        const next = dark ? img.dataset.darkSrc : img.dataset.lightSrc;
        if (next && img.src !== next) img.src = next;
    });
}

// ===== Auto-hide Topbar on scroll (down hide / up show) =====
function setupTopbarAutohide() {
    const topbar = document.querySelector('.sr-topbar');
    if (!topbar) return;

    let lastY = window.scrollY;
    let ticking = false;

    const THRESH_HIDE = 10;  // ほんの少し下に動いたら隠す
    const THRESH_SHOW = 6;   // 少し上に動いたら見せる

    function onScroll() {
        const y = window.scrollY;

        // 影と背景の強調（1pxでも動いたら）
        if (y > 1) {
            topbar.setAttribute('data-elevated', '');
        } else {
            topbar.removeAttribute('data-elevated');
        }

        const delta = y - lastY;
        if (delta > THRESH_HIDE) {
            // 下にスクロール → 隠す
            topbar.setAttribute('data-hidden', '');
            topbar.removeAttribute('data-visible');
            lastY = y;
        } else if (delta < -THRESH_SHOW) {
            // 上にスクロール → 出す
            topbar.setAttribute('data-visible', '');
            topbar.removeAttribute('data-hidden');
            lastY = y;
        }

        ticking = false;
    }

    window.addEventListener('scroll', () => {
        if (!ticking) {
            window.requestAnimationFrame(onScroll);
            ticking = true;
        }
    }, { passive: true });
}

// ===== Disabled Download button (presentational only) =====
function setupDownloadButton() {
    const btn = document.getElementById('download-exe');
    if (!btn) return;
    // まだ無効。必要になったら href を付けた <a> に差し替えればOK。
    btn.addEventListener('click', (e) => {
        e.preventDefault();
    }, { passive: false });
}

// ===== Initialize =====
document.addEventListener('DOMContentLoaded', () => {
    loadInitialTheme();
    setupThemeToggle();
    setupTopbarAutohide();
    setupDownloadButton();
});
