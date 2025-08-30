/* KaTeX auto-render 設定（pymdownx.arithmatex: generic=true に対応） */
document.addEventListener("DOMContentLoaded", function () {
    if (typeof renderMathInElement !== "function") return;
    renderMathInElement(document.body, {
        delimiters: [
            { left: "$$", right: "$$", display: true },
            { left: "$", right: "$", display: false },
            { left: "\\[", right: "\\]", display: true },
            { left: "\\(", right: "\\)", display: false }
        ],
        throwOnError: false
    });
});
