import { LitElement, css, html, nothing } from 'lit';
import { icon, iconNames } from '../../core/icons.js';
import { ui } from '../styles.js';

const FEATURED = [
  'download', 'circle-check', 'circle-alert', 'triangle-alert', 'info', 'bell', 'lock', 'shield-check', 'fingerprint', 'scan-face',
  'wallet', 'credit-card', 'landmark', 'piggy-bank', 'euro', 'banknote', 'send', 'arrow-left-right', 'receipt', 'chart-pie',
  'user', 'users', 'settings', 'house', 'mail', 'phone', 'message-circle', 'calendar', 'clock', 'map-pin',
  'smartphone', 'key-round', 'gift', 'percent', 'star', 'heart', 'plane', 'car', 'shopping-bag', 'sparkles',
];

/** Searchable icon picker. Emits `change` with `detail` = icon name ('' = none). */
export class WbIconPicker extends LitElement {
  static properties = { value: {}, open: { state: true }, q: { state: true }, allowNone: { type: Boolean, attribute: 'allow-none' } };
  value = '';
  open = false;
  q = '';
  allowNone = true;

  static styles = [
    ui,
    css`
      :host {
        display: block;
        position: relative;
      }
      .trigger {
        width: 100%;
        height: 30px;
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 0 8px;
        border: 1px solid var(--c-line-strong);
        border-radius: 6px;
        background: #fff;
        cursor: pointer;
        text-align: left;
      }
      .trigger .nm {
        flex: 1;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
      .pop {
        position: absolute;
        z-index: 20;
        right: 0;
        top: 34px;
        width: 268px;
        background: #fff;
        border: 1px solid var(--c-line);
        border-radius: 10px;
        box-shadow: 0 12px 32px rgb(15 23 42 / 0.18);
        padding: 8px;
      }
      .grid {
        display: grid;
        grid-template-columns: repeat(8, 1fr);
        gap: 2px;
        max-height: 220px;
        overflow-y: auto;
        margin-top: 8px;
      }
      .grid button {
        aspect-ratio: 1;
        border: 0;
        background: transparent;
        border-radius: 6px;
        display: grid;
        place-items: center;
        cursor: pointer;
        color: var(--c-text);
      }
      .grid button:hover {
        background: var(--c-hover);
      }
      .grid button.on {
        background: var(--c-accent-soft);
        color: var(--c-accent);
      }
      .foot {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-top: 6px;
        font-size: 11px;
        color: var(--c-faint);
      }
    `,
  ];

  private outside = (e: Event) => {
    if (!e.composedPath().includes(this)) this.open = false;
  };

  updated(changed: Map<string, unknown>) {
    if (changed.has('open')) {
      if (this.open) {
        window.addEventListener('pointerdown', this.outside, true);
        this.updateComplete.then(() => this.renderRoot.querySelector<HTMLInputElement>('.pop input')?.focus());
      } else window.removeEventListener('pointerdown', this.outside, true);
    }
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    window.removeEventListener('pointerdown', this.outside, true);
  }

  private pick(name: string) {
    this.value = name;
    this.open = false;
    this.dispatchEvent(new CustomEvent('change', { detail: name }));
  }

  render() {
    const q = this.q.trim().toLowerCase();
    const list = q ? iconNames.filter((n) => n.includes(q)).slice(0, 240) : FEATURED;
    return html`<button class="trigger" @click=${() => (this.open = !this.open)}>
        ${this.value ? icon(this.value, 16) : html`<span class="muted">${icon('circle-off', 16)}</span>`}
        <span class="nm">${this.value || 'None'}</span>
        ${icon('chevron-down', 14)}
      </button>
      ${this.open
        ? html`<div class="pop">
            <input type="search" placeholder="Search ${iconNames.length} icons…" .value=${this.q} @input=${(e: InputEvent) => (this.q = (e.target as HTMLInputElement).value)} />
            <div class="grid">
              ${list.map((n) => html`<button class=${n === this.value ? 'on' : ''} title=${n} @click=${() => this.pick(n)}>${icon(n, 18)}</button>`)}
            </div>
            <div class="foot">
              <span>${q ? `${list.length} results` : 'Popular icons. Type to search all.'}</span>
              ${this.allowNone ? html`<button class="btn sm ghost" @click=${() => this.pick('')}>None</button>` : nothing}
            </div>
          </div>`
        : nothing}`;
  }
}
customElements.define('wb-icon-picker', WbIconPicker);
