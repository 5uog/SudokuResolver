// docs/js/math.js
document.addEventListener("DOMContentLoaded", () => {
    if (typeof renderMathInElement !== "function") return;

    // 1) 一度だけレンダ。色は CSS 継承で反映させる（再レンダ不要）
    renderMathInElement(document.body, {
        delimiters: [
            { left: "$$", right: "$$", display: true },
            { left: "\\[", right: "\\]", display: true },
            { left: "$", right: "$", display: false },
            { left: "\\(", right: "\\)", display: false }
        ],
        macros: {
            "\\frac": "\\dfrac{#1}{#2}"
            // 必要なら \tfrac や \sfrac を潰す：
            // "\\tfrac": "\\dfrac{#1}{#2}",
            // "\\sfrac": "\\dfrac{#1}{#2}"
        },
        throwOnError: false
    });

    // 2) KaTeX 出力がテーマの本文色をそのまま使うように調整（安全な上書き）
    //    ※ katex.css より後で読み込まれる想定（style要素を動的追加）
    const style = document.createElement('style');
    style.textContent = `
        .katex, .katex .mord, .katex .mrel, .katex .mbin, .katex .mopen, .katex .mclose, 
        .katex .mop, .katex .mpunct, .katex .minner, .katex .text {
            color: inherit !important;
        }
    `;
    document.head.appendChild(style);
});
