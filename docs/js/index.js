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
import { initHashlessAnchors } from './utils/hashless-anchors.js';

// --- UI components ---
import { renderNavbar } from './components/nav.js';
import { renderFooter } from './components/footer.js';

// ===== Boot ASAP: show loading overlay =====
Loading.init({
    minVisibleMs: 360,
    navDelayMs: 120,
    backdropOpacity: 0.18,
});

// ---- /docs/ 基準を import.meta.url から堅牢に抽出（GH Pages / ローカル両対応） ----
function getDocsBaseDir() {
    try {
        const u = new URL(import.meta.url);            // 例: /SudokuResolver/docs/js/index.js or /docs/js/index.js
        const p = u.pathname;
        const i = p.indexOf('/docs/');
        if (i !== -1) return p.slice(0, i + '/docs/'.length); // "/SudokuResolver/docs/" or "/docs/"
    } catch { }
    // フォールバック（まず使われない想定）
    return '/docs/';
}
function normalizePath(p) {
    return p.replace(/\/index\.html?$/i, '/');
}

document.addEventListener('DOMContentLoaded', async () => {
    let active = '';

    try {
        // 直リンク(#あり)以外は必ず先頭へ（内側コンテナも0に）— 残留スクロール対策
        if (!location.hash) {
            window.scrollTo(0, 0);
            document.querySelectorAll('.approach__scroll').forEach(el => (el.scrollTop = 0));
        }

        // 0) 動作環境・ユーザー設定
        const prefersReducedMotion =
            window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches ?? false;
        const hasHoudini = typeof CSS !== 'undefined' && 'registerProperty' in CSS;

        // 1) テーマ適用
        Theme.init();

        // 1.1) グローバル色相アニメ（reduce-motion 配慮）
        if (!prefersReducedMotion && hasHoudini) {
            document.documentElement.setAttribute('data-hue-animate', 'on');
        } else {
            document.documentElement.removeAttribute('data-hue-animate');
            if (!prefersReducedMotion) {
                try {
                    const { startHueCycle } = await import('./utils/hue-animate.js');
                    startHueCycle({
                        periodMs: 60000,
                        min: 0,
                        max: 360,
                        unit: 'deg',
                        registerProperty: true,
                    });
                } catch (e) {
                    console.warn('[hue-cycle] JS fallback failed or module missing:', e);
                }
            } else {
                try {
                    const { stopHueCycle } = await import('./utils/hue-animate.js');
                    stopHueCycle();
                } catch { }
            }
        }

        // 1.2) ハッシュ無しアンカー（最初期にセット：URLを汚さずスクロール）
        initHashlessAnchors({
            smooth: true,
            containerSelectors: ['.approach__scroll', '.approach__frame'], // ← 内側を優先
            innerOffset: 10,                         // 見出しの上に少し余白（8〜16で好み調整）
            detectScrollableAncestor: true,         // 近傍のスクロール祖先を自動検出
            // headerOffset は未指定で OK（--header-height を自動参照）
        });

        // 2) ルーティング判定（/docs/ を基準に安定検出）
        const docsBase = getDocsBaseDir();                           // 例: "/SudokuResolver/docs/" or "/docs/"
        const here = normalizePath(location.pathname);               // index.html 正規化
        const docsHome = normalizePath(docsBase);                    // "/.../docs/"
        const inMath = here.startsWith(normalizePath(docsBase + 'math/'));
        active = (here === docsHome) ? 'home' : (inMath ? 'math' : '');

        // 3) ナビ/フッター描画
        renderNavbar(active);
        renderFooter(); // 年は内部で自動最新化

        // 4) 上部UI・各ユーティリティ
        Topbar.init();
        Formula.init();

        // 【重要】scroll.js 側は“可視領域検出・オフセット”中心に使う
        // クリック横取りは hashless-anchors が担当するため、該当オプションがあれば無効化。
        // （対応していない実装でも、capture=true でこちらが優先されるため大丈夫）
        initAnchorOffsetScroll({
            extraOffset: 12,
            smooth: !prefersReducedMotion,
            scrollContainer: 'auto',
            // もし util がサポートしていれば以下を渡してクリック横取り/URL書き換えを抑止
            interceptClicks: false,
            hashMode: 'ignore',
            activeLink: {
                enable: true,
                // 見出し(h2)を追跡＋保険で section[id] も含める（あなたの構造に合わせる）
                sectionSelector: '#approach-doc h2[id], .approach__scroll h2[id], section[id]',
                // TOCは .approach__toc-inline、ナビ内ancherも拾う
                linkQuery: (id) =>
                    `.approach__toc-inline a[href="#${id}"], .nav__menu a[href*="#${id}"]`,
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
        // 直リンク(#あり)以外は復帰時もトップへ（内側コンテナも0に）
        if (!location.hash) {
            requestAnimationFrame(() => {
                window.scrollTo(0, 0);
                document.querySelectorAll('.approach__scroll').forEach(el => (el.scrollTop = 0));
            });
        }
    }
});
