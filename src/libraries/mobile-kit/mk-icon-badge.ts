import { LitElement, css, html } from 'lit';
import { unsafeSVG } from 'lit/directives/unsafe-svg.js';
import { iconSvg } from '../../core/icons.js';
import { base, define, tones } from './shared.js';

const SIZES = { m: [48, 24], l: [72, 32], xl: [104, 40] } as const;

/** Icon in a softly tinted circle, the hero of simple status and info screens. */
export class MkIconBadge extends LitElement {
  static properties = { icon: { reflect: true }, size: { reflect: true }, tone: { reflect: true } };
  icon = 'download';
  size: keyof typeof SIZES = 'xl';
  tone = 'accent';

  static styles = [
    base,
    tones,
    css`
      :host {
        display: flex;
        justify-content: center;
      }
      .badge {
        display: grid;
        place-items: center;
        border-radius: 50%;
        color: var(--_tone);
        background: color-mix(in srgb, var(--_tone) 9%, var(--mk-color-surface, #fff));
      }
    `,
  ];

  render() {
    const [box, glyph] = SIZES[this.size] ?? SIZES.xl;
    return html`<div class="badge" style="width:${box}px;height:${box}px" part="badge">
      ${unsafeSVG(iconSvg(this.icon, glyph, 1.75))}
    </div>`;
  }
}
define('mk-icon-badge', MkIconBadge);
