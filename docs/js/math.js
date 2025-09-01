// docs/js/math.js
document.addEventListener("DOMContentLoaded", () => {
    if (typeof renderMathInElement !== "function") return;

    // ---- 1) 一度だけレンダ（$$, \[...\], $..., \(...\)）----
    const OPTIONS = {
        delimiters: [
            { left: "$$", right: "$$", display: true },
            { left: "\\[", right: "\\]", display: true },
            { left: "$", right: "$", display: false },
            { left: "\\(", right: "\\)", display: false }
        ],
        // フラクション/二項係数は常にディスプレイ版に（行内の視認性UP）
        macros: {
            "\\frac": "\\dfrac{#1}{#2}",
            "\\tfrac": "\\dfrac{#1}{#2}",
            "\\sfrac": "\\dfrac{#1}{#2}",
            "\\binom": "\\dbinom{#1}{#2}",
            "\\tbinom": "\\dbinom{#1}{#2}",
            "\\bigvee":   "\\mathop{\\vcenter{\\hbox{$\\displaystyle\\Large\\vee$}}}\\displaylimits",
            "\\bigwedge": "\\mathop{\\vcenter{\\hbox{$\\displaystyle\\Large\\wedge$}}}\\displaylimits",
            "\\bigsqcup": "\\mathop{\\vcenter{\\hbox{$\\displaystyle\\Large\\sqcup$}}}\\displaylimits",
            "\\sum":      "\\mathop{\\vcenter{\\hbox{$\\displaystyle\\Large\\Sigma$}}}\\displaylimits"
        },
        throwOnError: false,
        strict: "warn"
    };
    renderMathInElement(document.body, OPTIONS);

    // ---- 2) KaTeX 出力のモバイル視認性をCSSで底上げ（自動注入）----
    //  - color: inherit → テーマ色をそのまま継承
    //  - big operator（∑, ∏, ⋀ 等）は “行内のときだけ” わずかに拡大
    //  - ディスプレイ数式は原寸維持（上書きでリセット）
    const style = document.createElement("style");
    style.textContent = `
    .katex, .katex .mord, .katex .mrel, .katex .mbin, .katex .mopen,
    .katex .mclose, .katex .mop, .katex .mpunct, .katex .minner, .katex .text {
      color: inherit !important;
    }

    /* 行内の大演算子だけをスケール（ディスプレイは後でリセット） */
    :root { --math-inline-bigop-scale: 1; }
    @media (max-width: 640px) {
      :root { --math-inline-bigop-scale: 1.08; } /* 好みで 1.05〜1.12 */
    }
    /* 行内（<span class="katex">…）に当たるデフォルト */
    .katex .mop, .katex .op-symbol {
      font-size: calc(1em * var(--math-inline-bigop-scale));
      line-height: 1.1;
    }
    /* ディスプレイ数式（<div class="katex-display"><span class="katex">…）はリセット */
    .katex-display .mop, .katex-display .op-symbol {
      font-size: 1em;
      line-height: inherit;
    }
  `;
    document.head.appendChild(style);

    // ---- 3) 動的に追加されたノード内の $$/$ を自動レンダ（任意強化）----
    // 例：章の遅延読込、タブ切替で差し込まれたHTMLにも自動適用
    const mo = new MutationObserver((records) => {
        for (const rec of records) {
            for (const node of rec.addedNodes) {
                if (!(node instanceof Element)) continue;
                // すでにKaTeXの中ならスキップ
                if (node.closest && node.closest(".katex, .katex-display")) continue;

                // ざっくりデリミタ検知（無駄レンダ回避）
                const text = node.textContent || "";
                if (text.includes("$$") || text.includes("\\[") || text.includes("$") || text.includes("\\(")) {
                    renderMathInElement(node, OPTIONS);
                }
            }
        }
    });
    mo.observe(document.body, { childList: true, subtree: true });
});
