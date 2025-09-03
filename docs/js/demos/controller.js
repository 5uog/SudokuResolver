// ========= docs/js/demos/controller.js =========
'use strict';

import { initBoard, readGrid, writeGrid, markFixed, setConflicts } from '../demos/dom.js';
import { parse81 } from '../demos/model.js';
import { findConflicts } from '../demos/validator.js';
import { solveWithUniqueness } from '../demos/solver.js';

/**
 * 盤面生成とボタン配線を行う（UIロジックの中枢）
 * @param {{boardEl:HTMLElement, solutionEl:HTMLElement, btns:Record<string,HTMLButtonElement>}} opts
 */
export function wireSudokuDemo({ boardEl, solutionEl, btns }) {
    if (!boardEl || !solutionEl) return;

    // 盤面を初期化
    const inputs = initBoard(boardEl);
    markFixed(inputs);

    // 小ユーティリティ
    const idxToRC = (i) => `r${Math.floor(i / 9) + 1}c${(i % 9) + 1}`;
    const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
    const debounce = (fn, ms = 60) => { let t = 0; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; };
    const normalize = (v) => {
        if (!v) return '';
        const ch = v.trim()[0];
        if (ch === '.' || ch === '0') return '';
        if (/[1-9]/.test(ch)) return ch;
        return '';
    };

    const refreshConflicts = () => {
        const grid = readGrid(inputs);
        const conflicts = findConflicts(grid);
        setConflicts(inputs, conflicts);
        return conflicts;
    };
    const refreshDebounced = debounce(refreshConflicts, 60);

    const moveFocus = (fromIndex, dRow, dCol) => {
        const r = Math.floor(fromIndex / 9);
        const c = fromIndex % 9;
        const nr = clamp(r + dRow, 0, 8);
        const nc = clamp(c + dCol, 0, 8);
        const ni = nr * 9 + nc;
        inputs[ni]?.focus();
        inputs[ni]?.select?.();
    };

    // 入力ハンドリング
    inputs.forEach((inp, i) => {
        inp.addEventListener('input', () => {
            const n = normalize(inp.value);
            if (inp.value !== n) inp.value = n;
            refreshDebounced();
        });
        inp.addEventListener('keydown', (ev) => {
            const k = ev.key;
            const editing = ['Backspace', 'Delete', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Tab', 'Enter'];
            if (!editing.includes(k) && !/[0-9.]/.test(k)) { ev.preventDefault(); return; }
            if (k === 'Enter' || k === 'Tab') { ev.preventDefault(); moveFocus(i, 0, 1); return; }
            if (k === 'Backspace') { if (!inp.value) { ev.preventDefault(); moveFocus(i, 0, -1); } return; }
            if (k === 'ArrowLeft') { ev.preventDefault(); moveFocus(i, 0, -1); return; }
            if (k === 'ArrowRight') { ev.preventDefault(); moveFocus(i, 0, 1); return; }
            if (k === 'ArrowUp') { ev.preventDefault(); moveFocus(i, -1, 0); return; }
            if (k === 'ArrowDown') { ev.preventDefault(); moveFocus(i, 1, 0); return; }
            if (/[0-9.]/.test(k)) {
                setTimeout(() => {
                    inp.value = normalize(inp.value);
                    moveFocus(i, 0, 1);
                    refreshDebounced();
                }, 0);
            }
        });
    });

    // ボタン配線
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
        inputs.forEach(i => { i.value = ''; i.classList.remove('sr-fixed', 'sr-bad'); });
        solutionEl.textContent = '';
        setConflicts(inputs, new Set());
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
