import { LitElement, css, html } from 'lit';
import { unsafeSVG } from 'lit/directives/unsafe-svg.js';
import { iconSvg } from '../../core/icons.js';
import { base, define, tones } from './shared.js';

const SIZES = { s: 16, m: 24, l: 32, xl: 48 } as const;

export class MkIcon extends LitElement {
  static properties = { name: { reflect: true }, size: { reflect: true }, tone: { reflect: true } };
  name = 'star';
  size: keyof typeof SIZES = 'm';
  tone = 'primary';

  static styles = [
    base,
    tones,
    css`
      :host {
        display: inline-flex;
        color: var(--_tone);
        line-height: 0;
      }
      :host([tone='default']) {
        color: currentColor;
      }
    `,
  ];

  render() {
    const px = SIZES[this.size] ?? 24;
    return html`${unsafeSVG(iconSvg(this.name, px, px >= 32 ? 1.75 : 2))}`;
  }
}
define('mk-icon', MkIcon);
