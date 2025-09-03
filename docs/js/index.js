// ========= docs/js/index.js  (rev-anti-reflow) =========

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
import { optimizeFaqDom } from './utils/faq-dom-opt.js';

// --- UI components ---
import { renderNavbar } from './components/nav.js';
import { renderFooter } from './components/footer.js';

/* ======================================================
 * /docs/ 基準を import.meta.url から堅牢に抽出（GH Pages / ローカル両対応）
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
    const here = normalizePath(location.pathname);
    const mathRoot = normalizePath(docsBase + 'math/');
    const approachRoot = normalizePath(docsBase + 'approach/');
    if (here.startsWith(mathRoot)) return mathRoot;

    const ph = document.querySelector('.approach__scroll .approach__section[data-src]');
    if (ph) {
        const file = ph.getAttribute('data-src') || '';
        if (!file.includes('/')) return approachRoot;
        return approachRoot;
    }
    return approachRoot;
}

// [REV] ユーティリティ：idle/rAF
const rIC = window.requestIdleCallback || (fn => setTimeout(fn, 1));
const nextFrame = () => new Promise(requestAnimationFrame);
const twoFrames = async () => { await nextFrame(); await nextFrame(); };

document.addEventListener('DOMContentLoaded', async () => {
    let active = '';

    try {
        // [REV] 初回は読み取り/書き込みが混ざらないように、まず位置リセットだけ rAF 後に
        await nextFrame();
        atTopResetInnerScroll();

        // 0) 実行環境フラグ
        const prefersReducedMotion =
            window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches ?? false;
        const hasHoudini = typeof CSS !== 'undefined' && 'registerProperty' in CSS;

        // 1) テーマ初期化（書き込みのみ：OK）
        Theme.init();

        // 1.1) グローバル色相アニメ（reduce-motion 配慮）
        if (!prefersReducedMotion && hasHoudini) {
            document.documentElement.setAttribute('data-hue-animate', 'on');
        } else {
            document.documentElement.removeAttribute('data-hue-animate');
            if (!prefersReducedMotion) {
                // [REV] hue は UI に影響薄なので idle で後ろ倒し
                rIC(async () => {
                    try {
                        const { startHueCycle } = await import('./utils/hue-animate.js');
                        startHueCycle({
                            periodMs: 60000, min: 0, max: 360, unit: 'deg', registerProperty: true,
                        });
                    } catch (e) { console.warn('[hue-cycle] fallback start failed:', e); }
                });
            } else {
                rIC(async () => {
                    try {
                        const { stopHueCycle } = await import('./utils/hue-animate.js');
                        stopHueCycle();
                    } catch { }
                });
            }
        }

        // 1.2) ハッシュ無しアンカー（URLを汚さずに内外スクロールへ誘導）
        // [REV] スクロール関連はフォント確定後に（計測回数減）
        const initAnchorsDeferred = () => initHashlessAnchors({
            smooth: true,
            containerSelectors: ['.approach__scroll', '.approach__frame'],
            innerOffset: 10,
            detectScrollableAncestor: true,
        });

        // 2) ルーティング判定（/docs/ 基準）
        const docsBase = getDocsBaseDir();
        const here = normalizePath(location.pathname);
        const docsHome = normalizePath(docsBase);
        const inMath = here.startsWith(normalizePath(docsBase + 'math/'));
        active = here === docsHome ? 'home' : (inMath ? 'math' : '');

        const hasInlineApproach =
            !!document.querySelector('.approach__scroll .approach__section[data-src]');

        // 3) ナビ/フッター描画（年は内部で自動最新化） — 書き込みのみ
        renderNavbar(active);
        renderFooter();

        // [REV] フォントロード完了後に“スクロール/観測”系を始めると reflow が減る
        // さらに 1 フレーム待ちで初期レイアウトを安定させる
        (document.fonts?.ready || Promise.resolve()).then(async () => {
            await nextFrame();
            initAnchorsDeferred();
        });

        // 4) UI/ユーティリティ初期化
        // [REV] Topbar は layout 読みを伴う可能性があるため 2フレーム後に
        twoFrames().then(() => Topbar.init());

        // [REV] Formula.init は IO ベースなら早めでもOK。念のため rAF 後に。
        await nextFrame();
        Formula.init();

        // 4.1) アンカー・アクティブリンクはコスト高なので後ろ倒し/軽量化
        //      -> 最初は監視オフ/簡略で立ち上げ、必要なら再設定
        const scrollEl = document.querySelector('.approach__scroll') || 'auto';
        rIC(() => {
            initAnchorOffsetScroll({
                extraOffset: 12,
                smooth: !prefersReducedMotion,
                scrollContainer: scrollEl,
                interceptClicks: false,
                hashMode: 'ignore',
                // [REV] まず activeLink を無効化 or 簡略化（必要時に再init）
                activeLink: {
                    enable: false, // ←最小構成で立ち上げ
                    // enable: true,
                    // sectionSelector: '#approach-doc h2[id], .approach__scroll h2[id], section[id]',
                    // linkQuery: id => `.approach__toc a[href="#${id}"], .approach__toc-inline a[href="#${id}"], .nav__menu a[href*="#${id}"]`,
                    // activeClass: 'active-link',
                    // setAriaCurrent: true,
                    // minVisibleRatio: 0.35,
                    // bottomGuardRatio: 0.45,
                },
            });
        });

        // 4.2) 数式レンダリング・保護・印刷（初回）
        // [REV] まずは軽量処理だけ。KaTeX 本格走行は idle に。
        Guards.init?.();
        Print.init?.();

        rIC(() => initMathKatex()); // ← idle でレンダリング

        // 4.3) FAQのDOM最適化：idle（Most children/DOM depth 対策）
        rIC(() => {
            try { optimizeFaqDom('#faq'); } catch { }
        });

        // 5) FAQ（アコーディオン）: レイアウトに影響出にくいので rAF 後
        await nextFrame();
        FAQ.init({ allowMultiOpen: false, duration: 250 });

        // 6) Approach 章ファイルのオンデマンド読込
        if (active === 'math' || hasInlineApproach) {
            setupApproachLazyLoad({
                base: `${docsBase}math/`,
                root: document.getElementById('approach-scroll') || document.querySelector('.approach__scroll'),
                margin: '1200px',
                unloadFar: false,
                keepAhead: 3,
                keepBehind: 3,
            });

            // 章が差し込まれたら KaTeX を増分処理（idle）
            document.addEventListener(
                'sr:approach:section:loaded',
                () => rIC(() => { initMathKatex(); optimizeFaqDom('#faq'); }),
                { passive: true }
            );
        } else {
            document.dispatchEvent(new CustomEvent('sr:approach:ready'));
        }

        // 7) TOC ロジック
        if (active === 'math' || hasInlineApproach) {
            try {
                const { init: initApproachToc } = await import(
                    new URL('./utils/approach-toc-scroll.js', import.meta.url).href
                );

                // [REV] コストの高い観測は ready シグナル後＆idle で
                const runSafe = fn => { try { const r = fn(); if (r && typeof r.then === 'function') r.catch(() => { }); } catch { } };

                rIC(() => runSafe(() => initApproachToc()));
                document.addEventListener(
                    'sr:approach:ready',
                    () => rIC(() => runSafe(() => initApproachToc())),
                    { once: true, passive: true }
                );
            } catch (e) {
                console.error('[dynamic import] approach-toc-scroll.js failed:', e);
            }
        }

        // [REV] 必要になった時点でアクティブリンク監視を「重め設定」に切替できるフック
        // document.addEventListener('sr:nav:activate-links', () => {
        //   initAnchorOffsetScroll({ ...重め設定, activeLink: { enable: true, ... } });
        // }, { passive: true, once: true });

    } finally {
        // no-op
    }
});

// bfcache 復帰時のスクロール初期化
// [REV] passive + rAF
window.addEventListener('pageshow', (ev) => {
    if (ev.persisted && !location.hash) {
        requestAnimationFrame(atTopResetInnerScroll);
    }
}, { passive: true });
