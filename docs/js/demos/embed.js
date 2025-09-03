// ========= docs/js/demos/embed.js =========
'use strict';

import { wireSudokuDemo } from './controller.js';

/**
 * 埋め込みデモを mountEl に描画して初期化
 * @param {HTMLElement} mountEl  #sr-demo など
 */
export function mountSudokuDemo(mountEl) {
    if (!mountEl || mountEl.__srDemoMounted) return;
    mountEl.__srDemoMounted = true;

    mountEl.innerHTML = `
        <div class="sr-demo-main">
            <section class="sr-demo-wrap" aria-labelledby="demo-title">
                <div class="sr-board-frame" aria-label="Sudoku board">
                    <div class="sr-board" role="grid" aria-rowcount="9" aria-colcount="9" data-ref="board"></div>
                </div>

                <div class="sr-panel" data-ref="panel">
                    <button class="sr-btn sr-btn--primary" data-ref="solveBtn" type="button">解く</button>
                    <button class="sr-btn" data-ref="checkBtn" type="button">重複チェック</button>
                    <button class="sr-btn" data-ref="uniqBtn"  type="button">一意性チェック</button>
                    <button class="sr-btn" data-ref="clearBtn" type="button">クリア</button>
                    <button class="sr-btn" data-ref="sampleBtn" type="button">例題</button>
                    <button class="sr-btn" data-ref="pasteBtn" type="button" title="81文字（1-9 と .／0）を貼り付け">貼り付け</button>
                </div>

                <pre class="sr-solution" aria-live="polite" data-ref="solution"></pre>
            </section>
        </div>
    `;

    // --- 参照を集めて controller に渡す ---
    const boardEl = mountEl.querySelector('[data-ref="board"]');
    const solutionEl = mountEl.querySelector('[data-ref="solution"]');
    const panel = mountEl.querySelector('[data-ref="panel"]');
    const btn = (name) => panel.querySelector(`[data-ref="${name}"]`);

    wireSudokuDemo({
        boardEl,
        solutionEl,
        btns: {
            solve: btn('solveBtn'),
            check: btn('checkBtn'),
            uniq: btn('uniqBtn'),
            clear: btn('clearBtn'),
            sample: btn('sampleBtn'),
            paste: btn('pasteBtn'),
        }
    });
}
