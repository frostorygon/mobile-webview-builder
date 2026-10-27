import { LitElement, css, html, nothing, unsafeCSS } from 'lit';
import { unsafeSVG } from 'lit/directives/unsafe-svg.js';
import { iconSvg } from '../../core/icons.js';
import { base, define, fs, tones } from './shared.js';

/** Hairline separator. */
export class MkDivider extends LitElement {
  static properties = { inset: { type: Boolean, reflect: true } };
  inset = false;
  static styles = [
    base,
    css`
      :host {
        display: block;
      }
      hr {
        border: 0;
        border-top: 1px solid var(--mk-color-border, #e0e0e0);
        margin: 0;
      }
      :host([inset]) hr {
        margin-inline-start: 54px;
      }
    `,
  ];
  render() {
    return html`<hr />`;
  }
}
define('mk-divider', MkDivider);

/** Small status label. */
export class MkBadge extends LitElement {
  static properties = { tone: { reflect: true } };
  tone = 'accent';
  static styles = [
    base,
    tones,
    css`
      :host {
        display: inline-flex;
      }
      span {
        display: inline-flex;
        align-items: center;
        padding: 3px 10px;
        border-radius: 999px;
        font-size: ${unsafeCSS(fs(12))};
        font-weight: 600;
        letter-spacing: 0.01em;
        color: var(--_tone);
        background: color-mix(in srgb, var(--_tone) 12%, var(--mk-color-surface, #fff));
      }
    `,
  ];
  render() {
    return html`<span><slot></slot></span>`;
  }
}
define('mk-badge', MkBadge);

/** Inline text link with an optional trailing icon. */
export class MkLink extends LitElement {
  static properties = { icon: { reflect: true }, align: { reflect: true } };
  icon = 'chevron-right';
  align: 'start' | 'center' = 'start';
  static styles = [
    base,
    css`
      :host {
        display: flex;
      }
      :host([align='center']) {
        justify-content: center;
      }
      a {
        display: inline-flex;
        align-items: center;
        gap: 4px;
        color: var(--mk-color-accent, #525199);
        font-weight: 600;
        font-size: ${unsafeCSS(fs(15))};
        text-decoration: none;
        cursor: pointer;
        min-height: 32px;
      }
    `,
  ];
  render() {
    return html`<a part="link" role="link" tabindex="0"><slot></slot>${this.icon ? unsafeSVG(iconSvg(this.icon, 18)) : nothing}</a>`;
  }
}
define('mk-link', MkLink);

/** Activity indicator. */
export class MkSpinner extends LitElement {
  static properties = { size: { reflect: true }, label: { reflect: true } };
  size: 's' | 'm' | 'l' = 'm';
  label = 'Loading…';
  static styles = [
    base,
    css`
      :host {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 12px;
        color: var(--mk-color-text-muted, #696969);
        font-size: ${unsafeCSS(fs(14))};
      }
      .ring {
        border-radius: 50%;
        border: 3px solid var(--mk-color-border, #e0e0e0);
        border-top-color: var(--mk-color-primary, #ff6200);
        animation: spin 0.9s linear infinite;
      }
      @keyframes spin {
        to {
          transform: rotate(1turn);
        }
      }
    `,
  ];
  render() {
    const px = { s: 20, m: 32, l: 48 }[this.size] ?? 32;
    return html`<div class="ring" style="width:${px}px;height:${px}px" role="progressbar" aria-label=${this.label || 'Loading'}></div>
      ${this.label ? html`<span>${this.label}</span>` : nothing}`;
  }
}
define('mk-spinner', MkSpinner);

/** Step progress for multi-screen flows. */
export class MkSteps extends LitElement {
  static properties = { current: { type: Number, reflect: true }, total: { type: Number, reflect: true }, label: { type: Boolean, reflect: true } };
  current = 1;
  total = 3;
  label = true;
  static styles = [
    base,
    css`
      :host {
        display: block;
      }
      .bars {
        display: flex;
        gap: 4px;
      }
      .bar {
        flex: 1;
        height: 4px;
        border-radius: 2px;
        background: var(--mk-color-border, #e0e0e0);
      }
      .bar.on {
        background: var(--mk-color-primary, #ff6200);
      }
      .label {
        margin-top: 8px;
        font-size: ${unsafeCSS(fs(12))};
        color: var(--mk-color-text-muted, #696969);
      }
    `,
  ];
  render() {
    const total = Math.max(1, Math.min(10, this.total));
    return html`<div class="bars" role="progressbar" aria-valuemin="1" aria-valuemax=${total} aria-valuenow=${this.current}>
        ${Array.from({ length: total }, (_, i) => html`<span class="bar ${i < this.current ? 'on' : ''}"></span>`)}
      </div>
      ${this.label ? html`<div class="label">Step ${this.current} of ${total}</div>` : nothing}`;
  }
}
define('mk-steps', MkSteps);

/** Labelled checkbox (consent, terms). */
export class MkCheckbox extends LitElement {
  static properties = { label: { reflect: true }, checked: { type: Boolean, reflect: true } };
  label = 'I agree to the terms and conditions';
  checked = false;
  static styles = [
    base,
    css`
      :host {
        display: block;
      }
      label {
        display: flex;
        gap: 12px;
        align-items: flex-start;
        font-size: ${unsafeCSS(fs(15))};
        line-height: 1.45;
        cursor: pointer;
      }
      input {
        margin: 1px 0 0;
        width: 20px;
        height: 20px;
        flex: none;
        accent-color: var(--mk-color-primary, #ff6200);
      }
    `,
  ];
  render() {
    return html`<label><input type="checkbox" .checked=${this.checked} @change=${(e: Event) => (this.checked = (e.target as HTMLInputElement).checked)} />${this.label}</label>`;
  }
}
define('mk-checkbox', MkCheckbox);
