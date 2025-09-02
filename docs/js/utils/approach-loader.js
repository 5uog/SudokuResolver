// docs/js/utils/approach-loader.js
let loaded = false;

async function fetchFragment(url, selector) {
    const res = await fetch(url, { credentials: 'omit', cache: 'force-cache' });
    if (!res.ok) throw new Error('Failed to fetch: ' + res.status);
    const html = await res.text();
    const tpl = document.createElement('template');
    tpl.innerHTML = html;
    return selector ? tpl.content.querySelector(selector) : tpl.content;
}

/**
 * approach.html から本編を抽出して差し込む。
 * @param {Object} opt
 * @param {string} opt.src  - 例: "./math/approach.html"
 * @param {string} opt.selector - 抽出するセレクタ（例: "main"）
 * @param {HTMLElement} opt.mount - 差し込み先
 */
export async function loadApproachOnce({
    src = './math/approach.html',
    selector = 'main',
    mount = document.getElementById('approach-mount'),
} = {}) {
    if (loaded || !mount) return;
    try {
        const fragRoot = await fetchFragment(src, selector);
        if (!fragRoot) throw new Error('Selector not found: ' + selector);

        // 内部リンクを同一ページ用に調整（#xxx はそのまま、相対は相対のまま）
        fragRoot.querySelectorAll('a[href^="#"]').forEach(a => {
            // 既存の #id へスムーズに飛べるように class を付ける等
            a.classList.add('js-scroll-maybe-top');
        });

        // 画像・式の相対パスは approach.html からの相対なので現状維持でOK
        mount.replaceChildren(fragRoot.cloneNode(true));
        mount.hidden = false;
        loaded = true;

        // KaTeX（auto-render）を再実行
        try {
            if (window.renderMathInElement) {
                window.renderMathInElement(mount, {
                    delimiters: [
                        { left: "$$", right: "$$", display: true },
                        { left: "$", right: "$", display: false },
                        { left: "\\(", right: "\\)", display: false },
                        { left: "\\[", right: "\\]", display: true },
                    ],
                    throwOnError: false,
                });
            }
        } catch { }

        // 画像の遅延読込（任意）
        mount.querySelectorAll('img:not([loading])').forEach(img => img.loading = 'lazy');
    } catch (err) {
        console.error(err);
        mount.hidden = false;
        mount.innerHTML = `
      <div class="card error">
        読み込みに失敗しました。<a href="${src}">専用ページ</a>でご覧ください。
      </div>`;
    }
}

export function setupApproachLazyLoad({
    button = document.getElementById('approach-load'),
    mount = document.getElementById('approach-mount'),
    src = './math/approach.html',
    selector = 'main',
} = {}) {
    // クリックで読込
    button?.addEventListener('click', () => loadApproachOnce({ src, selector, mount }), { once: true });

    // スクロールで近づいたら先読み（IntersectionObserver）
    if ('IntersectionObserver' in window && mount) {
        const io = new IntersectionObserver((entries) => {
            if (entries.some(e => e.isIntersecting)) {
                loadApproachOnce({ src, selector, mount });
                io.disconnect();
            }
        }, { rootMargin: '600px 0px' });
        io.observe(mount);
    }
}
