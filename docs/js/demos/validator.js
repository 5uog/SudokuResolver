// 事前計算：各セルの peers（同じ行・列・ボックス）
const rows = [...Array(9)].map((_, r) => [...Array(9)].map((_, c) => r * 9 + c));
const cols = [...Array(9)].map((_, c) => [...Array(9)].map((_, r) => r * 9 + c));
const boxes = [...Array(9)].map((_, b) => {
  const br = Math.floor(b / 3) * 3, bc = (b % 3) * 3;
  const a = [];
  for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) a.push((br + r) * 9 + (bc + c));
  return a;
});
const UNITS = [...rows, ...cols, ...boxes];

export function findConflicts(grid) {
  const bad = new Set();
  for (const unit of UNITS) {
    const seen = new Map(); // val -> indices[]
    for (const i of unit) {
      const v = grid[i];
      if (!v) continue;
      if (!seen.has(v)) seen.set(v, []);
      seen.get(v).push(i);
    }
    for (const [_, arr] of seen) {
      if (arr.length > 1) arr.forEach(i => bad.add(i));
    }
  }
  return bad;
}

export function isAllowed(grid, i, val) {
  const r = Math.floor(i / 9), c = i % 9, b = Math.floor(r / 3) * 3 + Math.floor(c / 3);
  // row
  for (let cc = 0; cc < 9; cc++) if (cc !== c && grid[r * 9 + cc] === val) return false;
  // col
  for (let rr = 0; rr < 9; rr++) if (rr !== r && grid[rr * 9 + c] === val) return false;
  // box
  const br = Math.floor(r / 3) * 3, bc = Math.floor(c / 3) * 3;
  for (let dr = 0; dr < 3; dr++) for (let dc = 0; dc < 3; dc++) {
    const j = (br + dr) * 9 + (bc + dc);
    if (j !== i && grid[j] === val) return false;
  }
  return true;
}

// 各セルの候補を返す（0セルのみ）
export function candidates(grid) {
  const cands = new Array(81);
  for (let i = 0; i < 81; i++) {
    if (grid[i] !== 0) { cands[i] = null; continue; }
    const set = new Set([1, 2, 3, 4, 5, 6, 7, 8, 9]);
    const r = Math.floor(i / 9), c = i % 9;
    // row/col
    for (let k = 0; k < 9; k++) {
      set.delete(grid[r * 9 + k]);
      set.delete(grid[k * 9 + c]);
    }
    // box
    const br = Math.floor(r / 3) * 3, bc = Math.floor(c / 3) * 3;
    for (let dr = 0; dr < 3; dr++) for (let dc = 0; dc < 3; dc++) {
      set.delete(grid[(br + dr) * 9 + (bc + dc)]);
    }
    set.delete(0);
    cands[i] = set;
  }
  return cands;
}
