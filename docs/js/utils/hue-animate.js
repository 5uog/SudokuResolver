// docs/js/utils/hue-animate.js
let _raf = null;
let _onVis = null;

/**
 * 開始：JSで --hue を滑らかに回す
 */
export function startHueCycle({
    periodMs = 30000,       // 1周の時間
    min = 0,                // 開始hue
    max = 360,              // 終了hue
    unit = 'deg',           // 'deg' を推奨（互換性安定）
    respectReducedMotion = true,
    registerProperty = true,
    bindVisibilityPause = true,
} = {}) {
    stopHueCycle();

    // reduce-motion を尊重
    if (respectReducedMotion) {
        const mql = window.matchMedia('(prefers-reduced-motion: reduce)');
        if (mql.matches) return;
    }

    const root = document.documentElement;

    // CSSアニメが有効だと inline を上書きしてしまうので無効化
    if (root.dataset.hueAnimate === 'on') {
        root.removeAttribute('data-hue-animate');
        // 念のため今フレームのアニメも殺す
        root.style.animation = 'none';
        // 次フレームで元に戻して副作用回避
        requestAnimationFrame(() => { root.style.animation = ''; });
    }

    // 可能なら型付きプロパティとして登録（補間の安定化）
    if (registerProperty && typeof CSS !== 'undefined' && 'registerProperty' in CSS) {
        try {
            CSS.registerProperty({
                name: '--hue',
                syntax: '<angle>',
                inherits: true,
                initialValue: `${min}${unit}`,
            });
        } catch {
            // 二重登録などは無視
        }
    }

    const t0 = performance.now();
    const span = max - min;

    const loop = (t) => {
        const elapsed = (t - t0) % periodMs;
        const ratio = elapsed / periodMs;          // 0..1
        const hue = min + span * ratio;
        root.style.setProperty('--hue', `${hue}${unit}`);
        _raf = requestAnimationFrame(loop);
    };

    _raf = requestAnimationFrame(loop);

    if (bindVisibilityPause) {
        _onVis = () => {
            if (document.hidden) {
                if (_raf) { cancelAnimationFrame(_raf); _raf = null; }
            } else {
                if (!_raf) _raf = requestAnimationFrame(loop);
            }
        };
        document.addEventListener('visibilitychange', _onVis, { passive: true });
    }
}

/** 停止：rAF解除＆ハンドラ掃除 */
export function stopHueCycle() {
    if (_raf) cancelAnimationFrame(_raf);
    _raf = null;
    if (_onVis) {
        document.removeEventListener('visibilitychange', _onVis);
        _onVis = null;
    }
}

/** 即時に特定色相へ（デバッグ/手動切替用） */
export function setHue(h, unit = 'deg') {
    document.documentElement.style.setProperty('--hue', `${h}${unit}`);
}

/** 現在の --hue を取得（確認用） */
export function getHue() {
    return getComputedStyle(document.documentElement)
        .getPropertyValue('--hue')
        .trim();
}
