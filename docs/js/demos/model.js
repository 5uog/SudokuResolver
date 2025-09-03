// ========= docs/js/demos/models.js =========
'use strict';

// 9x9 基本定数
export const N = 9;
export const SIZE = 81;

// 行列 → 線形 index
export const idx = (r, c) => r * N + c;

// 長さ81の空盤（0=空）
export function empty81() {
    return Array(SIZE).fill(0);
}

// 81文字 "53..7...." → 数値配列（0=空、1..9）
export function parse81(s) {
    const g = new Array(SIZE);
    for (let i = 0; i < SIZE; i++) {
        const ch = s[i] ?? '.';
        g[i] = (ch === '0' || ch === '.') ? 0 : (/[1-9]/.test(ch) ? Number(ch) : 0);
    }
    return g;
}

// 数値配列 → 81文字（0 は '.'）
export function to81String(grid) {
    return grid.map(v => (v === 0 ? '.' : String(v))).join('');
}

// 複製
export function clone(grid) {
    return grid.slice();
}

// 一文字を数値セルへ正規化（'0'・'.'・無効 → 0, '1'..'9' → 1..9）
export function normalizeChar(ch) {
    if (!ch) return 0;
    const c = String(ch).trim()[0];
    if (c === '0' || c === '.') return 0;
    return /[1-9]/.test(c) ? Number(c) : 0;
}

// 文字配列（'.' or '1'..'9'）→ 数値配列（0..9）
export function fromDotsArray(arr81 /* string[] */) {
    const out = new Array(SIZE);
    for (let i = 0; i < SIZE; i++) {
        const ch = arr81[i] ?? '.';
        out[i] = (ch === '.' ? 0 : Number(ch));
    }
    return out;
}

// 数値配列（0..9）→ 文字配列（'.' or '1'..'9'）
export function toDotsArray(grid /* number[] */) {
    const out = new Array(SIZE);
    for (let i = 0; i < SIZE; i++) {
        const v = grid[i] | 0;
        out[i] = (v === 0 ? '.' : String(v));
    }
    return out;
}

// 完成か（0 が存在しない）
export function isComplete(grid) {
    for (let i = 0; i < SIZE; i++) if (grid[i] === 0) return false;
    return true;
}
