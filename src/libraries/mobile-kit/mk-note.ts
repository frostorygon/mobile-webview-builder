import { LitElement, css, html, nothing, unsafeCSS } from 'lit';
import { unsafeSVG } from 'lit/directives/unsafe-svg.js';
import { iconSvg } from '../../core/icons.js';
import { base, define, fs, tones } from './shared.js';

const TONE_ICON: Record<string, string> = {
  neutral: 'info',
  info: 'info',
  success: 'circle-check',
  warning: 'triangle-alert',
  error: 'circle-alert',
};

/** Inline message box: tips, release notes, warnings. */
export class MkNote extends LitElement {
  static properties = {
    heading: { reflect: true },
    tone: { reflect: true },
    icon: { type: Boolean, reflect: true },
    align: { reflect: true },
  };
  heading = '';
  tone = 'neutral';
  icon = false;
  align: 'start' | 'center' = 'start';

  static styles = [
    base,
    tones,
    css`
      :host {
        display: block;
      }
      .note {
        display: flex;
        gap: 12px;
        padding: 14px 16px;
        border-radius: var(--mk-radius, 8px);
        background: color-mix(in srgb, var(--_tone) 8%, var(--mk-color-surface, #fff));
        font-size: ${unsafeCSS(fs(14))};
        line-height: 1.45;
      }
      :host([tone='neutral']) .note {
        background: var(--mk-color-surface-subtle, #f4f4f4);
      }
      :host([align='center']) .note {
        justify-content: center;
        text-align: center;
      }
      .icon {
        color: var(--_tone);
        flex: none;
        line-height: 0;
        padding-top: 1px;
      }
      :host([tone='neutral']) .icon {
        color: var(--mk-color-text-muted, #696969);
      }
      .heading {
        font-weight: 600;
        margin-bottom: 2px;
      }
      .body {
        color: var(--mk-color-text, #333);
        white-space: pre-line;
      }
      :host([tone='neutral']) .body {
        color: var(--mk-color-text-muted, #696969);
      }
    `,
  ];

  render() {
    return html`<div class="note" role="note">
      ${this.icon ? html`<span class="icon">${unsafeSVG(iconSvg(TONE_ICON[this.tone] ?? 'info', 18))}</span>` : nothing}
      <div>
        ${this.heading ? html`<div class="heading">${this.heading}</div>` : nothing}
        <div class="body"><slot></slot></div>
      </div>
    </div>`;
  }
}
define('mk-note', MkNote);
