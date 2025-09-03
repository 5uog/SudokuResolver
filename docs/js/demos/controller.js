// ========= docs/js/demos/controller.js =========
'use strict';

import { initBoard, readGrid, writeGrid, markFixed, setConflicts } from '../demos/dom.js';
import { parse81 } from '../demos/model.js';
import { findConflicts } from '../demos/validator.js';
import { solveWithUniqueness } from '../demos/solver.js';
import { attachCellBehaviors } from '../demos/cell.js';

/**
 * 盤面生成とボタン配線を行う（UIロジックの中枢）
 * @param {{boardEl:HTMLElement, solutionEl:HTMLElement, btns:Record<string,HTMLButtonElement>}} opts
 */
export function wireSudokuDemo({ boardEl, solutionEl, btns }) {
    if (!boardEl || !solutionEl) return;

    // 盤面を初期化（initBoard は 81 input を返す想定）
    const inputs = initBoard(boardEl);
    markFixed(inputs); // 固定セルに .sr-fixed / readonly 等を付与する実装を推奨

    // utils
    const idxToRC = (i) => `r${Math.floor(i / 9) + 1}c${(i % 9) + 1}`;
    const debounce = (fn, ms = 60) => { let t = 0; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; };

    const refreshConflicts = () => {
        const grid = readGrid(inputs);
        const conflicts = findConflicts(grid);
        setConflicts(inputs, conflicts);
        return conflicts;
    };
    const refreshDebounced = debounce(refreshConflicts, 60);

    // === セル入力まわり（cell.js） ===
    attachCellBehaviors(inputs, {
        onChange: (_i, _v) => {
            // 入力のたびに軽く検出（デバウンス）
            refreshDebounced();
        },
        isBlocked: (i) => {
            // 固定セル定義：readonly or class など、あなたの dom.js/markFixed に合わせる
            const el = inputs[i];
            return !!(el?.readOnly || el?.disabled || el?.classList.contains('sr-fixed'));
        }
    });

    // === ボタン配線 ===
    btns.check?.addEventListener('click', () => {
        const conflicts = refreshConflicts();
        solutionEl.textContent = conflicts.size === 0
            ? '重複なし。'
            : `重複セル: ${[...conflicts].map(idxToRC).join(', ')}`;
    });

    btns.solve?.addEventListener('click', () => {
        const grid = readGrid(inputs);
        const conflicts = findConflicts(grid);
        setConflicts(inputs, conflicts);
        if (conflicts.size) { solutionEl.textContent = '重複があります。まずは修正してください。'; return; }

        const { status, solution, solutionsCount, nodes } = solveWithUniqueness(grid, 2);
        if (status === 'unsat') { solutionEl.textContent = `解は存在しません（探索ノード: ${nodes}）。`; return; }
        const ok = !!solution && solution.length === 81 && findConflicts(solution).size === 0;
        if (!ok) { solutionEl.textContent = '内部整合性エラー（解が制約に違反しています）。'; return; }

        writeGrid(inputs, solution);
        markFixed(inputs);
        setConflicts(inputs, new Set());

        if (status === 'ambiguous' || (typeof solutionsCount === 'number' && solutionsCount > 1)) {
            solutionEl.textContent = `複数解が存在します（少なくとも ${solutionsCount ?? 2} 解）。探索ノード: ${nodes}`;
        } else {
            solutionEl.textContent = `一意に解けました（探索ノード: ${nodes}）。`;
        }
    });

    btns.uniq?.addEventListener('click', () => {
        const grid = readGrid(inputs);
        const conflicts = findConflicts(grid);
        setConflicts(inputs, conflicts);
        if (conflicts.size) { solutionEl.textContent = '重複があります。まずは修正してください。'; return; }

        const { status, solutionsCount, nodes } = solveWithUniqueness(grid, 2);
        if (status === 'unsat') {
            solutionEl.textContent = `解なし（探索ノード: ${nodes}）。`;
        } else if (status === 'ambiguous' || (typeof solutionsCount === 'number' && solutionsCount > 1)) {
            solutionEl.textContent = `複数解あり（少なくとも ${solutionsCount ?? 2} 解）。探索ノード: ${nodes}`;
        } else {
            solutionEl.textContent = `一意です（探索ノード: ${nodes}）。`;
        }
    });

    btns.clear?.addEventListener('click', () => {
        inputs.forEach(i => { i.value = ''; i.classList.remove('sr-fixed', 'sr-bad'); i.readOnly = false; i.disabled = false; });
        solutionEl.textContent = '';
        setConflicts(inputs, new Set());
        inputs[0]?.focus();
    });

    btns.sample?.addEventListener('click', () => {
        const SAMPLE =
            '53..7....' +
            '6..195...' +
            '.98....6.' +
            '8...6...3' +
            '4..8.3..1' +
            '7...2...6' +
            '.6....28.' +
            '...419..5' +
            '....8..79';
        writeGrid(inputs, parse81(SAMPLE));
        markFixed(inputs);
        const c = refreshConflicts();
        solutionEl.textContent = c.size ? '例題に不整合があります（想定外）。' : '例題を投入しました。';
        inputs[0]?.focus();
    });

    btns.paste?.addEventListener('click', async () => {
        try {
            const txt = (await navigator.clipboard.readText() || '').trim();
            const norm = txt.replace(/0/g, '.');
            if (/^[.1-9]{81}$/.test(norm)) {
                writeGrid(inputs, parse81(norm));
                markFixed(inputs);
                const c = refreshConflicts();
                solutionEl.textContent = c.size ? '貼り付けましたが重複があります。' : '貼り付け完了。';
                inputs[0]?.focus();
            } else {
                solutionEl.textContent = '81文字（1-9 と .／0）ではありません。';
            }
        } catch {
            solutionEl.textContent = 'クリップボードにアクセスできませんでした。';
        }
    });

    // 初期チェック
    refreshConflicts();
}
