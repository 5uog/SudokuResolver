// ========= docs/js/demos/cell.js =========
'use strict';

/**
 * 数独セル入力まわりの堅牢化ユーティリティ。
 * - 文字入力は keydown で処理しない（モバイルで順序が早すぎるため）
 * - beforeinput で [1-9] を自前確定 → rAF で次セルへ
 * - Backspace/Delete は beforeinput で安全に処理
 * - Paste は最初の [1-9] のみ採用
 * - IME 合成中は一切触らない
 *
 * @param {HTMLInputElement[]} inputs 81セル
 * @param {{
 *   onChange?: (index:number, value:string)=>void,
 *   isBlocked?: (index:number)=>boolean   // 読み取り専用/固定セルなら true
 * }} opts
 */
export function attachCellBehaviors(inputs, opts = {}) {
    const onChange = opts.onChange ?? (() => { });
    const isBlocked = opts.isBlocked ?? ((i) => inputs[i]?.readOnly || inputs[i]?.disabled);

    // 属性の標準化（type="text" + 数値キーボード）
    for (const el of inputs) {
        if (!el) continue;
        // fixedセルでも一旦属性は整えておく
        el.type = 'text';
        el.setAttribute('inputmode', 'numeric');
        el.setAttribute('pattern', '[1-9]');
        el.setAttribute('maxlength', '1');
        el.setAttribute('autocomplete', 'off');
        el.setAttribute('autocapitalize', 'off');
        el.setAttribute('autocorrect', 'off');
        el.setAttribute('enterkeyhint', 'next');
    }

    const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
    const focusIndex = (j) => {
        const el = inputs[j];
        if (!el) return;
        if (isBlocked(j)) {
            // ブロックされているセルは飛ばして前後を探す（右優先）
            const k = findNextEditableFrom(j, +1) ?? findNextEditableFrom(j, -1);
            if (k != null) {
                inputs[k].focus();
                inputs[k].select?.();
            }
            return;
        }
        el.focus({ preventScroll: false });
        el.select?.();
    };
    const rcToIndex = (r, c) => clamp(r, 0, 8) * 9 + clamp(c, 0, 8);
    const findNextEditableFrom = (start, dir) => {
        let j = start;
        for (let step = 0; step < 81; step++) {
            j = clamp(j + dir, 0, 80);
            if (!isBlocked(j)) return j;
            if ((dir > 0 && j === 80) || (dir < 0 && j === 0)) break;
        }
        return null;
    };
    const move = (i, dr, dc) => {
        const r = Math.floor(i / 9), c = i % 9;
        const j = rcToIndex(r + dr, c + dc);
        focusIndex(j);
    };
    const normalize = (v) => {
        if (!v) return '';
        const ch = String(v).trim()[0];
        if (ch === '.' || ch === '0') return '';
        return /[1-9]/.test(ch) ? ch : '';
    };

    inputs.forEach((input, i) => {
        if (!input) return;

        let composing = false;
        input.addEventListener('compositionstart', () => composing = true);
        input.addEventListener('compositionend', () => composing = false);

        // キー操作：ナビだけ。数字は扱わない（早すぎるため）
        input.addEventListener('keydown', (e) => {
            // ブロックセルは編集不可・ナビのみ
            if (isBlocked(i)) {
                if (e.key === 'ArrowLeft') { e.preventDefault(); move(i, 0, -1); }
                else if (e.key === 'ArrowRight') { e.preventDefault(); move(i, 0, +1); }
                else if (e.key === 'ArrowUp') { e.preventDefault(); move(i, -1, 0); }
                else if (e.key === 'ArrowDown') { e.preventDefault(); move(i, +1, 0); }
                else if (e.key === 'Tab' || e.key === 'Enter') { e.preventDefault(); focusIndex(findNextEditableFrom(i, +1) ?? i); }
                else { e.preventDefault(); }
                return;
            }

            if (e.key === 'ArrowLeft') { e.preventDefault(); move(i, 0, -1); return; }
            if (e.key === 'ArrowRight') { e.preventDefault(); move(i, 0, +1); return; }
            if (e.key === 'ArrowUp') { e.preventDefault(); move(i, -1, 0); return; }
            if (e.key === 'ArrowDown') { e.preventDefault(); move(i, +1, 0); return; }
            if (e.key === 'Enter' || e.key === 'Tab') { e.preventDefault(); focusIndex(findNextEditableFrom(i, +1) ?? i); return; }

            // Backspace はここではナビだけ（削除は beforeinput）
            if (e.key === 'Backspace' && input.value === '') {
                e.preventDefault();
                const prev = findNextEditableFrom(i, -1);
                if (prev != null) focusIndex(prev);
                return;
            }

            // 数字はデフォルトに任せる（ここで価を触らない）
            if (/^\d$/.test(e.key) || e.key === '.') {
                // allow default
                return;
            }

            // それ以外はブロック
            if (e.key.length === 1) e.preventDefault();
        });

        // 入力確定系（安全な処理はここで）
        input.addEventListener('beforeinput', (e) => {
            if (composing || isBlocked(i)) return;

            if (e.inputType === 'insertText') {
                const ch = normalize(e.data || '');
                if (!ch) { e.preventDefault(); return; }
                e.preventDefault();
                input.value = ch;
                onChange(i, ch);
                requestAnimationFrame(() => {
                    const next = findNextEditableFrom(i, +1);
                    if (next != null) focusIndex(next);
                });
                return;
            }

            if (e.inputType === 'deleteContentBackward' || e.inputType === 'deleteContentForward') {
                e.preventDefault();
                const had = input.value !== '';
                input.value = '';
                onChange(i, '');
                if (!had) {
                    requestAnimationFrame(() => {
                        const prev = findNextEditableFrom(i, -1);
                        if (prev != null) focusIndex(prev);
                    });
                }
                return;
            }

            if (e.inputType === 'insertFromPaste') {
                e.preventDefault();
                const ch = normalize(e.clipboardData?.getData('text') ?? '');
                if (!ch) return;
                input.value = ch;
                onChange(i, ch);
                requestAnimationFrame(() => {
                    const next = findNextEditableFrom(i, +1);
                    if (next != null) focusIndex(next);
                });
                return;
            }
        });

        // フォールバック（端末依存の挙動に備える）
        input.addEventListener('input', () => {
            if (composing) return;
            const ch = normalize(input.value);
            if (input.value !== ch) input.value = ch;
            onChange(i, input.value);
        });

        // iOS Safari タップで確実に focus
        input.addEventListener('pointerdown', () => {
            if (document.activeElement !== input) input.focus({ preventScroll: false });
        }, { passive: true });
    });
}
