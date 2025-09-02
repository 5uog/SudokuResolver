// /docs/js/utils/loading-overlay.js
// Robust Loading Overlay controller (paint-before boot + hardened)
let el;
const state = { hidden: false, entering: false, leaving: false };
let safetyTimer = null;

const MAX_WAIT_MS = 8000;  // 保険: 8s 経過で強制撤去
const MIN_SHOW_MS = 400;   // チラつき防止: 最低表示時間
let shownAt = 0;

function addBodyLock() {
    try { document.body?.classList.add('has-loading'); } catch { }
    try { document.documentElement?.classList.add('boot-loading'); } catch { }
}
function removeBodyLock() {
    try { document.body?.classList.remove('has-loading'); } catch { }
    try { document.documentElement?.classList.remove('boot-loading'); } catch { }
}

function clearTimeoutSafe() {
    if (safetyTimer) { clearTimeout(safetyTimer); safetyTimer = null; }
}

function ensureInBodyRoot(node) {
    if (!node) return;
    if (node.parentNode === document.body) return;
    document.body.prepend(node); // “昇格”
}

function ensureCriticalStyles() {
    if (!el) return;
    // 外部CSSが無効でも全面化を維持
    el.style.position = 'fixed';
    el.style.top = '0'; el.style.right = '0'; el.style.bottom = '0'; el.style.left = '0';
    el.style.zIndex = '9999';
    el.style.display = el.style.display || 'grid';
    el.style.placeItems = el.style.placeItems || 'center';
    el.style.overflow = 'hidden';
    // 背景: CSS変数 (--sr-loading-bg) が無ければ #0b0e14 を強制
    try {
        const bgVar = getComputedStyle(el).getPropertyValue('--sr-loading-bg').trim();
        el.style.background = bgVar && bgVar !== 'initial' ? bgVar : '#0b0e14';
    } catch {
        el.style.background = '#0b0e14';
    }
}

function getNow() {
    return (window.performance?.now?.() ?? Date.now());
}

function forceRemove() {
    if (!el || state.hidden) return;
    state.hidden = true;
    try { el.remove(); } catch { }
    removeBodyLock();
    clearTimeoutSafe();
    try { window.removeEventListener('load', onWindowLoad, { capture: false }); } catch { }
}

function onWindowLoad() {
    // 初期化完了シグナル: 最低表示時間を満たしてから閉じる
    const remain = Math.max(0, MIN_SHOW_MS - (getNow() - shownAt));
    setTimeout(hide, remain);
}

export function show() {
    if (state.leaving || state.hidden) return;

    // 既に entering 中なら body lock だけ確実に
    if (state.entering && el) { addBodyLock(); return; }

    el = document.getElementById('sr-loading');

    if (!el) {
        // ブートが無かった場合の保険: 生成して即昇格
        el = document.createElement('div');
        el.id = 'sr-loading';
        el.className = 'sr-loading';
        el.innerHTML =
            '<div class="sr-loading__inner">' +
            '<div class="sr-loading__spinner" aria-hidden="true"></div>' +
            '<p class="sr-loading__label">Loading…</p>' +
            '</div>';
        // body がまだ無い可能性も考慮
        if (document.body) document.body.prepend(el);
        else document.documentElement.appendChild(el);
    } else {
        if (document.body) ensureInBodyRoot(el);
    }

    ensureCriticalStyles();
    addBodyLock();

    try {
    // すでに CSS が来ていれば即、未読でも次フレで反映
    requestAnimationFrame(() => el.classList.add('is-entered'));
    } catch {}

    const isBoot = el.classList.contains('sr-loading--boot');
    shownAt = getNow();

    // ブート要素の場合、既に“表示済み”なのでフェードインは不要
    if (!isBoot) {
        requestAnimationFrame(() => {
            state.entering = true;
            // もしフェードイン演出を入れたいならここで class を付ける
            // el.classList.add('is-entered');
            clearTimeoutSafe();
            safetyTimer = setTimeout(forceRemove, MAX_WAIT_MS);
        });
    } else {
        // ブート経由でも safetyTimer は張っておく（万一 load/ready が来ない場合の保険）
        clearTimeoutSafe();
        safetyTimer = setTimeout(forceRemove, MAX_WAIT_MS);
    }

    // window.load で閉じる（SPAなら ready() を積極的に呼ぶのが◎）
    try { window.addEventListener('load', onWindowLoad, { once: true }); } catch { }
}

/** アプリ初期化完了地点で呼ぶ（SPA遷移でもOK） */
export function ready() {
    onWindowLoad();
}

export function hide() {
    if (!el || state.leaving || state.hidden) return;

    state.leaving = true;

    const finish = () => forceRemove();

    let ended = false;
    const onEnd = (ev) => {
        if (ended) return;
        if (ev && ev.target !== el) return; // #sr-loading の opacity 変化のみ
        ended = true;
        try { el.removeEventListener('transitionend', onEnd); } catch { }
        finish();
    };

    try { el.addEventListener('transitionend', onEnd, { once: true }); } catch { }

    // フェードアウト開始（.sr-loading の opacity が CSS で遷移）
    try { el.classList.add('is-leaving'); } catch { }

    // さらに保険：transitionend が来なくても 1s 後に剥がす
    setTimeout(finish, 1000);
}

/** 自動起動（任意）：DOM 構築時に表示 → アプリ準備で ready()/window.load で閉じる */
export function init() {
    // 旧スプラッシュ(#sr-splash)が居たら除去（重なり防止）
    try { document.querySelectorAll('#sr-splash').forEach(n => n.remove()); } catch { }

    // すでにブートで #sr-loading は存在しているはず。
    // ただし存在保証のため show() を呼んでも安全。
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', show, { once: true });
    } else {
        show();
    }
}
