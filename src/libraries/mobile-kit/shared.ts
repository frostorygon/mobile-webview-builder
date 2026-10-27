import { css } from 'lit';

/** Base styles every Mobile kit component shares. Tokens fall back to the default theme. */
export const base = css`
  :host {
    box-sizing: border-box;
    font-family: var(--mk-font-family, system-ui, sans-serif);
    color: var(--mk-color-text, #333);
    -webkit-tap-highlight-color: transparent;
  }
  :host([hidden]) {
    display: none !important;
  }
  *,
  *::before,
  *::after {
    box-sizing: border-box;
  }
`;

/** Sets `--_tone` from a `tone` attribute. */
export const tones = css`
  :host {
    --_tone: var(--mk-color-text, #333);
  }
  :host([tone='primary']) {
    --_tone: var(--mk-color-primary, #ff6200);
  }
  :host([tone='accent']),
  :host([tone='info']) {
    --_tone: var(--mk-color-accent, #525199);
  }
  :host([tone='muted']),
  :host([tone='neutral']) {
    --_tone: var(--mk-color-text-muted, #696969);
  }
  :host([tone='success']),
  :host([tone='positive']) {
    --_tone: var(--mk-color-success, #349651);
  }
  :host([tone='warning']) {
    --_tone: var(--mk-color-warning, #d98a00);
  }
  :host([tone='error']),
  :host([tone='negative']) {
    --_tone: var(--mk-color-error, #d70000);
  }
`;

export const fs = (px: number) => `calc(${px}px * var(--mk-font-scale, 1))`;

export function define(tag: string, ctor: CustomElementConstructor) {
  if (!customElements.get(tag)) customElements.define(tag, ctor);
}
