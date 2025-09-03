// ========= docs/js/utils/approach-loader.js =========
// 章ファイルを on-demand で読み込み、視界外は破棄して DOM 総量を抑制。
// 「ハイジャックなし」モードではスクロールは一切制御せず、
// 目次クリック／#hash 直リンク／本文内アンカーは、先読みのみ行い
// スクロールはブラウザのデフォルト挙動に任せます。

/**
 * @typedef {Object} ApproachLoaderOptions
 * @property {string} base               // 例: `${docsBase}approach/` （末尾スラッシュ可）
 * @property {HTMLElement|null} root     // スクロールコンテナ（.approach__scroll 推奨）
 * @property {string} margin             // IntersectionObserver rootMargin（例: '1200px'）
 * @property {boolean} unloadFar         // 視界ウィンドウ外を破棄するか
 * @property {number} keepAhead          // 視界の先読み章数
 * @property {number} keepBehind         // 視界の後ろ保持章数
 * @property {boolean} hijackScrolling   // ★ スクロールをコードで動かすか（既定: false = ハイジャックしない）
 */

const _state = {
    io: null,
    root: null,
    base: '',
    margin: '900px',
    unloadFar: true,
    keepAhead: 1,
    keepBehind: 0,
    hijackScrolling: false,
    placeholders: /** @type {HTMLElement[]} */([]),
    loaded: new WeakSet(),
    loading: new WeakSet(),
    fileForPlaceholder: new WeakMap(),
    visibleIdx: new Set(),
    listeners: /** @type {Array<[EventTarget,string,EventListenerOrEventListenerObject,AddEventListenerOptions|boolean|undefined]>} */([]),
    wired: false,
};

/* ---------- utils ---------- */
function addListener(target, type, handler, options) {
    target.addEventListener(type, handler, options);
    _state.listeners.push([target, type, handler, options]);
}
function cleanup() {
    if (_state.io) { _state.io.disconnect(); _state.io = null; }
    for (const [t, ty, h, o] of _state.listeners) {
        try { t.removeEventListener(ty, h, o); } catch { }
    }
    _state.listeners = [];
    _state.visibleIdx.clear();
    _state.placeholders = [];
    _state.wired = false;
}
function qsa(root, sel) { return Array.from(root.querySelectorAll(sel)); }
function joinUrl(base, file) {
    const f = String(file || '');
    if (/^(?:[a-z]+:)?\/\//i.test(f) || /^data:|^blob:/.test(f)) return f;
    if (f.startsWith('/')) return f;
    const b = base ? (base.endsWith('/') ? base : base + '/') : '';
    return b + f.replace(/^\.?\//, '');
}
async function fetchHTML(url) {
    const res = await fetch(url, { credentials: 'same-origin', cache: 'no-cache' });
    if (!res.ok) throw new Error(`[approach-loader] fetch failed: ${res.status} ${url}`);
    return res.text();
}
function lazyfyImages(scope) {
    qsa(scope, 'img:not([loading])').forEach(img => { img.loading = 'lazy'; });
}
function safeEscape(id) {
    try { return CSS.escape(id); } catch { return id.replace(/[^\w\-:.]/g, ''); }
}

/* ---------- loading / unloading ---------- */
async function ensureLoaded(placeholder) {
    if (_state.loaded.has(placeholder) || _state.loading.has(placeholder)) return;
    const filename = _state.fileForPlaceholder.get(placeholder);
    if (!filename) return;

    const url = joinUrl(_state.base, filename);
    _state.loading.add(placeholder);
    try {
        const html = await fetchHTML(url);
        const tpl = document.createElement('template');
        tpl.innerHTML = html;
        placeholder.replaceChildren(tpl.content.cloneNode(true));
        placeholder.setAttribute('data-loaded', '1');
        _state.loaded.add(placeholder);
        lazyfyImages(placeholder);

        document.dispatchEvent(new CustomEvent('sr:approach:section:loaded', {
            detail: { el: placeholder, file: filename }
        }));
    } catch (e) {
        console.error('[approach-loader] error while fetching:', url, e);
        placeholder.innerHTML = `
            <div class="card error">
                読み込みに失敗しました。<a href="${url}" target="_blank" rel="noopener">章の原本を開く</a>
            </div>
        `;
    } finally {
        _state.loading.delete(placeholder);
    }
}

function maybeUnload(placeholder) {
    if (!_state.unloadFar) return;
    if (!_state.loaded.has(placeholder)) return;
    placeholder.replaceChildren();
    placeholder.removeAttribute('data-loaded');
    _state.loaded.delete(placeholder);

    const file = _state.fileForPlaceholder.get(placeholder);
    document.dispatchEvent(new CustomEvent('sr:approach:section:unloaded', {
        detail: { el: placeholder, file }
    }));
}

/* ---------- windowed retention (先読み/保持ウィンドウ) ---------- */
function updateWindowByVisible() {
    if (!_state.placeholders.length || !_state.visibleIdx.size) return;
    const minVis = Math.min(..._state.visibleIdx);
    const maxVis = Math.max(..._state.visibleIdx);
    const start = Math.max(0, minVis - _state.keepBehind);
    const end = Math.min(_state.placeholders.length - 1, maxVis + _state.keepAhead);

    for (let i = start; i <= end; i++) ensureLoaded(_state.placeholders[i]);

    if (_state.unloadFar) {
        for (let i = 0; i < _state.placeholders.length; i++) {
            if (i < start || i > end) maybeUnload(_state.placeholders[i]);
        }
    }
}

/* ---------- IO callback ---------- */
async function onIntersect(entries) {
    for (const entry of entries) {
        const el = entry.target;
        const idx = Number(el.getAttribute('data-idx') || '-1');
        if (idx >= 0) {
            if (entry.isIntersecting) _state.visibleIdx.add(idx);
            else _state.visibleIdx.delete(idx);
        }
        if (entry.isIntersecting) await ensureLoaded(el);
    }
    updateWindowByVisible();
}

/* ---------- hash/TOC 解決 ---------- */
const FILENAME_MAP = {
    'abstract': '00-abstract.html',
    '1-csp-formulation': '01-csp-formulation.html',
    '2-inference-rules': '02-inference-rules.html',
    '3-limited-search': '03-limited-search.html',
    '4-data-structures': '04-data-structures.html',
    '5-difficulty-metrics': '05-difficulty-metrics.html',
    '6-puzzle-generation': '06-puzzle-generation.html',
    '7-gui-visualization': '07-gui-visualization.html',
    '8-core-api': '08-core-api.html',
    '9-dlx-algorithm': '09-dlx-algorithm.html',
    '10-complexity-optimization': '10-complexity-optimization.html',
    '11-testing': '11-testing.html',
    '12-conclusion': '12-conclusion.html',
    'references': 'references.html',
};

function findPlaceholderForHash(hash) {
    const id = (hash || '').replace(/^#/, '');
    if (!id) return null;
    const esc = safeEscape(id);

    // 1) ロード済み章の中から探索
    for (const ph of _state.placeholders) {
        if (_state.loaded.has(ph) && ph.querySelector(`#${esc}, [name="${esc}"]`)) return ph;
    }

    // 2) TOC data-section から推定
    const tocLink = document.querySelector(`.approach__toc a[href="#${esc}"]`);
    const secKey = tocLink?.getAttribute('data-section');

    // 2.5) プレースホルダ自身の data-section からも探す
    if (secKey) {
        const phByKey = _state.placeholders.find(p => p.getAttribute('data-section') === secKey);
        if (phByKey) return phByKey;
    }

    // 3) マップから推定
    const guessFile = secKey ? `${secKey}.html` : (FILENAME_MAP[id] || null);
    if (guessFile) return _state.placeholders.find(p => _state.fileForPlaceholder.get(p) === guessFile) || null;

    return null;
}

/* ---------- “ハイジャックなし”向け：先読みだけ行う ---------- */
/** TOCリンクにホバー/ポインタダウンしたら先読み（クリックはブラウザ任せ） */
function wireTocPreload() {
    const preload = async (ev) => {
        const a = ev.target instanceof Element ? ev.target.closest('.approach__toc a[href^="#"]') : null;
        if (!a) return;
        const href = a.getAttribute('href') || '';
        if (!href.startsWith('#')) return;
        const ph = findPlaceholderForHash(href);
        if (ph && !_state.loaded.has(ph)) await ensureLoaded(ph);
    };
    addListener(document, 'pointerover', preload, { capture: true, passive: true });
    addListener(document, 'focusin', preload, { capture: true, passive: true });
    addListener(document, 'pointerdown', preload, { capture: true, passive: true });
}

/** 本文内アンカーも同様に事前ロードのみ */
function wireContentPreload() {
    const preload = async (ev) => {
        const a = ev.target instanceof Element ? ev.target.closest('.approach__scroll a[href^="#"]') : null;
        if (!a) return;
        const href = a.getAttribute('href') || '';
        if (!href.startsWith('#')) return;
        const ph = findPlaceholderForHash(href);
        if (ph && !_state.loaded.has(ph)) await ensureLoaded(ph);
    };
    addListener(document, 'pointerover', preload, { capture: true, passive: true });
    addListener(document, 'focusin', preload, { capture: true, passive: true });
    addListener(document, 'pointerdown', preload, { capture: true, passive: true });
}

/* ---------- “ハイジャックあり”向け（必要時のみ使用） ---------- */
async function goToHashWithScroll(hash, push = true) {
    const ph = findPlaceholderForHash(hash);
    if (!ph) return;
    if (!_state.loaded.has(ph)) await ensureLoaded(ph);

    const id = (hash || '').replace(/^#/, '');
    const esc = safeEscape(id);
    const target = ph.querySelector(`#${esc}, [name="${esc}"]`);
    if (!target) return;

    if (push) try { history.pushState(null, '', `#${id}`); } catch { }
    target.scrollIntoView({ behavior: 'smooth', block: 'start', inline: 'nearest' });
}

/* ---------- 初期 hash / hashchange の最小介入 ---------- */
/**
 * 初期ハッシュあり:
 *  - 先に該当章だけロード
 *  - その後「ブラウザのアンカー挙動」を再実行（hash を同値再設定）
 *  ※ スクロールはブラウザ側が行う（CSS の scroll-margin-top でオフセット調整）
 */
async function rescueNativeAnchorScroll() {
    if (!location.hash) return;
    const ph = findPlaceholderForHash(location.hash);
    if (ph && !_state.loaded.has(ph)) await ensureLoaded(ph);

    // KaTeX/画像でレイアウト揺れが起こる場合に備え、小さく再試行
    const nudge = () => {
        // ブラウザに任せるため、hash を「同値再代入」してネイティブスクロールを再実行
        try {
            const h = location.hash;
            // 同値再設定で動かないブラウザ対策：一瞬だけ空へ→元に戻す（履歴は増やさない）
            const urlNoHash = location.href.replace(/#.*$/, '');
            history.replaceState(null, '', urlNoHash);
            history.replaceState(null, '', urlNoHash + h);
        } catch { }
    };
    nudge();
    setTimeout(nudge, 120);
    setTimeout(nudge, 360);
}

/* ---------- placeholders ---------- */
function primePlaceholders(scope) {
    const rootScope = scope || _state.root || document;
    _state.placeholders = qsa(rootScope, '.approach__section[data-src]');
    _state.placeholders.forEach((ph, idx) => {
        ph.setAttribute('data-idx', String(idx));
        const file = ph.getAttribute('data-src');
        if (file) _state.fileForPlaceholder.set(ph, file);
        _state.io.observe(ph);
    });
}

/* ---------- public API ---------- */
export function setupApproachLazyLoad(/** @type {ApproachLoaderOptions} */ opts = {}) {
    cleanup();

    _state.base = opts.base || '';
    _state.root = opts.root || document.querySelector('.approach__scroll') || null;
    if (_state.root?.dataset?.base) _state.base = _state.root.dataset.base;
    _state.margin = opts.margin || '1200px';
    _state.unloadFar = opts.unloadFar ?? _state.unloadFar;
    _state.keepAhead = Number.isFinite(opts.keepAhead) ? Math.max(0, opts.keepAhead) : _state.keepAhead;
    _state.keepBehind = Number.isFinite(opts.keepBehind) ? Math.max(0, opts.keepBehind) : _state.keepBehind;
    _state.hijackScrolling = !!opts.hijackScrolling; // ★ 既定 false

    _state.io = new IntersectionObserver(onIntersect, {
        root: _state.root || null,
        rootMargin: _state.margin,
        threshold: 0.01,
    });

    primePlaceholders(_state.root || document);

    if (_state.hijackScrolling) {
        addListener(document, 'click', (ev) => {
            const a = ev.target instanceof Element ? ev.target.closest('.approach__toc a, .approach__scroll a[href^="#"]') : null;
            if (!a) return;
            const href = a.getAttribute('href') || '';
            if (!href.startsWith('#')) return;
            ev.preventDefault();
            goToHashWithScroll(href, true);
        }, { capture: true, passive: false });
    } else {
        wireTocPreload();
        wireContentPreload();
    }

    (async () => {
        if (location.hash) {
            await rescueNativeAnchorScroll();
        } else if (_state.placeholders[0]) {
            ensureLoaded(_state.placeholders[0]).catch(() => { });
            _state.visibleIdx.add(0);
            updateWindowByVisible();
        }
        document.dispatchEvent(new CustomEvent('sr:approach:ready'));
    })();

    addListener(window, 'hashchange', async () => {
        const ph = findPlaceholderForHash(location.hash);
        if (ph && !_state.loaded.has(ph)) await ensureLoaded(ph);
        if (_state.hijackScrolling) {
            goToHashWithScroll(location.hash, false);
        }
    }, { passive: true });
}
