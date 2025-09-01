/* ======================================================
                  docs/js/utils/topbar.js
        Auto-hide / elevation / theme-toggle wiring
   ====================================================== */

import { $, setBoolAttr, isFormish } from '../core/dom.js';
import { toggle as toggleTheme } from './theme.js';
import { rafQueueOnce, reducedMotionMQL } from '../core/events.js';

export function init() {
    const topbar = $('.sr-topbar');
    if (!topbar) return;

    // ---- Theme toggle wiring ----
    const btn = $('#theme-toggle');
    if (btn) {
        // クリック（CSS 側が data-theme を参照、JS は結線のみ）
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            toggleTheme();
        }, { passive: false });

        // キーボードショートカット（フォーム編集中は無効）
        document.addEventListener('keydown', (e) => {
            if (isFormish(e.target)) return;
            if (e.key === 't' || e.key === 'T') toggleTheme();
        }, { passive: true });
    }

    // ---- Auto-hide / elevation ----
    // しきい値（上へ少し戻ったら見せる、下へ進んだら隠す）
    const TH_HIDE = 10;
    const TH_SHOW = 6;

    let lastY = window.pageYOffset || window.scrollY || 0;

    // 初期状態：表示フラグ & elevation
    setBoolAttr(topbar, 'data-visible', true);
    setBoolAttr(topbar, 'data-elevated', lastY > 1);

    const onScrollCore = () => {
        const y = Math.max(0, window.pageYOffset || window.scrollY || 0);
        const delta = y - lastY;

        // elevation（1px 以上で影を出す）
        setBoolAttr(topbar, 'data-elevated', y > 1);

        // reduced motion の人は隠さない（アクセシビリティ配慮）
        if (reducedMotionMQL.matches) {
            setBoolAttr(topbar, 'data-visible', true);
            topbar.removeAttribute('data-hidden');
            lastY = y;
            return;
        }

        if (delta > TH_HIDE) {
            // 下スクロール：隠す
            setBoolAttr(topbar, 'data-hidden', true);
            topbar.removeAttribute('data-visible');
            lastY = y;
        } else if (delta < -TH_SHOW) {
            // 上スクロール：見せる
            setBoolAttr(topbar, 'data-visible', true);
            topbar.removeAttribute('data-hidden');
            lastY = y;
        }
    };

    const onScroll = () => rafQueueOnce('topbar@scroll', onScrollCore);

    // タブ再表示などで位置が飛ぶケース：基準を更新
    document.addEventListener('visibilitychange', () => {
        lastY = window.pageYOffset || window.scrollY || 0;
        rafQueueOnce('topbar@init', onScrollCore);
    }, { passive: true });

    // スクロール監視（passive + rAF 合成）
    window.addEventListener('scroll', onScroll, { passive: true });

    // 初回 rAF で状態反映（レイアウト確定後）
    rafQueueOnce('topbar@init', onScrollCore);
}
