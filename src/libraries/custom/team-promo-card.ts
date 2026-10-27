import { LitElement, css, html, nothing } from 'lit';
import { unsafeSVG } from 'lit/directives/unsafe-svg.js';
import { iconSvg } from '../../core/icons.js';

/**
 * Example of a team-owned component: a promotional card with icon, title, text and a CTA.
 * Write it like any Lit component, then describe it in ./index.ts to make it draggable.
 */
export class TeamPromoCard extends LitElement {
  static properties = {
    heading: { reflect: true },
    text: { reflect: true },
    cta: { reflect: true },
    icon: { reflect: true },
    tone: { reflect: true },
  };
  heading = 'Save automatically';
  text = 'Round up every payment and put the change aside.';
  cta = 'Set up';
  icon = 'piggy-bank';
  tone: 'primary' | 'accent' = 'primary';

  static styles = css`
    :host {
      display: block;
      font-family: var(--mk-font-family, system-ui);
      --_c: var(--mk-color-primary, #ff6200);
    }
    :host([tone='accent']) {
      --_c: var(--mk-color-accent, #525199);
    }
    .card {
      display: grid;
      grid-template-columns: auto 1fr;
      gap: 4px 14px;
      padding: 16px;
      border-radius: calc(var(--mk-radius, 8px) * 1.5);
      background: color-mix(in srgb, var(--_c) 8%, var(--mk-color-surface, #fff));
    }
    .icon {
      grid-row: span 3;
      width: 44px;
      height: 44px;
      border-radius: 12px;
      display: grid;
      place-items: center;
      color: #fff;
      background: var(--_c);
    }
    h3 {
      margin: 0;
      font-size: calc(16px * var(--mk-font-scale, 1));
      color: var(--mk-color-text, #333);
    }
    p {
      margin: 0;
      font-size: calc(14px * var(--mk-font-scale, 1));
      line-height: 1.45;
      color: var(--mk-color-text-muted, #696969);
    }
    a {
      margin-top: 6px;
      font-weight: 600;
      font-size: calc(14px * var(--mk-font-scale, 1));
      color: var(--_c);
      display: inline-flex;
      align-items: center;
      gap: 2px;
      cursor: pointer;
    }
  `;

  render() {
    return html`<div class="card">
      <span class="icon">${unsafeSVG(iconSvg(this.icon, 22))}</span>
      <h3>${this.heading}</h3>
      <p>${this.text}</p>
      ${this.cta ? html`<a role="button" tabindex="0">${this.cta}${unsafeSVG(iconSvg('chevron-right', 16))}</a>` : nothing}
    </div>`;
  }
}
if (!customElements.get('team-promo-card')) customElements.define('team-promo-card', TeamPromoCard);
