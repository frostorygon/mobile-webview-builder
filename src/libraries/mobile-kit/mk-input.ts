import { LitElement, css, html, nothing, unsafeCSS } from 'lit';
import { base, define, fs } from './shared.js';

/** Text field with label and help text. */
export class MkInput extends LitElement {
  static properties = {
    label: { reflect: true },
    placeholder: { reflect: true },
    helpText: { reflect: true, attribute: 'help-text' },
    type: { reflect: true },
    value: {},
    error: { reflect: true },
  };
  label = 'Label';
  placeholder = '';
  helpText = '';
  type = 'text';
  value = '';
  error = '';

  static styles = [
    base,
    css`
      :host {
        display: block;
      }
      label {
        display: block;
        font-size: ${unsafeCSS(fs(14))};
        font-weight: 600;
        margin-bottom: 6px;
      }
      input {
        width: 100%;
        min-height: 48px;
        padding: 12px 14px;
        border-radius: var(--mk-radius, 8px);
        border: 1px solid var(--mk-color-border, #e0e0e0);
        background: var(--mk-color-surface, #fff);
        color: var(--mk-color-text, #333);
        font: inherit;
        font-size: ${unsafeCSS(fs(16))};
        outline: none;
      }
      input:focus {
        border-color: var(--mk-color-accent, #525199);
        box-shadow: 0 0 0 3px color-mix(in srgb, var(--mk-color-accent, #525199) 18%, transparent);
      }
      :host([error]:not([error=''])) input {
        border-color: var(--mk-color-error, #d70000);
      }
      .help {
        font-size: ${unsafeCSS(fs(13))};
        color: var(--mk-color-text-muted, #696969);
        margin-top: 6px;
      }
      .error {
        color: var(--mk-color-error, #d70000);
      }
    `,
  ];

  render() {
    return html`<label for="i">${this.label}</label>
      <input id="i" type=${this.type} placeholder=${this.placeholder} .value=${this.value ?? ''} @input=${(e: Event) => (this.value = (e.target as HTMLInputElement).value)} />
      ${this.error ? html`<div class="help error">${this.error}</div>` : this.helpText ? html`<div class="help">${this.helpText}</div>` : nothing}`;
  }
}
define('mk-input', MkInput);
