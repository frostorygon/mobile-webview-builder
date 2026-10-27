import { css } from 'lit';

/**
 * Builder chrome styles. The chrome stays neutral (ink + indigo) so the screens being
 * designed, in their own theme colors, are what stands out.
 */
export const ui = css`
  :host {
    --c-bg: #f6f7f9;
    --c-panel: #ffffff;
    --c-line: #e6e8ec;
    --c-line-strong: #d5d8de;
    --c-text: #1d2330;
    --c-muted: #6b7280;
    --c-faint: #9aa1ad;
    --c-hover: #f2f3f6;
    --c-accent: #4f46e5;
    --c-accent-soft: #eef0ff;
    --c-accent-text: #3730a3;
    --c-danger: #dc2626;
    --c-block: #7c3aed;
    --radius: 8px;
    font-family: 'Inter', system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif;
    font-size: 13px;
    color: var(--c-text);
    box-sizing: border-box;
  }
  *,
  *::before,
  *::after {
    box-sizing: border-box;
  }
  button {
    font: inherit;
    color: inherit;
  }
  .btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    height: 32px;
    padding: 0 12px;
    border-radius: var(--radius);
    border: 1px solid var(--c-line-strong);
    background: var(--c-panel);
    cursor: pointer;
    font-weight: 500;
    white-space: nowrap;
    transition: background 0.12s, border-color 0.12s;
  }
  .btn:hover {
    background: var(--c-hover);
  }
  .btn:disabled {
    opacity: 0.4;
    cursor: default;
  }
  .btn.primary {
    background: var(--c-accent);
    border-color: var(--c-accent);
    color: #fff;
  }
  .btn.primary:hover {
    background: #4338ca;
  }
  .btn.ghost {
    border-color: transparent;
    background: transparent;
  }
  .btn.ghost:hover {
    background: var(--c-hover);
  }
  .btn.danger {
    color: var(--c-danger);
  }
  .btn.sm {
    height: 26px;
    padding: 0 8px;
    font-size: 12px;
  }
  .icon-btn {
    display: inline-grid;
    place-items: center;
    width: 30px;
    height: 30px;
    border-radius: 7px;
    border: 0;
    background: transparent;
    color: var(--c-muted);
    cursor: pointer;
    padding: 0;
  }
  .icon-btn:hover {
    background: var(--c-hover);
    color: var(--c-text);
  }
  .icon-btn:disabled {
    opacity: 0.35;
    cursor: default;
    background: transparent;
  }
  .icon-btn.active {
    background: var(--c-accent-soft);
    color: var(--c-accent);
  }
  .icon-btn.sm {
    width: 24px;
    height: 24px;
  }
  input[type='text'],
  input[type='number'],
  input[type='url'],
  input[type='search'],
  textarea,
  select {
    width: 100%;
    font: inherit;
    color: inherit;
    height: 30px;
    padding: 0 8px;
    border: 1px solid var(--c-line-strong);
    border-radius: 6px;
    background: #fff;
    outline: none;
  }
  textarea {
    height: auto;
    min-height: 60px;
    padding: 6px 8px;
    resize: vertical;
    line-height: 1.45;
  }
  input:focus,
  textarea:focus,
  select:focus {
    border-color: var(--c-accent);
    box-shadow: 0 0 0 3px rgb(79 70 229 / 0.14);
  }
  .seg {
    display: flex;
    background: var(--c-hover);
    border-radius: 7px;
    padding: 2px;
    gap: 2px;
  }
  .seg button {
    flex: 1;
    min-width: 0;
    height: 26px;
    border: 0;
    border-radius: 5px;
    background: transparent;
    cursor: pointer;
    color: var(--c-muted);
    font-size: 12px;
    font-weight: 500;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 4px;
    padding: 0 6px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .seg button:hover {
    color: var(--c-text);
  }
  .seg button.on {
    background: #fff;
    color: var(--c-text);
    box-shadow: 0 1px 2px rgb(16 24 40 / 0.12);
  }
  .label {
    font-size: 11px;
    font-weight: 600;
    letter-spacing: 0.04em;
    text-transform: uppercase;
    color: var(--c-faint);
  }
  .muted {
    color: var(--c-muted);
  }
  .chip {
    display: inline-flex;
    align-items: center;
    height: 18px;
    padding: 0 6px;
    border-radius: 4px;
    font-size: 10.5px;
    font-weight: 600;
    letter-spacing: 0.02em;
    white-space: nowrap;
  }
  kbd {
    font: 11px ui-monospace, SFMono-Regular, Menlo, monospace;
    padding: 1px 5px;
    border-radius: 4px;
    border: 1px solid var(--c-line-strong);
    border-bottom-width: 2px;
    background: #fff;
    color: var(--c-muted);
  }
  ::-webkit-scrollbar {
    width: 10px;
    height: 10px;
  }
  ::-webkit-scrollbar-thumb {
    background: #d8dbe1;
    border-radius: 10px;
    border: 3px solid transparent;
    background-clip: content-box;
  }
  ::-webkit-scrollbar-thumb:hover {
    background-color: #c3c7cf;
  }
`;
