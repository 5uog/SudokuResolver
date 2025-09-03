import { clone } from './model.js';
import { findConflicts, candidates, isAllowed } from './validator.js';

/** 盤面が全埋め & 衝突ゼロか */
function isCompleteValid(g) {
    if (!g.every(v => v !== 0)) return false;
    return findConflicts(g).size === 0;
}

/**
 * 複数解チェック付きで解く（MRV + 裸シングル伝播）
 * @param {number[]} grid  長さ81（0=空）
 * @param {number} limit   見つける解の上限（2 なら一意/複数の判定に十分）
 * @returns {{status:'unsat'|'solved'|'ambiguous', solution?:number[], solutionsCount:number, nodes:number}}
 */
export function solveWithUniqueness(grid, limit = 2) {
    // 初期矛盾は即 UNSAT
    if (findConflicts(grid).size) {
        return { status: 'unsat', solutionsCount: 0, nodes: 0 };
    }

    let solutionsCount = 0;
    let firstSolution = null;
    let nodes = 0;

    const g = clone(grid);

    // ===== 前向き推論（裸シングル）を安定点まで =====
    function propagateToFixpoint() {
        while (true) {
            let changed = false;
            const cands = candidates(g);
            for (let i = 0; i < 81; i++) {
                if (g[i] !== 0) continue;
                const s = cands[i];
                if (s.size === 0) return 'contradiction';
                if (s.size === 1) {
                    g[i] = [...s][0];
                    changed = true;
                }
            }
            if (!changed) break;
        }
        return 'stable';
    }

    // 入口でも一度伝播
    {
        const r = propagateToFixpoint();
        if (r === 'contradiction') return { status: 'unsat', solutionsCount: 0, nodes };
        if (isCompleteValid(g)) {
            return { status: 'solved', solution: g.slice(), solutionsCount: 1, nodes };
        }
    }

    // ===== MRV 選択 =====
    function selectMRV() {
        const cands = candidates(g);
        let bestIdx = -1, bestSize = 10, bestSet = null;
        for (let i = 0; i < 81; i++) {
            if (g[i] !== 0) continue;
            const s = cands[i];
            const size = s.size;
            if (size < bestSize) {
                bestIdx = i; bestSize = size; bestSet = s;
                if (size === 2) break; // 充分小さい
            }
        }
        return { i: bestIdx, set: bestSet };
    }

    function dfs() {
        if (solutionsCount >= limit) return;

        // 完成したら整合性チェック
        if (g.every(v => v !== 0)) {
            if (findConflicts(g).size === 0) {
                solutionsCount++;
                if (!firstSolution) firstSolution = g.slice();
            }
            return;
        }

        const { i, set } = selectMRV();
        if (i < 0 || !set || set.size === 0) return;

        for (const v of set) {
            if (!isAllowed(g, i, v)) continue;

            const snap = g.slice();
            g[i] = v; nodes++;

            const r = propagateToFixpoint();
            if (r !== 'contradiction') {
                dfs();
            }

            for (let k = 0; k < 81; k++) g[k] = snap[k];

            if (solutionsCount >= limit) return;
        }
    }

    dfs();

    if (solutionsCount === 0) return { status: 'unsat', solutionsCount: 0, nodes };
    if (solutionsCount >= 2) return { status: 'ambiguous', solution: firstSolution, solutionsCount, nodes };
    return { status: 'solved', solution: firstSolution, solutionsCount, nodes };
}
