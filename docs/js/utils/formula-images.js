/* ======================================================
              docs/js/utils/formula-images.js
              数式画像の差し替え・IO/MO（強化版）
   ------------------------------------------------------
   - data-light-src / data-dark-src をテーマに応じて差し替え
   - data-*-srcset があれば srcset も切替
   - IntersectionObserver で遅延差し替え（先読み 160px）
   - 競合防止：AbortController / 二重 swap 抑止
   - 公開API: init(), refresh(theme?), destroy()
   ====================================================== */

import { $, $$ } from '../core/dom.js';
import { on } from '../core/events.js';

/* ------------------------------
 * 定数・状態
 * ------------------------------ */
const DEBUG = false;
const SELECTOR = 'img.tex-img[data-light-src][data-dark-src]';
const PRELOAD_MARGIN = '160px 0px';

const cache = new Map();            // URL -> Promise<void>
const swapping = new WeakSet();     // 進行中の IMG を記録（多重 swap 防止）

let io = null;                      // IntersectionObserver
let mo = null;                      // MutationObserver
let abortCtl = null;                // AbortController（まとめて中断）

/* ------------------------------
 * 低優先度属性の付与
 * ------------------------------ */
function ensureAttrs(img) {
    if (!img.hasAttribute('decoding')) img.setAttribute('decoding', 'async');
    if (!img.hasAttribute('loading')) img.setAttribute('loading', 'lazy');
    if (!img.hasAttribute('fetchpriority')) img.setAttribute('fetchpriority', 'low');
}

/* ------------------------------
 * アスペクト比の固定（自然寸・属性・data-* を順に参照）
 * ------------------------------ */
function lockAspect(img) {
    const apply = (w, h) => {
        if (w > 0 && h > 0) img.style.aspectRatio = (w / h).toString();
    };

    const fromAttrs = () => {
        const w = parseInt(img.getAttribute('width') || img.dataset.w || '0', 10);
        const h = parseInt(img.getAttribute('height') || img.dataset.h || '0', 10);
        if (w && h) return { w, h };
        return null;
    };

    const tryApply = () => {
        // 優先順：natural -> 属性/data ->（失敗時は何もしない）
        if (img.naturalWidth && img.naturalHeight) {
            apply(img.naturalWidth, img.naturalHeight);
            return;
        }
        const a = fromAttrs();
        if (a) apply(a.w, a.h);
    };

    if (img.complete) {
        tryApply();
    } else {
        img.addEventListener('load', tryApply, { once: true });
    }
}

/* ------------------------------
 * 欲しい URL/srcset を決める
 * ------------------------------ */
function pickTargets(img, theme) {
    const dark = theme === 'dark';
    const url = dark ? img.dataset.darkSrc : img.dataset.lightSrc;
    const srcset = dark ? img.dataset.darkSrcset : img.dataset.lightSrcset;
    return { url, srcset };
}

/* ------------------------------
 * プリロード（decode まで待機）
 * ------------------------------ */
function preload(url, signal) {
    if (!url) return Promise.resolve();
    if (cache.has(url)) return cache.get(url);

    const p = new Promise((resolve, reject) => {
        const pic = new Image();
        pic.decoding = 'async';
        pic.referrerPolicy = 'no-referrer';
        if (signal?.aborted) return reject(new DOMException('aborted', 'AbortError'));
        const onAbort = () => reject(new DOMException('aborted', 'AbortError'));
        signal?.addEventListener('abort', onAbort, { once: true });

        pic.onload = () => resolve();
        pic.onerror = () => reject(new Error('img load error'));
        pic.src = url;
        // decode がない環境でも onload で resolve される
        pic.decode?.().then(resolve).catch(resolve);
    });

    cache.set(url, p);
    return p;
}

/* ------------------------------
 * 実画像の差し替え（src/srcset）
 * ------------------------------ */
async function swap(img, theme, signal) {
    ensureAttrs(img);

    // 進行中ならスキップ（二重入らない）
    if (swapping.has(img)) return;

    const { url, srcset } = pickTargets(img, theme);
    if (!url) return;

    // 既に適用済みなら何もしない
    const sameSrc = img.currentSrc ? img.currentSrc === url : img.src === url;
    const sameSet = srcset ? img.srcset === srcset : true;
    if (sameSrc && sameSet) return;

    // 一時固定（サイズジャンプ抑止）
    const rect = img.getBoundingClientRect();
    const prevW = img.style.width;
    const prevH = img.style.height;
    img.style.width = rect.width ? rect.width + 'px' : prevW;
    img.style.height = rect.height ? rect.height + 'px' : prevH;

    swapping.add(img);
    try {
        await preload(url, signal);
        if (signal?.aborted) return;

        const onload = () => {
            lockAspect(img);
            img.style.width = prevW || '';
            img.style.height = prevH || '';
            img.removeEventListener('load', onload);
        };
        img.addEventListener('load', onload, { once: true });

        // srcset が指定されていれば優先的にセット
        if (srcset) {
            img.srcset = srcset;
        } else {
            // ない場合は空に（古い srcset の残存を防ぐ）
            if (img.hasAttribute('srcset')) img.removeAttribute('srcset');
        }
        img.src = url;

        if (DEBUG) console.debug('[formula-images] swapped:', { url, srcset, theme });
    } catch (err) {
        if (DEBUG) console.debug('[formula-images] swap aborted/failed:', err);
    } finally {
        swapping.delete(img);
    }
}

/* ------------------------------
 * IO の構築（見えたら差し替え）
 * ------------------------------ */
function buildIO(theme) {
    if (io) io.disconnect();
    if (!('IntersectionObserver' in window)) { io = null; return; }

    io = new IntersectionObserver((entries) => {
        for (const e of entries) {
            if (e.isIntersecting) {
                swap(e.target, theme, abortCtl?.signal);
                io.unobserve(e.target);
            }
        }
    }, { rootMargin: PRELOAD_MARGIN });
}

/* ------------------------------
 * まとめ更新（初期 & テーマ変更）
 * ------------------------------ */
function updateAll(theme) {
    // 古い pending をキャンセル
    abortCtl?.abort();
    abortCtl = typeof AbortController !== 'undefined' ? new AbortController() : null;

    buildIO(theme);

    const imgs = $$(SELECTOR);
    const vpH = window.innerHeight || document.documentElement.clientHeight;

    for (const img of imgs) {
        ensureAttrs(img);
        lockAspect(img);

        // すでに表示/近傍なら即 swap、そうでなければ IO に委譲
        const r = img.getBoundingClientRect();
        const inView = r.top < vpH + 160 && r.bottom > -160;
        if (inView || !io) {
            swap(img, theme, abortCtl?.signal);
        } else {
            io.observe(img);
        }
    }
}

/* ------------------------------
 * MutationObserver（動的追加の追従）
 * ------------------------------ */
function buildMO() {
    if (mo) mo.disconnect();
    mo = new MutationObserver((muts) => {
        const theme = document.documentElement.getAttribute('data-theme') || 'light';
        for (const m of muts) {
            if (!m.addedNodes || m.addedNodes.length === 0) continue;

            // 追加ノードに対してだけ最小限で処理
            m.addedNodes.forEach((n) => {
                if (!(n instanceof HTMLElement)) return;

                if (n.matches?.(SELECTOR)) {
                    ensureAttrs(n); lockAspect(n);
                    // 直近に見えていれば swap、そうでなければ IO
                    const r = n.getBoundingClientRect();
                    const vpH = window.innerHeight || document.documentElement.clientHeight;
                    const inView = r.top < vpH + 160 && r.bottom > -160;
                    if (inView || !io) swap(n, theme, abortCtl?.signal);
                    else io.observe(n);
                }

                const q = n.querySelectorAll?.(SELECTOR);
                if (q && q.length) {
                    q.forEach((img) => {
                        ensureAttrs(img); lockAspect(img);
                        const r = img.getBoundingClientRect();
                        const vpH = window.innerHeight || document.documentElement.clientHeight;
                        const inView = r.top < vpH + 160 && r.bottom > -160;
                        if (inView || !io) swap(img, theme, abortCtl?.signal);
                        else io.observe(img);
                    });
                }
            });
        }
    });

    mo.observe(document.body, { childList: true, subtree: true });
}

/* ------------------------------
 * 公開 API
 * ------------------------------ */
export function init() {
    // 既存 tex-img の ratio をとりあえず安定化
    $$('img.tex-img').forEach(lockAspect);

    const theme = document.documentElement.getAttribute('data-theme') || 'light';
    updateAll(theme);
    buildMO();

    // テーマ変更イベント（core/events.js の emit に合わせる）
    on('theme:applied', (t) => updateAll(t || theme));
}

export function refresh(theme) {
    // 外部から強制再評価したい場合
    const t = theme || document.documentElement.getAttribute('data-theme') || 'light';
    updateAll(t);
}

export function destroy() {
    abortCtl?.abort();
    io?.disconnect();
    mo?.disconnect();
    abortCtl = null;
    io = null;
    mo = null;
}
