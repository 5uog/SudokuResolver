// 盤面を生成して input[] を返す
export function initBoard(boardEl) {
    const inputs = [];
    for (let r = 0; r < 9; r++) {
        for (let c = 0; c < 9; c++) {
            const cell = document.createElement('div');
            cell.className = 'sr-cell';
            cell.setAttribute('role', 'gridcell');
            cell.setAttribute('aria-rowindex', String(r + 1));
            cell.setAttribute('aria-colindex', String(c + 1));

            const inp = document.createElement('input');
            inp.type = 'text';
            inp.inputMode = 'numeric';
            inp.pattern = '[1-9]';
            inp.maxLength = 1;
            inp.autocomplete = 'off';
            inp.setAttribute('aria-label', `${r + 1}行${c + 1}列`);

            // 入力正規化
            inp.addEventListener('input', (e) => {
                let v = e.target.value
                    .replace(/[０-９]/g, d => String.fromCharCode(d.charCodeAt(0) - 0xFEE0))
                    .replace(/0/g, '');
                if (!v) { e.target.value = ''; return; }
                if (!/^[1-9]$/.test(v)) e.target.value = '';
                else e.target.value = v;
            });

            // キー移動
            inp.addEventListener('keydown', (e) => {
                const idx = r * 9 + c;
                const move = (nr, nc) => inputs[nr * 9 + nc]?.focus();
                if (e.key === 'ArrowLeft' && c > 0) { move(r, c - 1); e.preventDefault(); }
                if (e.key === 'ArrowRight' && c < 8) { move(r, c + 1); e.preventDefault(); }
                if (e.key === 'ArrowUp' && r > 0) { move(r - 1, c); e.preventDefault(); }
                if (e.key === 'ArrowDown' && r < 8) { move(r + 1, c); e.preventDefault(); }
                if (e.key === 'Backspace' && !inp.value && idx > 0) {
                    const prev = inputs[idx - 1]; prev.focus(); prev.select();
                }
            });

            cell.appendChild(inp);
            boardEl.appendChild(cell);
            inputs.push(inp);
        }
    }
    return inputs;
}

export function readGrid(inputs) {
    const g = new Array(81);
    for (let i = 0; i < 81; i++) {
        const v = inputs[i].value.trim();
        g[i] = v ? Number(v) : 0;
    }
    return g;
}

export function writeGrid(inputs, grid) {
    for (let i = 0; i < 81; i++) {
        inputs[i].value = grid[i] === 0 ? '' : String(grid[i]);
    }
}

export function markFixed(inputs) {
    // 現在値のあるセルを「固定風」に
    for (const inp of inputs) {
        inp.classList.toggle('sr-fixed', !!inp.value);
    }
}

export function setConflicts(inputs, conflictSet) {
    for (let i = 0; i < 81; i++) {
        if (conflictSet.has(i)) inputs[i].classList.add('sr-bad');
        else inputs[i].classList.remove('sr-bad');
    }
}
