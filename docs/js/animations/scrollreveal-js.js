// IIFE 版（非モジュール）。<script src="...scrollreveal.min.js" defer> より後に読み込む。
// あなたの元コードと同じAPI/値を基本に、堅牢化だけ足した版。

(function () {
    // --- 二重初期化ガード（同じファイルが複数回実行されても1度だけ） ---
    if (window.__SR_INJECTED__) return;
    window.__SR_INJECTED__ = true;

    // --- ScrollReveal 本体が未ロードでも落ちない ---
    function waitForSR() {
        return new Promise((resolve) => {
            if (typeof ScrollReveal !== 'undefined') return resolve(true);
            // defer読み込みを待つ：最大 ~2秒ポーリング
            let n = 0;
            const t = setInterval(() => {
                if (typeof ScrollReveal !== 'undefined' || n++ > 40) {
                    clearInterval(t);
                    resolve(typeof ScrollReveal !== 'undefined');
                }
            }, 50);
        });
    }

    function getTopbarOffset() {
        try {
            const cs = getComputedStyle(document.documentElement);
            const v = cs.getPropertyValue('--topbar-h').trim();
            const n = parseFloat(v);
            return Number.isFinite(n) ? Math.max(0, n) : 0;
        } catch { return 0; }
    }

    // reduce-motion が ON でも “完全0” にはせず、短く動かす（動かない誤解回避）
    function computeDuration(base) {
        try {
            const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
            if (reduce) return Math.max(220, Math.floor(base * 0.4));
        } catch { }
        return base;
    }

    // 初期不可視との競合を避ける軽いマーカー（任意）
    function markReady() {
        document.body.classList.add('sr-ready');
    }

    async function init() {
        const ok = await waitForSR();
        if (!ok) {
            console.warn('[scrollreveal-js] ScrollReveal not found. Skip.');
            markReady();
            return;
        }

        // 初期レイアウト安定のため 1 フレーム待つ
        await new Promise(requestAnimationFrame);

        const topOffset = getTopbarOffset();
        const duration = computeDuration(2000); // あなたの既定値を尊重

        const sr = ScrollReveal({
            origin: 'top',
            distance: '60px',
            duration,       // 2000ms（reduce時は短縮）
            delay: 300,
            reset: false,   // “到達後に消える” を防止
            mobile: true,
            desktop: true,
            opacity: 0,
            scale: 1,
            viewFactor: 0.15,
            viewOffset: { top: topOffset + 6, right: 0, bottom: 0, left: 0 },
            afterReveal(el) { el.dataset.srShown = '1'; },
            beforeReset(el) { if (el?.dataset?.srShown === '1') return false; }
        });

        // === あなたの並びをそのまま踏襲 =========================
        sr.reveal('.home__image, .features__container, .faq__container, .approach__frame');

        sr.reveal('.home__data', {
            delay: 900,
            origin: 'bottom',
        });

        sr.reveal('.home__feature', {
            delay: 1200,
            origin: 'bottom',
        });

        sr.reveal('.home__social, .home__exe', {
            delay: 1500,
        });

        // 軽い FOUC 対策（任意）
        markReady();

        // デバッグログ（不要なら消してOK）
        // console.info('[scrollreveal-js] inited', {
        //   version: ScrollReveal.version,
        //   topOffset,
        //   duration
        // });
    }

    // DOM 準備後に実行（defer併用でも安全）
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init, { once: true });
    } else {
        init();
    }
})();
