// docs/js/index.js

// --- Core utils ---
import * as Theme from './utils/theme.js';
import * as Formula from './utils/formula-images.js';
import * as Topbar from './utils/topbar.js';
import { initAnchorOffsetScroll } from './utils/scroll.js';
import { initMathKatex } from './utils/math-katex.js';
import * as Guards from './utils/guards.js';
import * as Print from './utils/print.js';
import * as FAQ from './utils/faq.js';
import { setupApproachLazyLoad } from './utils/approach-loader.js';
import { initHashlessAnchors } from './utils/hashless-anchors.js';

// --- UI components ---
import { renderNavbar } from './components/nav.js';
import { renderFooter } from './components/footer.js';

/* ======================================================
 * /docs/ 基準を import.meta.url から堅牢に抽出（GH Pages / ローカル両対応）
 *  - /SudokuResolver/docs/js/index.js → /SudokuResolver/docs/
 *  - /docs/js/index.js                → /docs/
 * ====================================================== */
function getDocsBaseDir() {
    try {
        const { pathname } = new URL(import.meta.url);
        const i = pathname.indexOf('/docs/');
        if (i !== -1) return pathname.slice(0, i + '/docs/'.length);
    } catch { }
    return '/docs/';
}
function normalizePath(p) {
    return p.replace(/\/index\.html?$/i, '/');
}

/** トップ遷移時に window / 内側スクロールを初期化（hashがあれば何もしない） */
function atTopResetInnerScroll() {
    if (!location.hash) {
        window.scrollTo(0, 0);
        document.querySelectorAll('.approach__scroll').forEach(el => (el.scrollTop = 0));
    }
}

/** アプローチ断片（章HTML）のベースパスを推定 */
function guessApproachBase(docsBase) {
    // URL から推定（/docs/math/ があれば優先）
    const here = normalizePath(location.pathname);
    const mathRoot = normalizePath(docsBase + 'math/');
    const approachRoot = normalizePath(docsBase + 'approach/');
    if (here.startsWith(mathRoot)) return mathRoot;

    // DOM から推定（data-srcの中にスラッシュがあればその親を推測）
    const ph = document.querySelector('.approach__scroll .approach__section[data-src]');
    if (ph) {
        const file = ph.getAttribute('data-src') || '';
        // 断片が裸ファイル名なら既定は /docs/approach/ とする
        if (!file.includes('/')) return approachRoot;
        // 相対的にサブフォルダが示されている場合は docsBase + そのサブフォルダ を採用…としたいが
        // 信頼できる基準が無いので安全側に approachRoot を返す
        return approachRoot;
    }

    // フォールバック
    return approachRoot;
}

document.addEventListener('DOMContentLoaded', async () => {
    let active = '';

    try {
        atTopResetInnerScroll();

        // 0) 実行環境フラグ
        const prefersReducedMotion =
            window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches ?? false;
        const hasHoudini = typeof CSS !== 'undefined' && 'registerProperty' in CSS;

        // 1) テーマ初期化
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
                    console.warn('[hue-cycle] fallback start failed:', e);
                }
            } else {
                try {
                    const { stopHueCycle } = await import('./utils/hue-animate.js');
                    stopHueCycle();
                } catch { }
            }
        }

        // 1.2) ハッシュ無しアンカー（URLを汚さずに内外スクロールへ誘導）
        initHashlessAnchors({
            smooth: true,
            containerSelectors: ['.approach__scroll', '.approach__frame'],
            innerOffset: 10,
            detectScrollableAncestor: true,
            // headerOffset は CSS 変数 --header-height を自動参照
        });

        // 2) ルーティング判定（/docs/ 基準）
        const docsBase = getDocsBaseDir();
        const here = normalizePath(location.pathname);
        const docsHome = normalizePath(docsBase);
        const inMath = here.startsWith(normalizePath(docsBase + 'math/'));
        active = here === docsHome ? 'home' : (inMath ? 'math' : '');

        const hasInlineApproach = !!document.querySelector('.approach__scroll .approach__section[data-src]');

        // 3) ナビ/フッター描画（年は内部で自動最新化）
        renderNavbar(active);
        renderFooter();

        // 4) UI/ユーティリティ初期化
        Topbar.init();
        Formula.init();

        // 4.1) 可視領域検出とオフセットスクロール（クリック横取りは hashless-anchors に委譲）
        const scrollEl = document.querySelector('.approach__scroll') || 'auto';
        initAnchorOffsetScroll({
            extraOffset: 12,
            smooth: !prefersReducedMotion,
            scrollContainer: scrollEl,
            interceptClicks: false,   // ★ハイジャックしない
            hashMode: 'ignore',       // ★URLハッシュは無視（ネイティブ挙動優先）
            activeLink: {
                enable: true,
                sectionSelector: '#approach-doc h2[id], .approach__scroll h2[id], section[id]',
                linkQuery: (id) =>
                    `.approach__toc a[href="#${id}"], .approach__toc-inline a[href="#${id}"], .nav__menu a[href*="#${id}"]`,
                activeClass: 'active-link',
                setAriaCurrent: true,
                minVisibleRatio: 0.35,
                bottomGuardRatio: 0.45,
            },
        });

        // 4.2) 数式レンダリング・保護・印刷（初回）
        initMathKatex();
        Guards.init?.();
        Print.init?.();

        // 5) FAQ
        FAQ.init({ allowMultiOpen: false, duration: 250 });

        // 6) Approach 章ファイルのオンデマンド読込（見えたらロード／離れたら破棄）
        if (active === 'math' || hasInlineApproach) {

            setupApproachLazyLoad({
                base: `${docsBase}math/`,
                root: document.getElementById('approach-scroll') || document.querySelector('.approach__scroll'),
                margin: '1200px',
                unloadFar: false,   // ★ 安定優先（直リンク/相互参照の事故を防ぐ）
                keepAhead: 3,
                keepBehind: 3,
                // hijackScrolling: true, // ←どうしてもコードでスクロールしたい場面のみ有効化
            });

            // 章が差し込まれたら、その章ぶんの KaTeX を増分処理（簡易：全体再実行でもOK）
            document.addEventListener(
                'sr:approach:section:loaded',
                () => { setTimeout(() => initMathKatex(), 0); },
                { passive: true }
            );
        } else {
            // 数学ページでもプレースホルダがないケースに備えて ready を投げておく
            document.dispatchEvent(new CustomEvent('sr:approach:ready'));
        }

        // 7) TOC ロジック（math 単体ページ／index 統合表示の両方で動かす）
        if (active === 'math' || hasInlineApproach) {
            try {
                const { init: initApproachToc } = await import(
                new URL('./utils/approach-toc-scroll.js', import.meta.url).href
                );

                // 同期/非同期どちらの init でも安全に実行する小ヘルパ
                const runSafe = (fn) => {
                try {
                    const r = fn();
                    if (r && typeof r.then === 'function') {
                    r.catch(() => { /* swallow */ });
                    }
                } catch { /* swallow */ }
                };

                // 即時初期化（骨格だけでも動く）
                setTimeout(() => runSafe(() => initApproachToc()), 0);
                // ローダ準備完了後にも初期化
                document.addEventListener(
                'sr:approach:ready',
                () => runSafe(() => initApproachToc()),
                { once: true, passive: true }
                );
            } catch (e) {
                console.error('[dynamic import] approach-toc-scroll.js failed:', e);
            }
        }
    } finally {
        // no-op
    }
});

// bfcache 復帰時のスクロール初期化
window.addEventListener('pageshow', (ev) => {
    if (ev.persisted) {
        // 直リンク(#hash)復帰時はネイティブの到達を優先（内側も触らない）
        if (!location.hash) {
            requestAnimationFrame(atTopResetInnerScroll);
        }
    }
});
