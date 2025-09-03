// docs/js/animations/swiperjs.js
const swiperFeatures = new Swiper('.features__swiper', {
    // レイアウトの安定化（“auto”は避け、breakpointsで切替）
    slidesPerView: 1,
    spaceBetween: 16,
    centeredSlides: false,

    // 画像遅延で初期 reflow を抑制
    preloadImages: false,
    lazy: { loadPrevNext: true, loadOnTransitionStart: true },

    // 内部の再計測を最小化
    resizeObserver: true,
    updateOnWindowResize: true,
    // DOM 監視は重いので必要時のみ（オフ）
    observer: false,
    observeParents: false,
    observeSlideChildren: false,

    loop: true,
    grabCursor: true,
    speed: 480,

    pagination: {
        el: '.swiper-pagination',
        clickable: true,
    },

    autoplay: {
        delay: 3200,
        disableOnInteraction: false,
    },

    // 画面幅で段階的に枚数を増やす（“auto”回避）
    breakpoints: {
        640: { slidesPerView: 1, spaceBetween: 20 },
        960: { slidesPerView: 2, spaceBetween: 24 },
        1280: { slidesPerView: 3, spaceBetween: 28 },
    },
});
