/* ======================================================
                   docs/js/utils/guards.js
         Copy/Contextmenu/Shortcut guard (SSR-safe)
   ====================================================== */

/**
 * 本モジュールは「抑止策」です（完全防止ではありません）。
 * - 右クリック/選択/ドラッグ/クリップボード操作の抑止（例外スコープあり）
 * - 一部ショートカット（印刷/保存/コピー/切り取り/全選択/ソース/DevTools）の抑止
 * - SSR セーフ、二重初期化ガード、設定の動的更新/解除に対応
 */

let _inited = false;

/** @typedef {{ 
 *   copy?: boolean,
 *   shortcuts?: boolean,
 *   css?: boolean,
 *   allowSelector?: string,
 *   protectContext?: boolean,
 *   protectSelect?: boolean,
 *   protectClipboard?: boolean,
 *   protectDrag?: boolean,
 *   blockDevtools?: boolean,
 *   blockPrint?: boolean
 * }} GuardOptions
 */

/** @type {Required<GuardOptions>} */
let _opt = {
    copy: true,              // コピー系の抑止一式
    shortcuts: true,         // ショートカット抑止
    css: true,               // CSS による user-select/draggable 抑止の補強
    allowSelector: '.allow-select', // 例外スコープ
    protectContext: true,    // 右クリック抑止
    protectSelect: true,     // 選択開始抑止（例外スコープ除く）
    protectClipboard: true,  // copy/cut 抑止
    protectDrag: true,       // dragstart 抑止
    blockDevtools: true,     // DevTools 系（F12, Ctrl+Shift+I/J/C）
    blockPrint: true         // Ctrl/Cmd + P など
};

// ---------- SSR/環境安全 ----------
const _hasDOM = typeof window !== 'undefined' && typeof document !== 'undefined';

// 受動イベントサポート検出（例外が出ても無視）
let _supportsPassive = false;
if (_hasDOM) {
    try {
        const opts = Object.defineProperty({}, 'passive', { get() { _supportsPassive = true; } });
        window.addEventListener('zz', () => { }, opts);
        window.removeEventListener('zz', () => { }, opts);
    } catch { /* noop */ }
}
const _listenOptsActive = _supportsPassive ? { capture: true, passive: false } : { capture: true };
const _listenOptsPassive = _supportsPassive ? { capture: true, passive: true } : { capture: true };

// ---------- 内部状態 ----------
const _listeners = {
    contextmenu: /** @type {((e: Event)=>void)|null} */(null),
    selectstart: /** @type {((e: Event)=>void)|null} */(null),
    copy: /** @type {((e: ClipboardEvent)=>void)|null} */(null),
    cut: /** @type {((e: ClipboardEvent)=>void)|null} */(null),
    dragstart: /** @type {((e: DragEvent)=>void)|null} */(null),
    keydown: /** @type {((e: KeyboardEvent)=>void)|null} */(null),
};

let _styleEl = /** @type {HTMLStyleElement|null} */(null);

// ---------- 例外スコープ判定 ----------
/**
 * コピー許可例外：フォーム/編集可能/allowSelector のいずれかに含まれているか
 * @param {Element|EventTarget|null} t
 * @returns {boolean}
 */
function _allowSel(t) {
    const el = /** @type {Element|null|undefined} */ (t instanceof Element ? t : null);
    if (!el) return false;
    const allowSel = _opt.allowSelector;
    return !!el.closest(`input, textarea, select, [contenteditable="true"], ${allowSel}`);
}

// ---------- スタイル注入（安定化） ----------
function _injectStyle() {
    if (!_hasDOM || !_opt.css) return;
    if (_styleEl && document.head.contains(_styleEl)) return;
    const existed = document.querySelector('style[data-guards="copy"]');
    if (existed) { _styleEl = /** @type {HTMLStyleElement} */(existed); return; }
    const css = `
html, body { -webkit-touch-callout: none; -webkit-user-select: none; user-select: none; }
img, svg { -webkit-user-drag: none; user-drag: none; }
input, textarea, select, [contenteditable="true"], ${_opt.allowSelector} {
  -webkit-user-select: text !important; user-select: text !important;
}
`;
    _styleEl = document.createElement('style');
    _styleEl.setAttribute('data-guards', 'copy');
    _styleEl.textContent = css;
    try { document.head.appendChild(_styleEl); } catch { /* noop */ }
}
function _removeStyle() {
    if (_styleEl?.parentNode) {
        try { _styleEl.parentNode.removeChild(_styleEl); } catch { /* noop */ }
    }
    _styleEl = null;
}

// ---------- Copy/Context/Drag/Select ガード ----------
function _enableCopyGuards() {
    if (!_hasDOM) return;
    if (_listeners.contextmenu || _listeners.selectstart || _listeners.copy || _listeners.cut || _listeners.dragstart) return;

    _injectStyle();

    if (_opt.protectContext) {
        _listeners.contextmenu = (e) => { if (!_allowSel(e.target)) { e.preventDefault(); } };
        document.addEventListener('contextmenu', _listeners.contextmenu, _listenOptsActive);
    }

    if (_opt.protectSelect) {
        _listeners.selectstart = (e) => { if (!_allowSel(e.target)) { e.preventDefault(); } };
        document.addEventListener('selectstart', _listeners.selectstart, _listenOptsActive);
    }

    if (_opt.protectClipboard) {
        const blockClipboard = (e) => {
            if (!_allowSel(e.target)) {
                try { e.preventDefault(); e.stopPropagation(); } catch { /* noop */ }
                // 可能なら空文字を押し込む（環境によっては無視される）
                try { (e /** @type {ClipboardEvent} */).clipboardData?.setData('text/plain', ''); } catch { /* noop */ }
            }
        };
        _listeners.copy = blockClipboard;
        _listeners.cut = blockClipboard;
        document.addEventListener('copy', _listeners.copy, _listenOptsActive);
        document.addEventListener('cut', _listeners.cut, _listenOptsActive);
    }

    if (_opt.protectDrag) {
        _listeners.dragstart = (e) => { if (!_allowSel(e.target)) { e.preventDefault(); } };
        document.addEventListener('dragstart', _listeners.dragstart, _listenOptsActive);
    }
}

function _disableCopyGuards() {
    if (!_hasDOM) return;

    if (_listeners.contextmenu) {
        try { document.removeEventListener('contextmenu', _listeners.contextmenu, _listenOptsActive); } catch { }
        _listeners.contextmenu = null;
    }
    if (_listeners.selectstart) {
        try { document.removeEventListener('selectstart', _listeners.selectstart, _listenOptsActive); } catch { }
        _listeners.selectstart = null;
    }
    if (_listeners.copy) {
        try { document.removeEventListener('copy', _listeners.copy, _listenOptsActive); } catch { }
        _listeners.copy = null;
    }
    if (_listeners.cut) {
        try { document.removeEventListener('cut', _listeners.cut, _listenOptsActive); } catch { }
        _listeners.cut = null;
    }
    if (_listeners.dragstart) {
        try { document.removeEventListener('dragstart', _listeners.dragstart, _listenOptsActive); } catch { }
        _listeners.dragstart = null;
    }

    _removeStyle();
}

// ---------- Shortcut/DevTools ガード ----------
function _enableShortcutGuards() {
    if (!_hasDOM) return;
    if (_listeners.keydown) return;

    _listeners.keydown = (e) => {
        const k = (e.key || '').toLowerCase();
        const mod = e.ctrlKey || e.metaKey;

        // 例外スコープでの文字入力やショートカットは許可
        if (_allowSel(e.target)) return;

        // 印刷/保存/コピー/切り取り/全選択/ソース表示 など
        if (mod && (
            (_opt.blockPrint && k === 'p') ||
            ['s', 'c', 'x', 'a', 'u'].includes(k)
        )) {
            e.preventDefault(); e.stopPropagation(); return;
        }

        // DevTools / コンソール / F12
        if (_opt.blockDevtools) {
            if ((mod && e.shiftKey && ['i', 'j', 'c'].includes(k)) || k === 'f12') {
                e.preventDefault(); e.stopPropagation(); return;
            }
        }
    };

    // keydown は必ず passive: false
    document.addEventListener('keydown', _listeners.keydown, _listenOptsActive);
}

function _disableShortcutGuards() {
    if (!_hasDOM) return;
    if (!_listeners.keydown) return;
    try { document.removeEventListener('keydown', _listeners.keydown, _listenOptsActive); } catch { }
    _listeners.keydown = null;
}

// ---------- Public API ----------
/**
 * 初期化（または再設定）
 * @param {GuardOptions} [options]
 */
export function init(options = {}) {
    if (!_hasDOM) { _inited = true; return; } // SSR: 何もしない
    if (_inited) { update(options); return; }
    _inited = true;
    _opt = { ..._opt, ...options };

    if (_opt.copy) _enableCopyGuards();
    if (_opt.shortcuts) _enableShortcutGuards();
}

/**
 * オプションの更新（動的にオン/オフ可能）
 * @param {GuardOptions} [options]
 */
export function update(options = {}) {
    _opt = { ..._opt, ...options };

    // copy guard
    if (_opt.copy) _enableCopyGuards();
    else _disableCopyGuards();

    // shortcut guard
    if (_opt.shortcuts) _enableShortcutGuards();
    else _disableShortcutGuards();

    // CSS の有効/無効を反映（copy==false でも css を残したい/消したい場合がある）
    if (_opt.css && (_opt.copy || _styleEl)) _injectStyle();
    else _removeStyle();
}

/** 解除（ページ遷移など） */
export function teardown() {
    _disableCopyGuards();
    _disableShortcutGuards();
    _inited = false;
}

/** 許可セレクタの動的変更（例：モーダル内に一時的な許可領域を追加） */
export function setAllowSelector(selector) {
    _opt.allowSelector = String(selector || '.allow-select');
    if (_styleEl) {
        // スタイルを付け直し（セレクタが変わるため）
        _removeStyle();
        if (_opt.css) _injectStyle();
    }
}

// ショートカットユーティリティ
export const enableCopy = () => update({ copy: true });
export const disableCopy = () => update({ copy: false });
export const enableShortcuts = () => update({ shortcuts: true });
export const disableShortcuts = () => update({ shortcuts: false });

/** デバッグ/テスト用：現在状態を取得 */
export function _getState() {
    return { _inited, _opt: { ..._opt } };
}
