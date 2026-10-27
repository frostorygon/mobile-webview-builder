import { LitElement, css, html, unsafeCSS } from 'lit';
import { base, define, fs, tones } from './shared.js';

/** Body copy. Text goes in the default slot. */
export class MkText extends LitElement {
  static properties = {
    variant: { reflect: true },
    tone: { reflect: true },
    align: { reflect: true },
    weight: { reflect: true },
  };
  variant: 'body' | 'small' | 'caption' = 'body';
  tone = 'default';
  align = 'start';
  weight: 'regular' | 'bold' = 'regular';

  static styles = [
    base,
    tones,
    css`
      :host {
        display: block;
        color: var(--_tone);
        font-size: ${unsafeCSS(fs(16))};
        line-height: 1.5;
        text-wrap: pretty;
      }
      :host([tone='default']) {
        color: var(--mk-color-text, #333);
      }
      :host([variant='small']) {
        font-size: ${unsafeCSS(fs(14))};
        line-height: 1.45;
      }
      :host([variant='caption']) {
        font-size: ${unsafeCSS(fs(12))};
        line-height: 1.4;
      }
      :host([align='center']) {
        text-align: center;
      }
      :host([align='end']) {
        text-align: end;
      }
      :host([weight='bold']) {
        font-weight: 600;
      }
      p {
        margin: 0;
        white-space: pre-line;
      }
    `,
  ];

  render() {
    return html`<p><slot></slot></p>`;
  }
}
define('mk-text', MkText);
