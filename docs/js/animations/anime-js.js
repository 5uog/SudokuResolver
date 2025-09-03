// ========= docs/js/animations/anime-js.js =========

(function () {
    var start = Date.now();
    (function wait() {
        if (window.anime || Date.now() - start > 1500) return boot();
        setTimeout(wait, 30);
    })();

    function boot() {
        if (!window.anime) {
            console.error('[anime-compat] anime.js not found');
            return;
        }
        var A = window.anime;

        if (typeof A.stagger !== 'function') {
            A.stagger = function (step) {
                return function (_, i) { return i * (step || 0); };
            };
        }

        if (!A.text || typeof A.text.split !== 'function') {
            A.text = {
                split: function (selector, opts) {
                    var el = typeof selector === 'string' ? document.querySelector(selector) : selector;
                    if (!el) return { chars: [] };
                    if (el.__chars_split__) return { chars: el.__chars_split__ };

                    var txt = el.textContent || '';
                    if (!el.hasAttribute('aria-label')) el.setAttribute('aria-label', txt);

                    el.textContent = '';
                    var frag = document.createDocumentFragment();
                    var out = [];
                    for (var i = 0; i < txt.length; i++) {
                        var s = document.createElement('span');
                        s.textContent = txt[i];
                        s.style.display = 'inline-block';
                        s.style.willChange = 'transform,opacity';
                        s.style.transform = 'translateY(100%)';
                        s.style.opacity = '0';
                        frag.appendChild(s);
                        out.push(s);
                    }
                    el.appendChild(frag);
                    el.style.display = 'inline-block';
                    el.style.overflow = 'hidden';
                    el.__chars_split__ = out;
                    return { chars: out };
                }
            };
        }

        if (typeof A.animate !== 'function') {
            A.animate = function (targets, opts) {
                var t = A.timeline({ loop: !!(opts && opts.loop), autoplay: true });

                var delay = typeof opts.delay === 'function' ? opts.delay : (opts.delay || 0);
                var dur = +opts.duration || 900;

                function toEasing(name, fallback) {
                    if (name === 'out(3)') return 'cubicBezier(0.22,1,0.36,1)';
                    if (name === 'in(3)') return 'cubicBezier(0.65,0,0.35,1)';
                    return (typeof name === 'string' && name) || fallback || 'cubicBezier(0.22,1,0.36,1)';
                }

                var steps = (opts && Array.isArray(opts.y)) ? opts.y : [];
                var stepIn = steps[0] || { to: ['100%', '0%'] };
                var stepOut = steps[1] || { to: '-100%', delay: 0, ease: 'in(3)' };

                t.add({
                    targets: targets,
                    translateY: Array.isArray(stepIn.to) ? stepIn.to : ['100%', '0%'],
                    opacity: [0, 1],
                    delay: delay,
                    duration: dur,
                    easing: toEasing(opts.ease)
                });

                var stay = +stepOut.delay || 0;
                t.add({
                    targets: targets,
                    endDelay: stay,
                    translateY: Array.isArray(stepOut.to) ? stepOut.to : ['0%', '-100%'],
                    opacity: [1, 0],
                    delay: delay,
                    duration: dur,
                    easing: toEasing(stepOut.ease, 'cubicBezier(0.65,0,0.35,1)'),
                    
                    complete: function (a) {
                        var list = a.animatables ? a.animatables.map(function (x) { return x.target; }) : (Array.isArray(targets) ? targets : [targets]);
                        list.forEach(function (s) {
                            try { s.style.transform = 'translateY(100%)'; s.style.opacity = '0'; } catch (e) { }
                        });
                    }
                });

                return t;
            };
        }
    }
})();

const { animate, text, stagger } = anime;

const { chars: chars1 } = text.split('.feature__title-1', {
    chars: true,
});

const { chars: chars2 } = text.split('.feature__title-2', {
    chars: true,
});

animate(chars1, {
    y: [
        { to: ['100%', '0%'] },
        { to: '-100%', delay: 4000, ease: 'in(3)' }
    ],
    duration: 900,
    ease: 'out(3)',
    delay: stagger(80),
    loop: true,
});

animate(chars2, {
    y: [
        { to: ['100%', '0%'] },
        { to: '-100%', delay: 4000, ease: 'in(3)' }
    ],
    duration: 900,
    ease: 'out(3)',
    delay: stagger(80),
    loop: true,
});
