// docs/assets/topbar.js
// ESM モジュール（<script type="module" defer> で読み込み推奨）

const STORAGE_KEY = 'sudoku:theme'; // 'light' | 'dark'

// ---- Theme helpers ----
const prefersDarkMQL = window.matchMedia?.('(prefers-color-scheme: dark)');

function getSystemPrefersDark() {
    return !!prefersDarkMQL?.matches;
}

function currentTheme() {
    return document.documentElement.getAttribute('data-theme')
        || (getSystemPrefersDark() ? 'dark' : 'light');
}

function applyTheme(theme) {
    const t = theme === 'dark' ? 'dark' : 'light';
    const root = document.documentElement;
    root.setAttribute('data-theme', t);
    root.style.colorScheme = t;
    swapFormulaImages(t);
}

function saveTheme(theme) {
    localStorage.setItem(STORAGE_KEY, theme);
}

function loadInitialTheme() {
    // 初期テーマは <head> 即時スニペットで設定済みの想定
    // 念のため KaTeX/画像の色も同期
    applyTheme(currentTheme());
}

function toggleTheme() {
    const next = currentTheme() === 'dark' ? 'light' : 'dark';
    applyTheme(next);
    saveTheme(next);
}

function setupThemeToggle() {
    const btn = document.getElementById('theme-toggle');
    if (!btn) return;
    btn.addEventListener('click', toggleTheme, { passive: true });
}

// 「ユーザーが保存していない場合のみ」OSの変更を反映
function setupSystemThemeFollow() {
    if (!prefersDarkMQL) return;
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === 'light' || saved === 'dark') return; // 手動優先
    prefersDarkMQL.addEventListener?.('change', (e) => {
        applyTheme(e.matches ? 'dark' : 'light');
    });
}

// タブ間同期
function setupThemeStorageSync() {
    window.addEventListener('storage', (ev) => {
        if (ev.key !== STORAGE_KEY) return;
        const v = ev.newValue;
        if (v === 'light' || v === 'dark') applyTheme(v);
    });
}

// ---- Formula images (dark/light) ----
// <img class="tex-img" data-light-src="..." data-dark-src="...">
async function swapFormulaImages(theme) {
    const dark = theme === 'dark';
    const imgs = document.querySelectorAll('img.tex-img[data-light-src][data-dark-src]');
    for (const img of imgs) {
        const next = dark ? img.dataset.darkSrc : img.dataset.lightSrc;
        if (!next || img.src === next) continue;
        try {
            // 事前デコードでチラつきを抑制
            const pre = new Image();
            pre.src = next;
            await pre.decode?.();
            // 1フレーム後に切替（レイアウト確定後の置換でレイアウト抑揚を避ける）
            requestAnimationFrame(() => { img.src = next; });
        } catch {
            // decode未対応や失敗時は即時フォールバック
            img.src = next;
        }
    }
}

// ---- Topbar autohide ----
function setupTopbarAutohide() {
    const topbar = document.querySelector('.sr-topbar');
    if (!topbar) return;

    let lastY = window.scrollY || 0;
    let ticking = false;

    const THRESH_HIDE = 10; // 下
    const THRESH_SHOW = 6;  // 上

    function onScroll() {
        const y = Math.max(0, window.scrollY || 0); // iOSバウンス対策
        // Elevation
        if (y > 1) topbar.setAttribute('data-elevated', '');
        else topbar.removeAttribute('data-elevated');

        const delta = y - lastY;
        if (delta > THRESH_HIDE) {
            topbar.setAttribute('data-hidden', '');
            topbar.removeAttribute('data-visible');
            lastY = y;
        } else if (delta < -THRESH_SHOW) {
            topbar.setAttribute('data-visible', '');
            topbar.removeAttribute('data-hidden');
            lastY = y;
        }
        ticking = false;
    }

    // タブ復帰/ページ位置リセットで lastY を自然に更新
    document.addEventListener('visibilitychange', () => { lastY = window.scrollY || 0; }, { passive: true });

    window.addEventListener('scroll', () => {
        if (!ticking) {
            ticking = true;
            requestAnimationFrame(onScroll);
        }
    }, { passive: true });

    // 初期 elev
    if ((window.scrollY || 0) > 1) topbar.setAttribute('data-elevated', '');
}

// ---- Download button (presentational only) ----
function setupDownloadButton() {
    const btn = document.getElementById('download-exe');
    if (!btn) return;
    btn.addEventListener('click', (e) => { e.preventDefault(); }, { passive: false });
}

// ---- Init ----
document.addEventListener('DOMContentLoaded', () => {
    loadInitialTheme();
    setupThemeToggle();
    setupSystemThemeFollow();
    setupThemeStorageSync();
    setupTopbarAutohide();
    setupDownloadButton();
});
