/* docs/js/actions.js
 * SudokuResolver — Front-side protections & print watermark (hardened)
 * 注意: これは「抑止策」です。
 */
document.addEventListener("DOMContentLoaded", () => {
    // =========================
    // 設定（必要に応じて変更）
    // =========================
    const CONFIG = {
        // 1) EXE ボタン: Windows 以外では非表示
        SHOW_EXEC_BUTTON_ONLY_ON_WINDOWS: true,

        // 2) コピー抑止の有効化
        ENABLE_COPY_GUARD: true,

        // 3) ショートカット/DevTools 抑止
        ENABLE_SHORTCUT_GUARD: true,

        // 4) 印刷用ウォーターマーク
        WATERMARK: {
            MODE: "tile", // "tile"（推奨） | "center"
            // 固定文言にしたい場合は null を置き換え: e.g. "コピー禁止 – SudokuResolver"
            TEXT: null,
            // タイル敷き用の濃さ（0.08〜0.20 推奨）
            TILE_OPACITY: 0.12,
            // タイルのサイズ（px）
            TILE_SIZE: 280,
            // タイル内テキストのフォントサイズ（px）
            TILE_FONT: 28,
            // 中央1枚方式のフォントサイズ（pt最小〜vw〜pt最大）
            CENTER_FONT_CLAMP: [36, 10, 90], // [minPt, vw, maxPt]
            // 回転角度（度）
            ROTATE_DEG: -30
        },

        // 5) 印刷時にリンクのURL併記を消したい場合は true
        PRINT_HIDE_LINK_URLS: true
    };

    // =========================
    // 0) ユーティリティ
    // =========================
    const isWindows = () => navigator.userAgent.toLowerCase().includes("windows");
    const $ = (sel, root = document) => root.querySelector(sel);
    const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

    // XML/HTML エスケープ
    const xmlEscape = (s) =>
        String(s).replace(/[&<>"']/g, (m) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&apos;" }[m]));

    // 選択/コピーを許可する例外スコープ
    const allowSel = (el) =>
        !!el?.closest('input, textarea, [contenteditable="true"], .allow-select');

    // =========================
    // 1) .exe ダウンロードボタンの制御
    // =========================
    (() => {
        if (!CONFIG.SHOW_EXEC_BUTTON_ONLY_ON_WINDOWS) return;
        const btn = $("#download-exe");
        if (btn && !isWindows()) {
            // 完全に消す or disable にするならここを調整
            btn.style.display = "none";
            btn.setAttribute("aria-hidden", "true");
            btn.setAttribute("tabindex", "-1");
        }
    })();

    // =========================
    // 2) コピー / 右クリック / 選択 / ドラッグの抑止
    // =========================
    if (CONFIG.ENABLE_COPY_GUARD) {
        // 右クリック
        document.addEventListener(
            "contextmenu",
            (e) => {
                if (!allowSel(e.target)) e.preventDefault();
            },
            { capture: true }
        );

        // テキスト選択開始
        document.addEventListener(
            "selectstart",
            (e) => {
                if (!allowSel(e.target)) e.preventDefault();
            },
            { capture: true }
        );

        // クリップボード（コピー/カット）
        const blockClipboard = (e) => {
            if (!allowSel(e.target)) {
                e.preventDefault();
                try {
                    e.clipboardData?.setData("text/plain", "");
                } catch (_) { }
            }
        };
        document.addEventListener("copy", blockClipboard, { capture: true });
        document.addEventListener("cut", blockClipboard, { capture: true });

        // ドラッグ開始（画像/テキスト）
        document.addEventListener(
            "dragstart",
            (e) => {
                if (!allowSel(e.target)) e.preventDefault();
            },
            { capture: true }
        );

        // 選択抑止の効きを安定化させる軽量スタイル（入力系は許可）
        const style = document.createElement("style");
        style.setAttribute("data-injected", "copy-guard");
        style.textContent = `
      html, body { -webkit-touch-callout: none; -webkit-user-select: none; user-select: none; }
      img, svg { -webkit-user-drag: none; user-drag: none; }
      input, textarea, [contenteditable="true"], .allow-select {
        -webkit-user-select: text !important; user-select: text !important;
      }
    `;
        document.head.appendChild(style);
    }

    // =========================
    // 3) ショートカット/DevTools 抑止（抑止できないケースあり）
    // =========================
    if (CONFIG.ENABLE_SHORTCUT_GUARD) {
        document.addEventListener(
            "keydown",
            (e) => {
                const k = (e.key || "").toLowerCase();
                const mod = e.ctrlKey || e.metaKey;

                // 印刷/保存/コピー/切り取り/全選択/ソース
                if (mod && ["c", "x", "s", "p", "a", "u"].includes(k)) {
                    if (!allowSel(e.target)) {
                        e.preventDefault();
                        e.stopPropagation();
                    }
                }
                // DevTools 系（完全には抑止できません）
                if ((mod && e.shiftKey && ["i", "j", "c"].includes(k)) || k === "f12") {
                    e.preventDefault();
                    e.stopPropagation();
                }
            },
            { capture: true }
        );
    }

    // =========================
    // 4) 印刷用ウォーターマーク
    // =========================
    const wmText =
        CONFIG.WATERMARK.TEXT ??
        `コピー禁止 – ${location.hostname || "SudokuResolver"}`;
    // 一旦 data-wm にも入れておく（centerモードやバックアップとして利用）
    document.body.setAttribute("data-wm", wmText);

    // タイル式ウォーターマーク（背景画像）を設定
    const installTileWatermark = () => {
        const TILE = CONFIG.WATERMARK.TILE_SIZE;
        const FONT = CONFIG.WATERMARK.TILE_FONT;
        const OPACITY = CONFIG.WATERMARK.TILE_OPACITY;
        const ROT = CONFIG.WATERMARK.ROTATE_DEG;

        const svg =
            `<svg xmlns="http://www.w3.org/2000/svg" width="${TILE}" height="${TILE}" viewBox="0 0 ${TILE} ${TILE}">
         <g transform="translate(${TILE / 2} ${TILE / 2}) rotate(${ROT})">
           <text x="0" y="0"
                 text-anchor="middle" dominant-baseline="middle"
                 font-family="Inter, system-ui, -apple-system, Segoe UI, Roboto, sans-serif"
                 font-size="${FONT}" fill="#000" fill-opacity="${OPACITY}">
             ${xmlEscape(wmText)}
           </text>
         </g>
       </svg>`;

        const url = `url("data:image/svg+xml;utf8,${encodeURIComponent(svg)}")`;
        // CSS 変数で print.css と連携（print.css 側の @media print で使用する想定）
        document.documentElement.style.setProperty("--wm-url", url);
        // 保険として、ここでも背景を直接指定（ブラウザやCSSの読み込み順対策）
        document.documentElement.style.backgroundImage = url;
        document.documentElement.style.backgroundRepeat = "repeat";
        document.documentElement.style.backgroundSize = `${TILE}px ${TILE}px`;
    };

    // 中央1枚ウォーターマーク（はみ出し対策で折返し+可変サイズ）
    const installCenterWatermark = () => {
        // 実描画は CSS の body::before（print.css）に任せる。
        // ここでは data-wm を確実にセットしておくのみ。
        document.body.setAttribute("data-wm", wmText);
    };

    // モードに応じてインストール
    const setupWatermark = () => {
        if (CONFIG.WATERMARK.MODE === "tile") {
            installTileWatermark();
            // center版は念のため無効化（print.css 側でも `content: none` で無効化推奨）
            // ここでは何もしない
        } else {
            installCenterWatermark();
        }
    };
    setupWatermark();

    // 印刷開始前の処理
    const beforePrint = () => {
        // ウォーターマーク文言の再設定（動的に変更された場合に備える）
        if (CONFIG.WATERMARK.MODE === "tile") {
            installTileWatermark();
        } else {
            installCenterWatermark();
        }

        // リンクURLの併記を抑止するフラグ
        if (CONFIG.PRINT_HIDE_LINK_URLS) {
            document.body.setAttribute("data-print-urls", "off");
        } else {
            document.body.removeAttribute("data-print-urls");
        }
    };

    // 印刷後の後片付け（必要なら）
    const afterPrint = () => {
        // ここでは特に戻すものはないが、必要なら属性を元に戻す
        // document.body.removeAttribute("data-print-urls");
    };

    // beforeprint/afterprint をイベントで拾う（Chrome/Edge/Firefox）
    window.addEventListener("beforeprint", beforePrint);
    window.addEventListener("afterprint", afterPrint);

    // Safari 対応（matchMedia で印刷状態を監視）
    try {
        const mql = window.matchMedia && window.matchMedia("print");
        if (mql && typeof mql.addListener === "function") {
            mql.addListener((e) => (e.matches ? beforePrint() : afterPrint()));
        } else if (mql && typeof mql.addEventListener === "function") {
            mql.addEventListener("change", (e) => (e.matches ? beforePrint() : afterPrint()));
        }
    } catch (_) { }

    // =========================
    // 5) 微調整: iOS 長押しメニュー抑止（限定的）
    // =========================
    // 100%ではないが、少し効く場合がある
    document.addEventListener(
        "touchstart",
        (e) => {
            if (!allowSel(e.target)) {
                // 長押し選択のトリガを弱める
                if (e.touches.length > 1) e.preventDefault();
            }
        },
        { passive: false, capture: true }
    );
});
