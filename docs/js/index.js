// docs/js/index.js

// --- Core utils ---
import * as Theme from './utils/theme.js';
import * as Formula from './utils/formula-images.js';
import * as Topbar from './utils/topbar.js';
import { initAnchorOffsetScroll } from './utils/scroll.js';
import { initMathKatex } from './utils/math-katex.js';
import * as Guards from './utils/guards.js';
import * as Print from './utils/print.js';
import * as Loading from './utils/loading-overlay.js';
import * as FAQ from './utils/faq.js';
import { setupApproachLazyLoad } from './utils/approach-loader.js';

// --- UI components ---
import { renderNavbar } from './components/nav.js';
import { renderFooter } from './components/footer.js';

// ===== Boot ASAP: show loading overlay =====
Loading.init({
    minVisibleMs: 360,
    navDelayMs: 120,
    backdropOpacity: 0.18,
});

document.addEventListener('DOMContentLoaded', async () => {
    let active = '';

    try {
        // 0) 動作環境・ユーザー設定
        const prefersReducedMotion =
            window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches ?? false;
        const hasHoudini = typeof CSS !== 'undefined' && 'registerProperty' in CSS;

        // 1) テーマ適用
        Theme.init();

        // 1.1) グローバル色相アニメ
        // CSS(@property + keyframes) と JS フォールバックの競合を避ける:
        // - Houdini対応 → CSSのみ（data-hue-animate="on" を付与）
        // - 非対応 → CSSは無効のまま（属性を付けない）で JS を起動
        if (!prefersReducedMotion && hasHoudini) {
            document.documentElement.setAttribute('data-hue-animate', 'on');
        } else {
            document.documentElement.removeAttribute('data-hue-animate');
            if (!prefersReducedMotion) {
                try {
                    const { startHueCycle } = await import('./utils/hue-animate.js');
                    // 読みやすさ優先で寒色〜紫に限定（必要なら 0–360 へ）
                    startHueCycle({
                        periodMs: 60000, // 60秒/周（好みで調整）
                        min: 0,
                        max: 360,
                        unit: 'deg',
                        registerProperty: true, // 可能なら登録（補間の安定化）
                    });
                } catch (e) {
                    console.warn('[hue-cycle] JS fallback failed or module missing:', e);
                }
            } else {
                // reduce-motion の場合は動きを止める（念のためJS側も停止）
                try {
                    const { stopHueCycle } = await import('./utils/hue-animate.js');
                    stopHueCycle();
                } catch { }
            }
        }

        // 2) ルーティング判定
        const path = location.pathname;
        active =
            path.endsWith('/docs/') || path.endsWith('/docs/index.html')
                ? 'home'
                : path.includes('/docs/math/')
                    ? 'math'
                    : '';

        // 3) ナビ/フッター描画
        renderNavbar(active);
        renderFooter(); // 年は内部で自動最新化

        // 4) 上部UI・各ユーティリティ
        Topbar.init();
        Formula.init();
        initAnchorOffsetScroll({
            extraOffset: 12,
            smooth: true,
            scrollContainer: 'auto',
            activeLink: {
                enable: true,
                sectionSelector: '.approach__layout section[id], section[id]',
                linkQuery: (id) =>
                    `.approach__toc a[href="#${id}"], .nav__menu a[href*="#${id}"]`,
                activeClass: 'active-link',
                setAriaCurrent: true,
                minVisibleRatio: 0.35,
                bottomGuardRatio: 0.45,
            },
        });
        initMathKatex();
        Guards.init?.();
        Print.init?.();

        // 5) FAQ
        FAQ.init({ allowMultiOpen: false, duration: 250 });

        // 6) Approach 本文の遅延挿入
        setupApproachLazyLoad({
            src: './math/approach.html',
            selector: 'main',
        });

        // 7) Math 専用 TOC ロジック（任意）
        if (active === 'math') {
            try {
                const { init: initApproachToc } = await import('./approach-toc-scroll.js');
                // 遅延挿入がなくても動くよう即時 + ready 後の両対応
                setTimeout(() => initApproachToc().catch(() => { }), 0);
                document.addEventListener(
                    'sr:approach:ready',
                    () => {
                        initApproachToc().catch(() => { });
                    },
                    { once: true, passive: true }
                );
            } catch (e) {
                console.error('[dynamic import] approach-toc-scroll.js failed:', e);
            }
        }
    } finally {
        try {
            Loading.ready();
        } catch { }
    }
});

// bfcache 復帰保険
window.addEventListener('pageshow', (ev) => {
    if (ev.persisted) {
        try {
            Loading.ready();
        } catch { }
    }
});
