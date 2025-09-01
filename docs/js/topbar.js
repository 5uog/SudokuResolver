// docs/js/topbar.js
// ESM モジュール（<script type="module" defer>）
const STORAGE_KEY = 'sudoku:theme'; // 'light' | 'dark'

// ---- Theme helpers ----
const prefersDarkMQL = window.matchMedia?.('(prefers-color-scheme: dark)');

function getSystemPrefersDark() {
    return !!prefersDarkMQL?.matches;
}
function currentTheme() {
    return (
        document.documentElement.getAttribute('data-theme') ||
        (getSystemPrefersDark() ? 'dark' : 'light')
    );
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
    applyTheme(currentTheme());
}

// ---- Debounced storage sync ----
let storageTimer = null;
function setupThemeStorageSync() {
    window.addEventListener(
        'storage',
        (ev) => {
            if (ev.key !== STORAGE_KEY) return;
            const v = ev.newValue;
            if (v !== 'light' && v !== 'dark') return;
            if (storageTimer) cancelAnimationFrame(storageTimer);
            storageTimer = requestAnimationFrame(() => applyTheme(v));
        },
        { passive: true }
    );
}

// ---- Respect system theme unless user chose manually ----
function setupSystemThemeFollow() {
    if (!prefersDarkMQL) return;
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === 'light' || saved === 'dark') return; // manual wins
    prefersDarkMQL.addEventListener?.('change', (e) => {
        applyTheme(e.matches ? 'dark' : 'light');
    });
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

// ---- Topbar autohide ----
function setupTopbarAutohide() {
    const topbar = document.querySelector('.sr-topbar');
    if (!topbar) return;
    let lastY = window.scrollY || 0;
    let ticking = false;
    const THRESH_HIDE = 10,
        THRESH_SHOW = 6;

    function onScroll() {
        const y = Math.max(0, window.scrollY || 0);
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

    document.addEventListener(
        'visibilitychange',
        () => {
            lastY = window.scrollY || 0;
        },
        { passive: true }
    );
    window.addEventListener(
        'scroll',
        () => {
            if (!ticking) {
                ticking = true;
                requestAnimationFrame(onScroll);
            }
        },
        { passive: true }
    );

    if ((window.scrollY || 0) > 1) topbar.setAttribute('data-elevated', '');
}

// ---- Download button (presentational only) ----
function setupDownloadButton() {
    const btn = document.getElementById('download-exe');
    if (!btn) return;
    btn.addEventListener('click', (e) => {
        e.preventDefault();
    });
}

// ============================================================================
//  Formula images (dark/light)
//  <img class="tex-img" data-light-src="..." data-dark-src="...">
//  レイアウト安定化のため：aspect-ratio 固定 + 差し替え前の freeze → 復元
// ============================================================================

const preloadCache = new Map(); // url -> Promise<void>
let swapAbort = null;
let io = null;

// --- 小物 ---
function ensureAttrs(img) {
    if (!img.hasAttribute('decoding')) img.setAttribute('decoding', 'async');
    if (!img.hasAttribute('loading')) img.setAttribute('loading', 'lazy');
    if (!img.hasAttribute('fetchpriority')) img.setAttribute('fetchpriority', 'low');
}

function desiredSrc(img, theme) {
    return theme === 'dark' ? img.dataset.darkSrc : img.dataset.lightSrc;
}

function preload(url, signal) {
    if (!url) return Promise.resolve();
    if (preloadCache.has(url)) return preloadCache.get(url);
    const p = new Promise((res, rej) => {
        const pic = new Image();
        pic.decoding = 'async';
        pic.referrerPolicy = 'no-referrer';
        pic.onload = () => res();
        pic.onerror = () => rej(new Error('img load error'));
        if (signal) {
            if (signal.aborted) return rej(new DOMException('aborted', 'AbortError'));
            signal.addEventListener('abort', () => rej(new DOMException('aborted', 'AbortError')), {
                once: true,
            });
        }
        pic.src = url;
        pic.decode?.().then(() => res()).catch(() => res());
    });
    preloadCache.set(url, p);
    return p;
}

// --- レイアウト安定化 helpers ---
// ① 初回ロード時に naturalWidth/Height から aspect-ratio を固定
function lockMathImageMetrics(img) {
    const apply = () => {
        const w = img.naturalWidth || 0;
        const h = img.naturalHeight || 0;
        if (w && h) img.style.aspectRatio = (w / h).toString();
    };
    if (img.complete) apply();
    else img.addEventListener('load', apply, { once: true });
}

// ② 差し替え前に描画サイズを一時固定（px）し、差し替え後に復元
function freezeSize(img) {
    const r = img.getBoundingClientRect();
    const prev = { width: img.style.width, height: img.style.height };
    img.style.width  = r.width  + 'px';
    img.style.height = r.height + 'px';
    return () => {
        img.style.width  = prev.width  || '';
        img.style.height = prev.height || '';
    };
}

// --- 画面内ロード制御（遅延差し替え）
function buildObserver(theme) {
    if (io) io.disconnect();
    if (!('IntersectionObserver' in window)) {
        io = null;
        return;
    }
    io = new IntersectionObserver(
        (entries) => {
            for (const e of entries) {
                if (!e.isIntersecting) continue;
                const img = e.target;
                swapOneImage(img, theme);
                io.unobserve(img);
            }
        },
        { rootMargin: '128px 0px' }
    );
}

// --- 差し替え本体（プリロード + 凍結 → 復元 + aspect-ratio 固定）
async function swapOneImage(img, theme, signal) {
    try {
        ensureAttrs(img);
        const next = desiredSrc(img, theme);
        if (!next || img.src === next) return;

        const unfreeze = freezeSize(img);
        await preload(next, signal);

        requestAnimationFrame(() => {
            if (signal?.aborted) return;

            const onload = () => {
                lockMathImageMetrics(img); // natural size → aspect-ratio
                requestAnimationFrame(unfreeze); // 1フレーム後に px 固定解除（height:1emへ）
                img.removeEventListener('load', onload);
            };
            img.addEventListener('load', onload, { once: true });

            img.src = next;
        });
    } catch {
        if (!signal?.aborted) img.src = desiredSrc(img, theme) || img.src;
    }
}

// --- ページ内の数式画像をまとめて切替
function swapFormulaImages(theme) {
    // 前回のプリロードをキャンセル（連打対策）
    swapAbort?.abort();
    swapAbort = new AbortController();
    const { signal } = swapAbort;

    const imgs = document.querySelectorAll('img.tex-img[data-light-src][data-dark-src]');
    if (!imgs.length) return;

    buildObserver(theme);

    // 画面内優先: 可視は即座に、非可視は IO で
    const visible = [];
    const pending = [];
    for (const img of imgs) {
        ensureAttrs(img);
        const rect = img.getBoundingClientRect();
        const vpH = window.innerHeight || document.documentElement.clientHeight;
        const inView = rect.top < vpH + 128 && rect.bottom > -128;
        if (inView || !io) visible.push(img);
        else pending.push(img);
    }

    // 可視を並列プリロード→到着次第に即切替
    for (const img of visible) {
        const next = desiredSrc(img, theme);
        if (!next || img.src === next) continue;
        // まず比率ロック（初回のみでも無害）
        lockMathImageMetrics(img);
        preload(next, signal)
            .then(() => swapOneImage(img, theme, signal))
            .catch(() => swapOneImage(img, theme, signal));
    }

    // 非可視は IntersectionObserver に任せる（必要になった時点でロード）
    if (io) for (const img of pending) io.observe(img);
}

// --- 動的に追加される数式画像にも追従
const mo = new MutationObserver((muts) => {
    const theme = currentTheme();
    for (const m of muts) {
        m.addedNodes?.forEach((n) => {
            if (!(n instanceof HTMLElement)) return;

            // 直接 img
            if (n.matches?.('img.tex-img[data-light-src][data-dark-src]')) {
                ensureAttrs(n);
                lockMathImageMetrics(n); // 先に比率ロック
                swapOneImage(n, theme, swapAbort?.signal);
            }
            // 子孫に img
            n.querySelectorAll?.('img.tex-img[data-light-src][data-dark-src]').forEach((img) => {
                ensureAttrs(img);
                lockMathImageMetrics(img); // 先に比率ロック
                swapOneImage(img, theme, swapAbort?.signal);
            });
        });
    }
});

// ---- Init ----
document.addEventListener('DOMContentLoaded', () => {
    loadInitialTheme();
    setupThemeToggle();
    setupSystemThemeFollow();
    setupThemeStorageSync();
    setupTopbarAutohide();
    setupDownloadButton();

    // 既存の数式画像の aspect-ratio を初回で固定
    document.querySelectorAll('img.tex-img').forEach(lockMathImageMetrics);

    // 監視開始（動的挿入にも対応）
    mo.observe(document.body, { childList: true, subtree: true });
});
