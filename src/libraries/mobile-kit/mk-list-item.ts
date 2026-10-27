import { LitElement, css, html, nothing, unsafeCSS } from 'lit';
import { unsafeSVG } from 'lit/directives/unsafe-svg.js';
import { iconSvg } from '../../core/icons.js';
import { base, define, fs } from './shared.js';

/** A tappable row for settings, menus and overviews. */
export class MkListItem extends LitElement {
  static properties = {
    heading: { reflect: true },
    subtitle: { reflect: true },
    icon: { reflect: true },
    trailing: { reflect: true },
    value: { reflect: true },
    divider: { type: Boolean, reflect: true },
    checked: { type: Boolean, reflect: true },
  };
  heading = 'List item';
  subtitle = '';
  icon = '';
  trailing: 'chevron' | 'value' | 'switch' | 'check' | 'none' = 'chevron';
  value = '';
  divider = true;
  checked = false;

  static styles = [
    base,
    css`
      :host {
        display: block;
      }
      .row {
        display: flex;
        align-items: center;
        gap: 14px;
        min-height: 56px;
        padding: 10px 0;
      }
      :host([divider]) .row {
        border-bottom: 1px solid var(--mk-color-border, #e0e0e0);
      }
      .lead {
        flex: none;
        width: 40px;
        height: 40px;
        border-radius: 50%;
        display: grid;
        place-items: center;
        color: var(--mk-color-accent, #525199);
        background: var(--mk-color-surface-subtle, #f4f4f4);
      }
      .main {
        flex: 1;
        min-width: 0;
      }
      .title {
        font-size: ${unsafeCSS(fs(16))};
        line-height: 1.35;
      }
      .sub {
        font-size: ${unsafeCSS(fs(13))};
        color: var(--mk-color-text-muted, #696969);
        line-height: 1.35;
        margin-top: 2px;
      }
      .trail {
        flex: none;
        color: var(--mk-color-text-muted, #696969);
        display: flex;
        align-items: center;
        gap: 6px;
        font-size: ${unsafeCSS(fs(15))};
      }
      .value {
        color: var(--mk-color-text, #333);
        font-weight: 600;
      }
      .switch {
        width: 44px;
        height: 26px;
        border-radius: 13px;
        background: var(--mk-color-border, #e0e0e0);
        position: relative;
        transition: background 0.2s;
      }
      .switch::after {
        content: '';
        position: absolute;
        top: 3px;
        left: 3px;
        width: 20px;
        height: 20px;
        border-radius: 50%;
        background: #fff;
        box-shadow: 0 1px 3px rgb(0 0 0 / 0.25);
        transition: transform 0.2s;
      }
      :host([checked]) .switch {
        background: var(--mk-color-success, #349651);
      }
      :host([checked]) .switch::after {
        transform: translateX(18px);
      }
      .check {
        color: var(--mk-color-primary, #ff6200);
      }
    `,
  ];

  private trailingTpl() {
    switch (this.trailing) {
      case 'chevron':
        return html`${this.value ? html`<span>${this.value}</span>` : nothing}${unsafeSVG(iconSvg('chevron-right', 20))}`;
      case 'value':
        return html`<span class="value">${this.value}</span>`;
      case 'switch':
        return html`<span class="switch" role="switch" aria-checked=${this.checked}></span>`;
      case 'check':
        return this.checked ? html`<span class="check">${unsafeSVG(iconSvg('check', 22, 2.5))}</span>` : nothing;
      default:
        return nothing;
    }
  }

  render() {
    return html`<div class="row" part="row">
      ${this.icon ? html`<span class="lead">${unsafeSVG(iconSvg(this.icon, 20))}</span>` : nothing}
      <div class="main">
        <div class="title">${this.heading}</div>
        ${this.subtitle ? html`<div class="sub">${this.subtitle}</div>` : nothing}
      </div>
      <div class="trail">${this.trailingTpl()}</div>
    </div>`;
  }
}
define('mk-list-item', MkListItem);
