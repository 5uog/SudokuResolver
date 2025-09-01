// docs/js/index.js
import * as Theme from './utils/theme.js';
import * as Formula from './utils/formula-images.js';
import * as Topbar from './utils/topbar.js';
import { initAnchorOffsetScroll } from './utils/scroll.js';
import { initMathKatex } from './utils/math-katex.js';
import * as Guards from './utils/guards.js';
import * as Print from './utils/print.js';

document.addEventListener('DOMContentLoaded', () => {
    Theme.init();
    Topbar.init();
    Formula.init();
    initAnchorOffsetScroll();
    initMathKatex();
    Guards.init?.();
    Print.init?.();
});
