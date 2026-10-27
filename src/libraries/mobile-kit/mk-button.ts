import { LitElement, css, html, nothing, unsafeCSS } from 'lit';
import { unsafeSVG } from 'lit/directives/unsafe-svg.js';
import { iconSvg } from '../../core/icons.js';
import { base, define, fs } from './shared.js';

export class MkButton extends LitElement {
  static properties = {
    variant: { reflect: true },
    block: { type: Boolean, reflect: true },
    icon: { reflect: true },
    disabled: { type: Boolean, reflect: true },
  };
  variant: 'primary' | 'secondary' | 'tertiary' | 'link' = 'primary';
  block = false;
  icon = '';
  disabled = false;

  static styles = [
    base,
    css`
      :host {
        display: inline-block;
      }
      :host([block]) {
        display: block;
      }
      button {
        all: unset;
        box-sizing: border-box;
        width: 100%;
        min-height: 48px;
        padding: 12px 20px;
        border-radius: var(--mk-radius, 8px);
        display: inline-flex;
        align-items: center;
        justify-content: center;
        gap: 8px;
        font: inherit;
        font-size: ${unsafeCSS(fs(16))};
        font-weight: 600;
        text-align: center;
        cursor: pointer;
        transition: filter 0.15s, background 0.15s;
        background: var(--mk-color-primary, #ff6200);
        color: var(--mk-color-on-primary, #fff);
      }
      button:active {
        filter: brightness(0.92);
      }
      button:focus-visible {
        outline: 2px solid var(--mk-color-accent, #525199);
        outline-offset: 2px;
      }
      :host([variant='secondary']) button {
        background: transparent;
        color: var(--mk-color-primary, #ff6200);
        box-shadow: inset 0 0 0 1.5px currentColor;
      }
      :host([variant='tertiary']) button {
        background: var(--mk-color-surface-subtle, #f4f4f4);
        color: var(--mk-color-text, #333);
      }
      :host([variant='link']) button {
        background: none;
        color: var(--mk-color-accent, #525199);
        min-height: 40px;
        padding: 8px 4px;
      }
      :host([disabled]) button {
        opacity: 0.4;
        pointer-events: none;
      }
    `,
  ];

  render() {
    return html`<button part="button" ?disabled=${this.disabled}>
      ${this.icon ? unsafeSVG(iconSvg(this.icon, 20)) : nothing}<slot></slot>
    </button>`;
  }
}
define('mk-button', MkButton);
