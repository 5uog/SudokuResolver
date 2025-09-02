/* ======================================================
                docs/js/components/footer.js
   ====================================================== */

/** 年を YYYY で返す */
function getCurrentYear() {
    return new Date().getFullYear();
}

/** <footer> 要素を生成（最小マークアップ厳守） */
function createFooterElement(year) {
    const footer = document.createElement('footer');
    footer.classList.add('footer', 'grid');

    const blob = document.createElement('div');
    blob.classList.add('blob-animate');

    const copy = document.createElement('div');
    copy.classList.add('footer__copy');
    // "All Rights Reserved By <span>Suog</span>"
    copy.appendChild(document.createTextNode('All Rights Reserved By '));
    const who = document.createElement('span');
    who.textContent = 'Suog';
    copy.appendChild(who);

    const yearWrap = document.createElement('div');
    yearWrap.classList.add('footer__year');
    yearWrap.appendChild(document.createTextNode('© '));
    const y = document.createElement('span');
    y.id = 'footer-year';
    y.textContent = String(year);
    yearWrap.appendChild(y);

    footer.appendChild(blob);
    footer.appendChild(copy);
    footer.appendChild(yearWrap);
    return footer;
}

/** #footer-year をすべて最新年に更新（重複ID耐性のため複数対応） */
function updateFooterYear(scope = document) {
    const currentYear = getCurrentYear();
    // まずスコープ内、見つからなければドキュメント全体も念のため更新
    const nodes = new Set([
        ...scope.querySelectorAll('#footer-year'),
        ...document.querySelectorAll('#footer-year'),
    ]);
    nodes.forEach((el) => {
        if (el && el.textContent !== String(currentYear)) {
            el.textContent = String(currentYear);
        }
    });
}

/** 次の年始0時に年を更新するタイマーを仕掛ける（年跨ぎ対応） */
function scheduleYearRollover(scope) {
    try {
        const now = new Date();
        const next = new Date(now.getFullYear() + 1, 0, 1, 0, 0, 0, 0); // 来年 1/1 00:00
        const delay = Math.max(0, next - now);
        // setTimeout 精度に依存するが、十分実用的
        setTimeout(() => {
            updateFooterYear(scope);
            scheduleYearRollover(scope);
        }, delay);
    } catch { /* no-op */ }
}

/**
 * シンプルフッターを描画（冪等）
 * @param {{ mountId?: string, forceRebuild?: boolean }} opts
 *   - mountId: マウント先のID（既定: 'sr-footer'）
 *   - forceRebuild: 既存footerを破棄して再生成したい時のみ true
 */
export function renderFooter(opts = {}) {
    const { mountId = 'sr-footer', forceRebuild = false } = opts;

    // 1) マウント先の決定（無ければ末尾にフォールバック作成）
    let mount = document.getElementById(mountId);
    if (!mount) {
        mount = document.createElement('div');
        mount.id = mountId;
        // body がまだ無ければ諦める
        if (!document.body) return;
        document.body.appendChild(mount);
    }

    // 2) 既に footer があるか判定（SSRや静的HTML対応）
    let footer = mount.querySelector(':scope > footer.footer.grid');
    if (!footer && !forceRebuild) {
        // マウント外に直置きされているケースもハイドレート対象にする（最後の手段）
        footer = document.querySelector('body > footer.footer.grid') || null;
        if (footer && footer.parentElement !== mount) {
            // プロジェクト構造を安定させるため、マウント配下へ移送
            mount.replaceChildren(footer);
        }
    }

    // 3) 無ければ生成・あればそのまま利用（年のみ更新）
    if (!footer || forceRebuild) {
        const year = getCurrentYear();
        const fresh = createFooterElement(year);
        mount.replaceChildren(fresh);
        footer = fresh;
    }

    // 4) 必ず年を最新化
    updateFooterYear(mount);

    // 5) 年跨ぎで自動更新
    scheduleYearRollover(mount);
}

/** DOMContentLoaded 後に安全実行したい場合の簡易ヘルパ */
export function initFooter(opts) {
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => renderFooter(opts), { once: true });
    } else {
        renderFooter(opts);
    }
}
