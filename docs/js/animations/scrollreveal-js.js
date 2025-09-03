// docs/js/animations/scrollreveal-js.js
const sr = ScrollReveal({
    origin: 'top',
    distance: '60px',
    duration: 2000,
    delay: 300,
})

sr.reveal(`.home__image, .features__container, .faq__container, .approach__frame`)
sr.reveal(`.section__title`, { delay: 900, origin: 'right' })
sr.reveal(`.home__data`, { delay: 900, origin: 'bottom' })
sr.reveal(`.home__feature`, { delay: 1200, origin: 'bottom' })
sr.reveal(`.home__social, .home__exe`, { delay: 1500 })
sr.reveal(`.sr-demo-shell`, { delay: 1800, origin: 'left' })