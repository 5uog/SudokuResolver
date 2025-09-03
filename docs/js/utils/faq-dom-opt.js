// docs/js/utils/faq-dom-opt.js
// FAQの見た目を変えずに「Most children」「DOM depth」を下げる最適化。

/**
 * 1) <br><br> を段落分割：
 *    1つの <p.faq__description> に集中しているインライン要素（特に KaTeX の span 群）を
 *    複数の <p.faq__description> に分割して「Most children」を下げる。
 *
 * 2) 重い KaTeX を画像に差し替え：
 *    <span class="katex" data-img="/assets/formula/xxx.svg" aria-label="..."> があれば、
 *    それを <img loading="lazy" decoding="async"> に1要素置換（深いDOMを一撃で解消）。
 */
export function optimizeFaqDom(rootSel = '#faq') {
    const root = document.querySelector(rootSel);
    if (!root) return;

    // -------- 1) <br><br> を <p> 分割 --------
    root.querySelectorAll('.faq__content p.faq__description').forEach((p) => {
        // 既に「短い」p はスキップ（コスト節約）
        if ((p.childElementCount || 0) < 12 && (p.textContent || '').length < 1200) return;

        // ノード列を <br><br> で分割していく
        const segments = [];
        let cur = [];

        const flush = () => {
            if (!cur.length) return;
            segments.push(cur);
            cur = [];
        };

        const isBr = (n) => n.nodeType === Node.ELEMENT_NODE && n.tagName === 'BR';

        const nodes = Array.from(p.childNodes);
        for (let i = 0; i < nodes.length; i++) {
            const n = nodes[i];
            if (isBr(n) && isBr(nodes[i + 1])) {
                // 連続 <br><br> の手前までを1セグメントに
                flush();
                i++; // 2つ目の <br> も消費
                continue;
            }
            cur.push(n);
        }
        flush();

        if (segments.length <= 1) return; // 分割不要

        const frag = document.createDocumentFragment();
        segments.forEach((list, idx) => {
            const np = document.createElement('p');
            np.className = 'faq__description';
            list.forEach((n) => np.appendChild(n));
            // 末尾にだけ <br> が残っていたら整理（見た目同等）
            while (np.lastChild && isBr(np.lastChild)) np.removeChild(np.lastChild);
            frag.appendChild(np);
            if (idx !== segments.length - 1) {
                // もとの <br><br> の余白感を保つ（CSSでも再現するのでここは薄めに）
            }
        });
        p.replaceWith(frag);
    });

    // -------- 2) 重い KaTeX を画像に置換 --------
    // 置換対象規則：
    // - .faq__content 内の .katex で data-img がある
    // - もしくは 子要素が閾値以上（深い）なら置換（data-img があるものだけ）
    const CHILD_THRESHOLD = 80; // 目安：これ以上なら“重い”
    root.querySelectorAll('.faq__content .katex').forEach((el) => {
        const imgSrc = el.getAttribute('data-img'); // 用意できる式だけ画像化
        if (!imgSrc) return;

        const heavy =
            (el.querySelectorAll('*').length >= CHILD_THRESHOLD) ||
            el.hasAttribute('data-heavy'); // 明示マークでもOK

        if (!heavy) return;

        const alt = el.getAttribute('aria-label') || '';
        const img = new Image();
        img.loading = 'lazy';
        img.decoding = 'async';
        img.src = imgSrc;
        img.alt = alt;

        // インライン数式は display:inline / ブロック数式は display:block を維持
        // KaTeX の display モード判定（親に .katex-display が付くケースも）
        const isDisplay = el.classList.contains('katex-display') || el.parentElement?.classList?.contains('katex-display');
        img.style.display = isDisplay ? 'block' : 'inline-block';
        if (isDisplay) img.style.margin = '0.35em 0';

        // サイズを持っていれば反映（任意）
        if (el.dataset.w) img.width = parseInt(el.dataset.w, 10);
        if (el.dataset.h) img.height = parseInt(el.dataset.h, 10);

        el.replaceWith(img);
    });
}

// 自動実行（あなたのブート順に合わせて import してください）
document.addEventListener('DOMContentLoaded', () => optimizeFaqDom('#faq'));
