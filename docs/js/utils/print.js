/* ======================================================
                   docs/js/utils/print.js
              印刷ウォーターマーク/リンクURL制御
   ====================================================== */

let _inited = false;
let _mql = null;
let _listeners = { before: null, after: null, mqlChange: null };

const DEFAULTS = Object.freeze({
    MODE: "tile",                        // "tile" | "center"
    TEXT: null,                          // 既定は "コピー禁止 – <host or SudokuResolver>"
    PRINT_HIDE_LINK_URLS: true,

    // Tile モード
    TILE_OPACITY: 0.12,                  // 0.0 - 1.0
    TILE_SIZE: 280,                      // px
    TILE_FONT: 28,                       // px（DPR補正あり）
    ROTATE_DEG: -30,                     // deg
    PREVIEW_ON_SCREEN: false,            // true で画面にもタイルを出す

    // 文字視認性向上（アウトライン）
    OUTLINE_STROKE: true,                // 周囲に薄い白ストローク
    OUTLINE_WIDTH: 1.6,                  // px
    OUTLINE_OPACITY: 0.18,               // 0.0 - 1.0

    // DPR自動補正（高解像度印刷で微妙に小さく見える問題の緩和）
    AUTO_FONT_BY_DPR: true,
    DPR_FONT_MIN: 0.9,                   // 係数の下限
    DPR_FONT_MAX: 1.6,                   // 係数の上限

    // Center モード（描画は print.css 側）
    CENTER_TWO_COL: false,
    CENTER_COL_GAP_PX: 48
});

const _state = {
    opt: { ...DEFAULTS },
    lastUrl: null
};

// ===== SSR/非ブラウザ安全化 =====
const hasDOM = typeof window !== "undefined" && typeof document !== "undefined";

// ===== 印刷CSSの切替 =====
const PRINT_LINK_ID = "print-css";

function getPrintLink() {
    if (!hasDOM) return null;
    return document.getElementById(PRINT_LINK_ID);
}
function enablePrintCssNow() {
    const link = getPrintLink();
    if (link) link.media = "all";
}
function disablePrintCssNow() {
    const link = getPrintLink();
    if (link) link.media = "print";
}

// ---------- helpers ----------
function clamp(n, lo, hi) {
    return Math.min(hi, Math.max(lo, n));
}

function toBool(v, fallback) {
    return typeof v === "boolean" ? v : !!fallback;
}

function toNum(v, fallback) {
    const n = Number(v);
    return Number.isFinite(n) ? n : fallback;
}

function toMode(v, fallback = "tile") {
    return v === "center" ? "center" : v === "tile" ? "tile" : fallback;
}

const xmlEscape = (s) =>
    String(s ?? "").replace(/[&<>"']/g, (m) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&apos;" }[m]));

const wmAutoText = () => `コピー禁止 – ${hasDOM ? (location.hostname || "SudokuResolver") : "SudokuResolver"}`;

const currentText = () => _state.opt.TEXT ?? wmAutoText();

function setCssVar(name, value) {
    if (!hasDOM) return;
    document.documentElement.style.setProperty(name, value);
}

function clearCssVar(name) {
    if (!hasDOM) return;
    document.documentElement.style.removeProperty(name);
}

// DPRに基づくフォント補正係数
function fontScaleByDPR() {
    if (!hasDOM || !_state.opt.AUTO_FONT_BY_DPR) return 1;
    const dpr = clamp(window.devicePixelRatio || 1, 1, 3);
    // 1.0→1.0, 1.5→1.25, 2.0→1.4, 3.0→1.6（ざっくり線形）
    const k = 1 + (dpr - 1) * 0.4;
    return clamp(k, _state.opt.DPR_FONT_MIN, _state.opt.DPR_FONT_MAX);
}

// ---------- installers ----------
function installTileWatermark() {
    if (!hasDOM) return;

    const {
        TILE_SIZE, TILE_FONT, TILE_OPACITY, ROTATE_DEG,
        OUTLINE_STROKE, OUTLINE_WIDTH, OUTLINE_OPACITY,
        PREVIEW_ON_SCREEN
    } = _state.opt;

    const size = clamp(toNum(TILE_SIZE, DEFAULTS.TILE_SIZE), 48, 2048);
    const baseFont = clamp(toNum(TILE_FONT, DEFAULTS.TILE_FONT), 8, 512);
    const font = Math.round(baseFont * fontScaleByDPR());
    const opacity = clamp(toNum(TILE_OPACITY, DEFAULTS.TILE_OPACITY), 0, 1);
    const rot = toNum(ROTATE_DEG, DEFAULTS.ROTATE_DEG);
    const outline = toBool(OUTLINE_STROKE, DEFAULTS.OUTLINE_STROKE);
    const outlineW = clamp(toNum(OUTLINE_WIDTH, DEFAULTS.OUTLINE_WIDTH), 0, 8);
    const outlineOpacity = clamp(toNum(OUTLINE_OPACITY, DEFAULTS.OUTLINE_OPACITY), 0, 1);

    const wmText = currentText();

    // SVG。画面プレビュー抑止のため、通常は data-url をCSS変数に入れるのみ。
    const textNode = `
      ${outline ? `
        <text x="0" y="0"
              text-anchor="middle" dominant-baseline="middle"
              font-family="Inter, system-ui, -apple-system, Segoe UI, Roboto, sans-serif"
              font-size="${font}" fill="#fff" fill-opacity="${outlineOpacity}"
              stroke="#fff" stroke-opacity="${outlineOpacity}" stroke-width="${outlineW}">
          ${xmlEscape(wmText)}
        </text>` : ""}
      <text x="0" y="0"
            text-anchor="middle" dominant-baseline="middle"
            font-family="Inter, system-ui, -apple-system, Segoe UI, Roboto, sans-serif"
            font-size="${font}" fill="#000" fill-opacity="${opacity}">
        ${xmlEscape(wmText)}
      </text>`;

    const svg =
        `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
           <g transform="translate(${size / 2} ${size / 2}) rotate(${rot})">
             ${textNode}
           </g>
         </svg>`;

    const url = `url("data:image/svg+xml;utf8,${encodeURIComponent(svg)}")`;

    // print.css から参照するCSS変数（画面では使わない前提）
    setCssVar("--sr-wm-url", url);
    setCssVar("--sr-wm-tile-w", `${size}px`);
    setCssVar("--sr-wm-tile-h", `${size}px`);

    _state.lastUrl = url;

    // プレビュー：必要なときだけ画面にも適用（誤適用を防ぐ）
    const root = document.documentElement;
    if (PREVIEW_ON_SCREEN) {
        root.style.backgroundImage = url;
        root.style.backgroundRepeat = "repeat";
        root.style.backgroundSize = `${size}px ${size}px`;
    } else {
        // 画面では消す（print.css の @media print で使う想定）
        root.style.backgroundImage = "none";
        root.style.backgroundRepeat = "";
        root.style.backgroundSize = "";
    }
}

function installCenterWatermark() {
    if (!hasDOM) return;
    // 実描画は print.css（body::before/::after）。こちらは値供給のみ。
    const wmText = currentText();
    document.body.setAttribute("data-wm", wmText);

    setCssVar("--sr-wm-center-two-col", _state.opt.CENTER_TWO_COL ? "1" : "0");
    setCssVar("--sr-wm-center-gap", `${toNum(_state.opt.CENTER_COL_GAP_PX, DEFAULTS.CENTER_COL_GAP_PX)}px`);

    // タイル関連はスクリーンでは無効化
    const root = document.documentElement;
    root.style.backgroundImage = "none";
    root.style.backgroundRepeat = "";
    root.style.backgroundSize = "";
    _state.lastUrl = null;
}

function applyPerMode() {
    if (!hasDOM) return;
    if (_state.opt.MODE === "tile") {
        installTileWatermark();
    } else {
        installCenterWatermark();
    }
}

function applyLinkUrlSuppression() {
    if (!hasDOM) return;
    if (_state.opt.PRINT_HIDE_LINK_URLS) {
        document.body.setAttribute("data-print-urls", "off");
    } else {
        document.body.removeAttribute("data-print-urls");
    }
}

// ---------- print lifecycle handlers ----------
function beforePrint() {
    try {
        enablePrintCssNow();

        applyPerMode();
        applyLinkUrlSuppression();
    } catch { /* swallow */ }
}

function afterPrint() {
    try {
        disablePrintCssNow();

        // 必要なら片付けをここに
        // document.body.removeAttribute("data-print-urls");
    } catch { /* swallow */ }
}

// ---------- public API ----------
export function init(options = {}) {
    if (!hasDOM) return;          // SSRでも安全
    if (_inited) return;

    // マージ前に軽くバリデーション
    const opt = { ...DEFAULTS, ...options };
    opt.MODE = toMode(opt.MODE, DEFAULTS.MODE);
    opt.TEXT = (opt.TEXT ?? "").toString().trim() || null;
    opt.PRINT_HIDE_LINK_URLS = toBool(opt.PRINT_HIDE_LINK_URLS, DEFAULTS.PRINT_HIDE_LINK_URLS);
    opt.TILE_OPACITY = clamp(toNum(opt.TILE_OPACITY, DEFAULTS.TILE_OPACITY), 0, 1);
    opt.TILE_SIZE = clamp(toNum(opt.TILE_SIZE, DEFAULTS.TILE_SIZE), 48, 2048);
    opt.TILE_FONT = clamp(toNum(opt.TILE_FONT, DEFAULTS.TILE_FONT), 8, 512);
    opt.ROTATE_DEG = toNum(opt.ROTATE_DEG, DEFAULTS.ROTATE_DEG);
    opt.PREVIEW_ON_SCREEN = toBool(opt.PREVIEW_ON_SCREEN, DEFAULTS.PREVIEW_ON_SCREEN);
    opt.OUTLINE_STROKE = toBool(opt.OUTLINE_STROKE, DEFAULTS.OUTLINE_STROKE);
    opt.OUTLINE_WIDTH = clamp(toNum(opt.OUTLINE_WIDTH, DEFAULTS.OUTLINE_WIDTH), 0, 8);
    opt.OUTLINE_OPACITY = clamp(toNum(opt.OUTLINE_OPACITY, DEFAULTS.OUTLINE_OPACITY), 0, 1);
    opt.AUTO_FONT_BY_DPR = toBool(opt.AUTO_FONT_BY_DPR, DEFAULTS.AUTO_FONT_BY_DPR);
    opt.DPR_FONT_MIN = clamp(toNum(opt.DPR_FONT_MIN, DEFAULTS.DPR_FONT_MIN), 0.5, 3);
    opt.DPR_FONT_MAX = clamp(toNum(opt.DPR_FONT_MAX, DEFAULTS.DPR_FONT_MAX), 0.5, 3);
    opt.CENTER_TWO_COL = toBool(opt.CENTER_TWO_COL, DEFAULTS.CENTER_TWO_COL);
    opt.CENTER_COL_GAP_PX = clamp(toNum(opt.CENTER_COL_GAP_PX, DEFAULTS.CENTER_COL_GAP_PX), 0, 240);

    _state.opt = opt;

    try {
        // 初期セット
        applyPerMode();
        applyLinkUrlSuppression();
        document.body.setAttribute("data-wm", currentText());

        // 印刷CSSは初期状態では print のまま（追加）
        disablePrintCssNow();

        // イベント
        _listeners.before = beforePrint;
        _listeners.after = afterPrint;
        window.addEventListener("beforeprint", _listeners.before, { passive: true });
        window.addEventListener("afterprint", _listeners.after, { passive: true });

        // Safari: matchMedia('print')
        _mql = window.matchMedia && window.matchMedia("print");
        if (_mql) {
            const handler = (e) => (e.matches ? beforePrint() : afterPrint());
            _listeners.mqlChange = handler;
            if (typeof _mql.addEventListener === "function") {
                _mql.addEventListener("change", handler);
            } else if (typeof _mql.addListener === "function") {
                _mql.addListener(handler);
            }
        }
        _inited = true;
    } catch {
        // 初期化途中失敗時も極力痕跡を残さない
        try { destroy(); } catch { /* no-op */ }
    }
}

export function update(next = {}) {
    if (!hasDOM) return;
    // 例外安全：一時オブジェクトで検証してから採用
    try {
        const merged = { ..._state.opt, ...next };
        // 再バリデーション
        merged.MODE = toMode(merged.MODE, _state.opt.MODE);
        merged.TEXT = (merged.TEXT ?? "").toString().trim() || null;
        merged.PRINT_HIDE_LINK_URLS = toBool(merged.PRINT_HIDE_LINK_URLS, _state.opt.PRINT_HIDE_LINK_URLS);
        merged.TILE_OPACITY = clamp(toNum(merged.TILE_OPACITY, _state.opt.TILE_OPACITY), 0, 1);
        merged.TILE_SIZE = clamp(toNum(merged.TILE_SIZE, _state.opt.TILE_SIZE), 48, 2048);
        merged.TILE_FONT = clamp(toNum(merged.TILE_FONT, _state.opt.TILE_FONT), 8, 512);
        merged.ROTATE_DEG = toNum(merged.ROTATE_DEG, _state.opt.ROTATE_DEG);
        merged.PREVIEW_ON_SCREEN = toBool(merged.PREVIEW_ON_SCREEN, _state.opt.PREVIEW_ON_SCREEN);
        merged.OUTLINE_STROKE = toBool(merged.OUTLINE_STROKE, _state.opt.OUTLINE_STROKE);
        merged.OUTLINE_WIDTH = clamp(toNum(merged.OUTLINE_WIDTH, _state.opt.OUTLINE_WIDTH), 0, 8);
        merged.OUTLINE_OPACITY = clamp(toNum(merged.OUTLINE_OPACITY, _state.opt.OUTLINE_OPACITY), 0, 1);
        merged.AUTO_FONT_BY_DPR = toBool(merged.AUTO_FONT_BY_DPR, _state.opt.AUTO_FONT_BY_DPR);
        merged.DPR_FONT_MIN = clamp(toNum(merged.DPR_FONT_MIN, _state.opt.DPR_FONT_MIN), 0.5, 3);
        merged.DPR_FONT_MAX = clamp(toNum(merged.DPR_FONT_MAX, _state.opt.DPR_FONT_MAX), 0.5, 3);
        merged.CENTER_TWO_COL = toBool(merged.CENTER_TWO_COL, _state.opt.CENTER_TWO_COL);
        merged.CENTER_COL_GAP_PX = clamp(toNum(merged.CENTER_COL_GAP_PX, _state.opt.CENTER_COL_GAP_PX), 0, 240);

        _state.opt = merged;

        // 即時反映
        applyPerMode();
        applyLinkUrlSuppression();
        document.body.setAttribute("data-wm", currentText());
    } catch {
        /* no-op */
    }
}

export function setText(text) {
    if (!hasDOM) return;
    _state.opt.TEXT = (text ?? "").toString().trim() || null;
    try {
        document.body.setAttribute("data-wm", currentText());
        applyPerMode();
    } catch { /* no-op */ }
}

export function setMode(mode) {
    if (!hasDOM) return;
    _state.opt.MODE = toMode(mode, _state.opt.MODE);
    try { applyPerMode(); } catch { /* no-op */ }
}

export function destroy() {
    if (!hasDOM) return;
    // イベント解除
    try {
        if (_listeners.before) window.removeEventListener("beforeprint", _listeners.before);
        if (_listeners.after) window.removeEventListener("afterprint", _listeners.after);
    } catch { /* no-op */ }

    try {
        if (_mql && _listeners.mqlChange) {
            if (typeof _mql.removeEventListener === "function") {
                _mql.removeEventListener("change", _listeners.mqlChange);
            } else if (typeof _mql.removeListener === "function") {
                _mql.removeListener(_listeners.mqlChange);
            }
        }
    } catch { /* no-op */ }

    // 後片付け（痕跡を可能な限り消す）
    try {
        document.body.removeAttribute("data-wm");
        document.body.removeAttribute("data-print-urls");
        clearCssVar("--sr-wm-url");
        clearCssVar("--sr-wm-tile-w");
        clearCssVar("--sr-wm-tile-h");
        clearCssVar("--sr-wm-center-two-col");
        clearCssVar("--sr-wm-center-gap");
        const root = document.documentElement;
        root.style.backgroundImage = "none";
        root.style.backgroundRepeat = "";
        root.style.backgroundSize = "";
    } catch { /* no-op */ }

    _listeners = { before: null, after: null, mqlChange: null };
    _mql = null;
    _inited = false;
}
