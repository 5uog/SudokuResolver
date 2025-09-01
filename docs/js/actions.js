// docs/js/actions.js
document.addEventListener("DOMContentLoaded", () => {
    const downloadBtn = document.getElementById("download-exe");
    if (!downloadBtn) return;

    const ua = navigator.userAgent.toLowerCase();
    const isWindows = ua.includes("windows");

    // Windows 以外では exe ダウンロードボタンを隠す
    if (!isWindows) {
        downloadBtn.style.display = "none";
    }
});
