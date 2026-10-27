import { LitElement, css, html, nothing, unsafeCSS } from 'lit';
import { unsafeSVG } from 'lit/directives/unsafe-svg.js';
import { iconSvg } from '../../core/icons.js';
import { base, define, fs, tones } from './shared.js';

function formatParts(amount: number, currency: string) {
  try {
    const parts = new Intl.NumberFormat('nl-NL', { style: 'currency', currency, currencyDisplay: 'symbol' }).formatToParts(amount);
    const symbol = parts.filter((p) => p.type === 'currency').map((p) => p.value).join('');
    const sign = parts.some((p) => p.type === 'minusSign') ? '−' : '';
    const whole = parts.filter((p) => p.type === 'integer' || p.type === 'group').map((p) => p.value).join('');
    const fraction = parts.find((p) => p.type === 'fraction')?.value ?? '';
    const decimal = parts.find((p) => p.type === 'decimal')?.value ?? ',';
    return { symbol, sign, whole, fraction, decimal };
  } catch {
    return { symbol: currency, sign: amount < 0 ? '−' : '', whole: String(Math.trunc(Math.abs(amount))), fraction: '00', decimal: ',' };
  }
}

/** Large money amount with de-emphasized decimals. */
export class MkAmount extends LitElement {
  static properties = {
    amount: { type: Number, reflect: true },
    currency: { reflect: true },
    label: { reflect: true },
    size: { reflect: true },
    tone: { reflect: true },
    align: { reflect: true },
  };
  amount = 250;
  currency = 'EUR';
  label = '';
  size: 'm' | 'l' | 'xl' = 'l';
  tone = 'default';
  align: 'start' | 'center' = 'start';

  static styles = [
    base,
    tones,
    css`
      :host {
        display: block;
      }
      :host([align='center']) {
        text-align: center;
      }
      .label {
        font-size: ${unsafeCSS(fs(14))};
        color: var(--mk-color-text-muted, #696969);
        margin-bottom: 4px;
      }
      .amount {
        font-weight: 700;
        letter-spacing: -0.02em;
        font-variant-numeric: tabular-nums;
        color: var(--_tone);
        font-size: ${unsafeCSS(fs(32))};
        line-height: 1.1;
      }
      :host([tone='default']) .amount {
        color: var(--mk-color-text, #333);
      }
      :host([size='m']) .amount {
        font-size: ${unsafeCSS(fs(22))};
      }
      :host([size='xl']) .amount {
        font-size: ${unsafeCSS(fs(44))};
      }
      .frac {
        font-size: 0.6em;
        vertical-align: 0.5em;
        margin-left: 1px;
      }
      .sym {
        margin-right: 0.18em;
      }
    `,
  ];

  render() {
    const p = formatParts(Number(this.amount) || 0, this.currency || 'EUR');
    return html`${this.label ? html`<div class="label">${this.label}</div>` : nothing}
      <div class="amount">${p.sign}<span class="sym">${p.symbol}</span>${p.whole}<span class="frac">${p.decimal}${p.fraction}</span></div>`;
  }
}
define('mk-amount', MkAmount);

/** Compact account summary: name, IBAN and balance. */
export class MkAccountCard extends LitElement {
  static properties = {
    name: { reflect: true },
    iban: { reflect: true },
    balance: { type: Number, reflect: true },
    currency: { reflect: true },
    icon: { reflect: true },
  };
  name = 'Current account';
  iban = 'NL00 BANK 0123 4567 89';
  balance = 1250.5;
  currency = 'EUR';
  icon = 'wallet';

  static styles = [
    base,
    css`
      :host {
        display: block;
      }
      .card {
        display: flex;
        align-items: center;
        gap: 14px;
        padding: 16px;
        border-radius: calc(var(--mk-radius, 8px) * 1.5);
        background: var(--mk-color-surface, #fff);
        border: 1px solid var(--mk-color-border, #e0e0e0);
      }
      .lead {
        flex: none;
        width: 44px;
        height: 44px;
        border-radius: 50%;
        display: grid;
        place-items: center;
        color: var(--mk-color-primary, #ff6200);
        background: color-mix(in srgb, var(--mk-color-primary, #ff6200) 10%, var(--mk-color-surface, #fff));
      }
      .main {
        flex: 1;
        min-width: 0;
      }
      .name {
        font-weight: 600;
        font-size: ${unsafeCSS(fs(16))};
      }
      .iban {
        font-size: ${unsafeCSS(fs(13))};
        color: var(--mk-color-text-muted, #696969);
        letter-spacing: 0.02em;
        margin-top: 2px;
      }
      .bal {
        font-weight: 700;
        font-variant-numeric: tabular-nums;
        font-size: ${unsafeCSS(fs(16))};
      }
    `,
  ];

  render() {
    let bal = String(this.balance);
    try {
      bal = new Intl.NumberFormat('nl-NL', { style: 'currency', currency: this.currency || 'EUR' }).format(Number(this.balance) || 0);
    } catch {
      /* keep raw */
    }
    return html`<div class="card" part="card">
      <span class="lead">${unsafeSVG(iconSvg(this.icon || 'wallet', 22))}</span>
      <div class="main">
        <div class="name">${this.name}</div>
        <div class="iban">${this.iban}</div>
      </div>
      <div class="bal">${bal}</div>
    </div>`;
  }
}
define('mk-account-card', MkAccountCard);

const PLACEHOLDER = `data:image/svg+xml,${encodeURIComponent(
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 180"><rect width="320" height="180" fill="#F4F4F4"/><circle cx="235" cy="58" r="22" fill="#FFD2B3"/><path d="M0 150 L90 80 L150 130 L210 95 L320 160 V180 H0Z" fill="#E6E6EF"/><path d="M0 180 L120 110 L200 160 L320 120 V180Z" fill="#D9D8EC"/></svg>`,
)}`;

/** Image or illustration with a fixed aspect ratio. */
export class MkImage extends LitElement {
  static properties = {
    src: { reflect: true },
    alt: { reflect: true },
    ratio: { reflect: true },
    rounded: { type: Boolean, reflect: true },
  };
  src = '';
  alt = '';
  ratio: '16/9' | '4/3' | '1/1' | '3/1' = '16/9';
  rounded = true;

  static styles = [
    base,
    css`
      :host {
        display: block;
      }
      img {
        display: block;
        width: 100%;
        object-fit: cover;
        background: var(--mk-color-surface-subtle, #f4f4f4);
      }
      :host([rounded]) img {
        border-radius: calc(var(--mk-radius, 8px) * 1.5);
      }
    `,
  ];

  render() {
    return html`<img src=${this.src || PLACEHOLDER} alt=${this.alt} style="aspect-ratio:${this.ratio}" />`;
  }
}
define('mk-image', MkImage);


