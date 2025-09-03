// ========= docs/js/animations/swiper-js.js =========
(function () {
    if (window.__SWIPER_BOOTSTRAPPED__) return;
    window.__SWIPER_BOOTSTRAPPED__ = true;

    function waitForSwiper(maxWaitMs = 2000) {
        return new Promise((resolve) => {
            if (window.Swiper) return resolve(true);
            let t = 0, h = setInterval(() => {
                if (window.Swiper || (t += 50) >= maxWaitMs) {
                    clearInterval(h);
                    resolve(!!window.Swiper);
                }
            }, 50);
        });
    }

    function init() {
        if (!window.Swiper) return;
        const el = document.querySelector('.features__swiper');
        if (!el || el.__swiper_inited) return;
        el.__swiper_inited = true;

        const paginationEl = el.querySelector('.swiper-pagination');

        const swiper = new window.Swiper(el, {
            slidesPerView: 1,
            spaceBetween: 16,
            centeredSlides: false,

            preloadImages: false,
            lazy: { loadPrevNext: true, loadOnTransitionStart: true },

            resizeObserver: true,
            updateOnWindowResize: true,

            loop: true,
            grabCursor: true,
            speed: 480,

            pagination: { el: paginationEl, clickable: true },

            autoplay: {
                delay: 3200,
                disableOnInteraction: false,
            },

            breakpoints: {
                640: { slidesPerView: 2, spaceBetween: 20 },
                960: { slidesPerView: 2, spaceBetween: 24 },
                1280: { slidesPerView: 3, spaceBetween: 28 },
            }
        });

        document.addEventListener('visibilitychange', () => { if (!document.hidden) swiper.update(); });
        window.addEventListener('resize', () => swiper.update());
    }

    waitForSwiper().then((ok) => {
        if (!ok) {
            console.warn('[swiper-js] Swiper not found. Skip.');
            return;
        }
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', init, { once: true });
        } else {
            init();
        }
    });
})();
