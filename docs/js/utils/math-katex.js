/* ======================================================
                docs/js/utils/math-katex.js
              KaTeX auto-render + safe live observe
   ====================================================== */

/**
 * 本モジュールは KaTeX の auto-render (renderMathInElement) を用いて
 * 1) ページ全体の初回レンダ
 * 2) 追加ノードの自動レンダ（MutationObserver + rAF バッチ）
 * を提供します。SSR/部分適用/再初期化に配慮しています。
 */

let _observer = null;
let _styleTag = null;
let _initialized = false;
let _options = null;

/** rAF バッチング（events.js と同趣旨・局所実装） */
const _raf = (typeof requestAnimationFrame === 'function')
    ? requestAnimationFrame
    : (cb) => setTimeout(() => cb(performance?.now?.() ?? Date.now()), 16);
let _sched = false;
const _queue = new Set();
function _rafQueue(fn) { _queue.add(fn); _schedule(); }
function _schedule() {
    if (_sched) return;
    _sched = true;
    _raf(() => {
        _sched = false;
        const tasks = Array.from(_queue);
        _queue.clear();
        for (let i = 0; i < tasks.length; i++) {
            try { tasks[i](); } catch { /* keep going */ }
        }
    });
}

/** SSR セーフな存在チェック */
const _hasDOM = typeof window !== 'undefined' && typeof document !== 'undefined';

/** 既存 KaTeX 島（.katex / .katex-display）内は対象外 */
const _KATEX_ISLAND_SEL = '.katex, .katex-display';

/** デフォルトの KaTeX auto-render オプション */
const DEFAULT_OPTIONS = {
    delimiters: [
        { left: "$$", right: "$$", display: true },
        { left: "\\[", right: "\\]", display: true },
        { left: "$", right: "$", display: false },
        { left: "\\(", right: "\\)", display: false }
    ],
    // フラクション/二項係数は常にディスプレイ版で視認性UP
    macros: {
        "\\frac": "\\dfrac{#1}{#2}",
        "\\tfrac": "\\dfrac{#1}{#2}",
        "\\sfrac": "\\dfrac{#1}{#2}",
        "\\binom": "\\dbinom{#1}{#2}",
        "\\tbinom": "\\dbinom{#1}{#2}",
    },
    throwOnError: false,
    strict: "warn"
};

/**
 * 文字列に「数式らしさ」があるか簡易判定
 * @param {string} str
 * @returns {boolean}
 */
function _hasMathyText(str) {
    return (
        str.includes("$$") ||
        str.includes("\\[") ||
        str.includes("\\(") ||
        /\$[^$\n]+\$/.test(str) // "$...$" は最後に
    );
}

/**
 * オプションの浅マージ（macros は深め）
 * @template T
 * @param {T} base
 * @param {Partial<T>} patch
 * @returns {T}
 */
function _mergeOptions(base, patch) {
    if (!patch) return { ...base };
    const out = { ...base, ...patch };
    out.macros = { ...(base.macros || {}), ...(patch.macros || {}) };
    if (Array.isArray(patch.delimiters)) out.delimiters = patch.delimiters.slice();
    return out;
}

/**
 * KaTeX auto-render の存在判定
 * @returns {boolean}
 */
function _hasAutoRender() {
    return !!(_hasDOM && typeof window.renderMathInElement === 'function');
}

/**
 * スタイルタグ（テーマ色継承）を付与
 */
function _ensureStyle() {
    if (!_hasDOM) return;
    if (_styleTag && document.head.contains(_styleTag)) return;
    const el = document.querySelector('style[data-math-katex-style="1"]');
    if (el) { _styleTag = /** @type {HTMLStyleElement} */(el); return; }
    _styleTag = document.createElement("style");
    _styleTag.setAttribute("data-math-katex-style", "1");
    _styleTag.textContent = `
.katex, .katex .mord, .katex .mrel, .katex .mbin, .katex .mopen,
.katex .mclose, .katex .mop, .katex .mpunct, .katex .minner, .katex .text {
  color: inherit !important;
}
`;
    document.head.appendChild(_styleTag);
}

/**
 * 要素ツリーのうち、既存 KaTeX 島を除いた候補を列挙
 * @param {Element} root
 * @returns {Element[]}
 */
function _collectCandidates(root) {
    const out = [];
    if (!root.matches(_KATEX_ISLAND_SEL)) out.push(root);
    root.querySelectorAll(`*:not(${_KATEX_ISLAND_SEL})`).forEach(el => out.push(el));
    return out;
}

/**
 * 与えられた要素に対して KaTeX レンダ（auto-render）を適用
 * @param {Element|Document|DocumentFragment} scope
 * @param {ReturnType<typeof _mergeOptions>} options
 */
function _renderIn(scope, options) {
    if (!_hasAutoRender()) return;
    try {
        // Document/Fragment の場合はそのまま、Element は候補抽出
        if (scope instanceof Element) {
            const nodes = _collectCandidates(scope);
            for (let i = 0; i < nodes.length; i++) {
                const el = nodes[i];
                const text = el.textContent || "";
                if (!text || !_hasMathyText(text)) continue;
                try { window.renderMathInElement(el, options); } catch { /* keep going */ }
            }
        } else {
            // 初回など：body 全体などに一括適用
            window.renderMathInElement(scope, options);
        }
    } catch { /* keep going */ }
}

/**
 * MutationObserver コールバックを rAF バッチで処理
 * @param {MutationRecord[]} records
 */
function _onMutations(records) {
    const toRender = new Set();
    for (let r = 0; r < records.length; r++) {
        const rec = records[r];
        const list = rec.addedNodes || [];
        for (let i = 0; i < list.length; i++) {
            const node = list[i];
            if (!(node instanceof Element)) continue;
            // 既に KaTeX 島内ならスキップ
            if (node.closest && node.closest(_KATEX_ISLAND_SEL)) continue;
            toRender.add(node);
        }
    }
    if (toRender.size === 0) return;
    _rafQueue(() => {
        // まとめて安全に走らせる
        const opts = _options || DEFAULT_OPTIONS;
        for (const el of toRender) {
            _renderIn(el, opts);
        }
    });
}

/**
 * 監視開始（既存があれば付け直し）
 */
function _startObserver() {
    if (!_hasDOM) return;
    if (_observer) { try { _observer.disconnect(); } catch { } }
    _observer = new MutationObserver(_onMutations);
    try {
        _observer.observe(document.body, { childList: true, subtree: true });
    } catch { /* body 未用意など */ }
}

/**
 * KaTeX の初期化（全体レンダ + 動的監視）
 * @param {Partial<import("katex/contrib/auto-render").RenderMathInElementOptions>} [userOptions]
 */
export function initMathKatex(userOptions = {}) {
    if (!_hasDOM) return;
    if (!_hasAutoRender()) {
        console.warn("[math-katex] renderMathInElement が見つかりません。auto-render の読み込み順を確認してください。");
        return;
    }

    // 二重初期化：オプション更新を想定して安全リセット
    if (_initialized) disconnectMathKatex();

    _options = _mergeOptions(DEFAULT_OPTIONS, userOptions);

    // 1) 初回一括レンダ
    try { _renderIn(document.body, _options); } catch { /* keep going */ }

    // 2) テーマ色継承スタイル
    _ensureStyle();

    // 3) 監視開始（追加ノードを自動レンダ）
    _startObserver();

    _initialized = true;
    // console.info("[math-katex] initialized");
}

/**
 * 監視とスタイルを解除（ページ遷移や再初期化用）
 */
export function disconnectMathKatex() {
    if (_observer) {
        try { _observer.disconnect(); } catch { }
        _observer = null;
    }
    if (_styleTag && _styleTag.parentNode) {
        try { _styleTag.parentNode.removeChild(_styleTag); } catch { }
    }
    _styleTag = null;
    _initialized = false;
}

/**
 * 任意の要素/範囲に対して明示的に再レンダする補助API
 * （外部ライブラリが遅延で挿入した HTML などに適用したい場合）
 * @param {Element|Document|DocumentFragment} scope
 * @param {Partial<import("katex/contrib/auto-render").RenderMathInElementOptions>} [opts]
 */
export function renderMathIn(scope, opts) {
    if (!_hasDOM || !_hasAutoRender()) return;
    const o = _mergeOptions(_options || DEFAULT_OPTIONS, opts || {});
    _renderIn(scope, o);
}

/**
 * 現在のオプションに追記・更新（再監視・再適用は行わない）
 * 必要に応じて initMathKatex() を呼び直してください。
 * @param {Partial<import("katex/contrib/auto-render").RenderMathInElementOptions>} patch
 */
export function updateMathOptions(patch) {
    _options = _mergeOptions(_options || DEFAULT_OPTIONS, patch || {});
}
