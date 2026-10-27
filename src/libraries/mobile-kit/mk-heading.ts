import { LitElement, css, html, unsafeCSS } from 'lit';
import { base, define, fs } from './shared.js';

/** Screen and section titles. Text goes in the default slot. */
export class MkHeading extends LitElement {
  static properties = {
    size: { reflect: true },
    align: { reflect: true },
    tone: { reflect: true },
  };
  size: 'xl' | 'l' | 'm' | 's' = 'l';
  align: 'start' | 'center' | 'end' = 'start';
  tone: 'default' | 'muted' | 'primary' = 'default';

  static styles = [
    base,
    css`
      :host {
        display: block;
        font-weight: 700;
        letter-spacing: -0.01em;
        line-height: 1.25;
        text-wrap: balance;
        font-size: ${unsafeCSS(fs(24))};
      }
      :host([size='xl']) {
        font-size: ${unsafeCSS(fs(30))};
        line-height: 1.15;
      }
      :host([size='m']) {
        font-size: ${unsafeCSS(fs(20))};
      }
      :host([size='s']) {
        font-size: ${unsafeCSS(fs(17))};
      }
      :host([align='center']) {
        text-align: center;
      }
      :host([align='end']) {
        text-align: end;
      }
      :host([tone='muted']) {
        color: var(--mk-color-text-muted, #696969);
      }
      :host([tone='primary']) {
        color: var(--mk-color-primary, #ff6200);
      }
    `,
  ];

  render() {
    const level = { xl: 1, l: 1, m: 2, s: 3 }[this.size] ?? 2;
    return html`<div role="heading" aria-level=${level}><slot></slot></div>`;
  }
}
define('mk-heading', MkHeading);
