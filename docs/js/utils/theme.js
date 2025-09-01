/* ======================================================
                   docs/js/utils/theme.js
             テーマ適用・保存・UI同期（堅牢版）
   ====================================================== */

import { emit } from '../core/events.js';

const STORAGE_KEY = 'sudoku:theme'; // 'light' | 'dark'
const mql = (typeof window !== 'undefined' && window.matchMedia)
    ? window.matchMedia('(prefers-color-scheme: dark)')
    : null;

// --- Safe storage helpers (例外や無効環境を吸収) ---
function lsGet(key) {
    try { return window.localStorage?.getItem(key) ?? null; } catch { return null; }
}
function lsSet(key, val) {
    try { window.localStorage?.setItem(key, val); } catch { /* ignore */ }
}
function lsRemove(key) {
    try { window.localStorage?.removeItem(key); } catch { /* ignore */ }
}

// --- State getters ---
export function getSystem() { return !!mql?.matches; }
export function current() {
    const root = document?.documentElement;
    return root?.getAttribute('data-theme') || (getSystem() ? 'dark' : 'light');
}
export function savedPreference() {
    const v = lsGet(STORAGE_KEY);
    return (v === 'light' || v === 'dark') ? v : null;
}

// --- Internal: UI sync for the toggle button ---
function syncToggleButtonUI(theme) {
    const btn = document.getElementById('theme-toggle');
    if (!btn) return;

    const isDark = theme === 'dark';

    // ラベル（存在すれば）
    const labelEl = btn.querySelector('.sr-btn__label');
    if (labelEl) {
        const lightText = btn.dataset.labelLight || 'Light';
        const darkText = btn.dataset.labelDark || 'Dark';
        const nextText = isDark ? darkText : lightText;
        if (labelEl.textContent !== nextText) labelEl.textContent = nextText;
    }

    // ARIA と data
    const ariaLabel = `テーマ切替（現在: ${isDark ? 'Dark' : 'Light'}）`;
    if (btn.getAttribute('aria-label') !== ariaLabel) btn.setAttribute('aria-label', ariaLabel);
    if (btn.getAttribute('aria-pressed') !== (isDark ? 'true' : 'false')) {
        btn.setAttribute('aria-pressed', isDark ? 'true' : 'false');
    }
    if (btn.dataset.themeCurrent !== (isDark ? 'dark' : 'light')) {
        btn.dataset.themeCurrent = isDark ? 'dark' : 'light';
    }
}

// --- Internal: apply (idempotent; 変更がなければ触らない) ---
function apply(theme) {
    const t = (theme === 'dark') ? 'dark' : 'light';
    const root = document.documentElement;

    if (root.getAttribute('data-theme') !== t) {
        root.setAttribute('data-theme', t);
        if (root.style.colorScheme !== t) root.style.colorScheme = t;
        // 外部の購読者向け：テーマが"変わった"時のみ通知
        emit('theme:change', t);
    }

    // ボタン表示は毎回同期（テキストは差分更新）
    syncToggleButtonUI(t);

    // 適用が完了したタイミング通知（初期化/他タブ反映でも発火）
    emit('theme:applied', t);
}

// --- Public API ---
export function set(theme) {
    const t = (theme === 'dark') ? 'dark' : 'light';
    apply(t);
    lsSet(STORAGE_KEY, t);
}

export function clearSaved() {
    // システムに追従
    lsRemove(STORAGE_KEY);
    apply(getSystem() ? 'dark' : 'light');
}

export function toggle() {
    set(current() === 'dark' ? 'light' : 'dark');
}

// --- Initialization ---
function resolveInitialTheme() {
    const saved = savedPreference();
    if (saved) return saved;
    return getSystem() ? 'dark' : 'light';
}

export function init() {
    // 初期適用（FOUT/FOUC を減らすには、HTML 側で data-theme を先に出しておくとさらに良い）
    apply(resolveInitialTheme());

    // 他タブからの変更を反映
    window.addEventListener('storage', (e) => {
        if (e.key !== STORAGE_KEY) return;
        const v = e.newValue;
        if (v === 'light' || v === 'dark') apply(v);
        else clearSaved(); // null/不正値→クリアしてシステム追従
    }, { passive: true });

    // ユーザーが保存していない場合のみ、システム設定の変化に追従
    if (!savedPreference() && mql?.addEventListener) {
        mql.addEventListener('change', (e) => apply(e.matches ? 'dark' : 'light'));
    }
}
