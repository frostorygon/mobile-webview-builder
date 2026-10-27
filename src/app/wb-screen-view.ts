import { LitElement, html, nothing } from 'lit';
import type { BlockDef, Screen, Theme } from '../core/model.js';
import { registry } from '../core/registry.js';
import { EDIT_CSS, renderNodes, renderScreen, type RenderMode } from '../core/render.js';
import { themeVars } from '../core/theme.js';
import { ROOT } from '../core/tree.js';
import { LAYOUT_CSS } from '../libraries/layout.js';

const sheets = new Map<string, CSSStyleSheet>();
function sheet(text: string): CSSStyleSheet {
  let s = sheets.get(text);
  if (!s) {
    s = new CSSStyleSheet();
    s.replaceSync(text);
    sheets.set(text, s);
  }
  return s;
}

const HOST_CSS = `
:host { display: block; min-height: 100%; position: relative; }
:host([fill]) { height: 100%; }
:host([mode='static']) .mk-screen__footer { position: relative; } /* thumbnails: no sticky to outer scrollers */
.block-stage { min-height: 100%; display: flex; flex-direction: column; justify-content: center; padding: var(--mk-space-l) var(--mk-space-m); background: var(--mk-color-surface); }
`;

/**
 * Renders a screen (or a block) with the project theme in an isolated shadow root,
 * like the webview it will become. Used by the canvas, preview and thumbnails.
 */
export class WbScreenView extends LitElement {
  static properties = {
    screen: { attribute: false },
    block: { attribute: false },
    blocks: { attribute: false },
    theme: { attribute: false },
    mode: { reflect: true },
    onLink: { attribute: false },
  };
  screen?: Screen;
  block?: BlockDef;
  blocks: BlockDef[] = [];
  theme?: Theme;
  mode: RenderMode = 'static';
  onLink?: (id: string) => void;

  private unsub?: () => void;

  connectedCallback() {
    super.connectedCallback();
    // Re-render when a library finishes loading (new CSS, new definitions).
    this.unsub = registry.subscribe(() => this.requestUpdate());
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    this.unsub?.();
  }

  protected willUpdate() {
    const libCss = registry
      .libraries()
      .map((l) => l.css)
      .filter(Boolean) as string[];
    const root = this.renderRoot as ShadowRoot;
    root.adoptedStyleSheets = [sheet(HOST_CSS), sheet(LAYOUT_CSS), ...libCss.map(sheet), ...(this.mode === 'edit' ? [sheet(EDIT_CSS)] : [])];
    // Set tokens one by one: the host's own inline style (size, transform) must survive.
    if (this.theme) for (const [k, v] of Object.entries(themeVars(this.theme))) this.style.setProperty(k, v);
  }

  render() {
    const opts = { mode: this.mode, blocks: this.blocks, onLink: this.onLink };
    if (this.block) {
      return html`<div class="block-stage">
        <div class="mk-screen__body" style="padding:0;flex:none;background:transparent" data-wb-region=${this.mode === 'edit' ? ROOT : nothing}>
          ${renderNodes([this.block.root], opts)}
        </div>
      </div>`;
    }
    if (!this.screen) return nothing;
    return renderScreen(this.screen, opts);
  }
}
customElements.define('wb-screen-view', WbScreenView);
