import { LitElement, css, html } from 'lit';

/** Example team component: one-time code entry with individual digit boxes. */
export class TeamCodeInput extends LitElement {
  static properties = {
    length: { type: Number, reflect: true },
    label: { reflect: true },
    value: {},
  };
  length = 6;
  label = 'Enter the code we sent you';
  value = '';

  static styles = css`
    :host {
      display: block;
      font-family: var(--mk-font-family, system-ui);
      color: var(--mk-color-text, #333);
    }
    label {
      display: block;
      text-align: center;
      font-size: calc(14px * var(--mk-font-scale, 1));
      color: var(--mk-color-text-muted, #696969);
      margin-bottom: 12px;
    }
    .boxes {
      position: relative;
      display: flex;
      justify-content: center;
      gap: 8px;
    }
    .box {
      width: 44px;
      height: 54px;
      border-radius: var(--mk-radius, 8px);
      border: 1.5px solid var(--mk-color-border, #e0e0e0);
      display: grid;
      place-items: center;
      font-size: 22px;
      font-weight: 700;
      background: var(--mk-color-surface, #fff);
    }
    .box.active {
      border-color: var(--mk-color-primary, #ff6200);
    }
    input {
      position: absolute;
      inset: 0;
      opacity: 0;
      font-size: 16px;
    }
  `;

  render() {
    const len = Math.max(3, Math.min(8, this.length));
    return html`<label for="code">${this.label}</label>
      <div class="boxes">
        ${Array.from({ length: len }, (_, i) => html`<span class="box ${i === this.value.length ? 'active' : ''}">${this.value[i] ?? ''}</span>`)}
        <input
          id="code"
          inputmode="numeric"
          autocomplete="one-time-code"
          maxlength=${len}
          .value=${this.value}
          @input=${(e: Event) => (this.value = (e.target as HTMLInputElement).value.replace(/\D/g, '').slice(0, len))}
        />
      </div>`;
  }
}
if (!customElements.get('team-code-input')) customElements.define('team-code-input', TeamCodeInput);
