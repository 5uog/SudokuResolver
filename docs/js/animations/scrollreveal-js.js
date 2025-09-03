// docs/js/animations/scrollreveal-js.js
(function () {
    if (window.__SR_INJECTED__) return;
    window.__SR_INJECTED__ = true;

    function waitForSR() {
        return new Promise((resolve) => {
            if (typeof ScrollReveal !== 'undefined') return resolve(true);
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

    function computeAnimParams() {
        const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
        if (reduced) {
            return { distance: '0px', duration: 240, delay: 0 };
        }
        return { distance: '12px', duration: 360, delay: 120 };
    }

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

        // 初期レイアウト安定のため 1フレーム待機（レイアウト確定後に観測開始）
        await new Promise(requestAnimationFrame);

        const isMobile = matchMedia('(pointer: coarse)').matches;
        const topOffset = getTopbarOffset();
        const anim = computeAnimParams();

        const sr = ScrollReveal({
            origin: 'bottom',
            distance: anim.distance,
            duration: anim.duration,
            delay: anim.delay,
            reset: false,          // once
            mobile: !isMobile,     // モバイルでは無効化
            desktop: true,
            opacity: 0,
            scale: 1,
            // 画面に“しっかり入ってから”発火（頻繁な判定を抑制）
            viewFactor: 0.24,
            viewOffset: { top: topOffset + 6, right: 0, bottom: 0, left: 0 },
            afterReveal(el) { el.dataset.srShown = '1'; },
            beforeReset(el) { if (el?.dataset?.srShown === '1') return false; }
        });

        // グループごとに reveal（your selectors）
        sr.reveal('.home__image, .features__container, .faq__container, .approach__frame');
        sr.reveal('.section__title');

        // 個別（遅延は控えめ）
        sr.reveal('.home__data', { delay: anim.delay + 100 });
        sr.reveal('.home__feature', { delay: anim.delay + 180 });
        sr.reveal('.home__social, .home__exe', { delay: anim.delay + 260 });

        markReady();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init, { once: true });
    } else {
        init();
    }
})();
