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
        // フラクション/二項係数は常にディスプレイ版で視認性UP
        macros: {
            "\\frac": "\\dfrac{#1}{#2}",
            "\\tfrac": "\\dfrac{#1}{#2}",
            "\\sfrac": "\\dfrac{#1}{#2}",
            "\\binom": "\\dbinom{#1}{#2}",
            "\\tbinom": "\\dbinom{#1}{#2}"
        },
        throwOnError: false,
        strict: "warn"
    };

    renderMathInElement(document.body, OPTIONS);

    // ---- 2) KaTeX 出力の色継承（テーマ対応） ----
    const style = document.createElement("style");
    style.textContent = `
    .katex, .katex .mord, .katex .mrel, .katex .mbin, .katex .mopen,
    .katex .mclose, .katex .mop, .katex .mpunct, .katex .minner, .katex .text {
      color: inherit !important;
    }
  `;
    document.head.appendChild(style);

    // ---- 3) 動的追加ノードの自動レンダ（任意） ----
    const mo = new MutationObserver((records) => {
        for (const rec of records) {
            for (const node of rec.addedNodes) {
                if (!(node instanceof Element)) continue;
                if (node.closest && node.closest(".katex, .katex-display")) continue;
                const text = node.textContent || "";
                if (text.includes("$$") || text.includes("\\[") || text.includes("$") || text.includes("\\(")) {
                    renderMathInElement(node, OPTIONS);
                }
            }
        }
    });
    mo.observe(document.body, { childList: true, subtree: true });
});
