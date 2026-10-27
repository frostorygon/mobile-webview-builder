import { LitElement, css, html, nothing } from 'lit';
import * as actions from '../core/actions.js';
import { dnd } from '../core/dnd.js';
import { icon } from '../core/icons.js';
import { DEVICES, store, StoreController, type DeviceId } from '../core/store.js';
import { ui } from './styles.js';
import './wb-canvas.js';
import './wb-dialogs.js';
import './wb-inspector.js';
import './wb-layers.js';
import './wb-palette.js';
import type { WbPalette } from './wb-palette.js';
import './wb-screens.js';

const ZOOMS = [0, 0.5, 0.75, 1, 1.25];

/** App shell: top bar, palette/layers, canvas with screen strip, inspector, dialogs. */
export class WbApp extends LitElement {
  readonly storeController = new StoreController(this);

  static styles = [
    ui,
    css`
      :host {
        display: grid;
        grid-template-rows: 52px 1fr;
        height: 100vh;
        background: var(--c-bg);
      }
      .top {
        display: flex;
        align-items: center;
        gap: 10px;
        padding: 0 12px;
        background: var(--c-panel);
        border-bottom: 1px solid var(--c-line);
        min-width: 0;
      }
      .brand {
        display: flex;
        align-items: center;
        gap: 10px;
        min-width: 0;
        width: 268px;
      }
      .logo {
        width: 30px;
        height: 30px;
        border-radius: 8px;
        display: grid;
        place-items: center;
        background: linear-gradient(135deg, #1d2330, #3b3f8f);
        color: #fff;
        flex: none;
      }
      .proj {
        display: flex;
        flex-direction: column;
        min-width: 0;
      }
      .proj input {
        border: 0;
        height: 22px;
        padding: 0 4px;
        margin-left: -4px;
        font-weight: 650;
        font-size: 13.5px;
        background: transparent;
        width: 200px;
      }
      .proj input:hover {
        background: var(--c-hover);
      }
      .proj input:focus {
        background: #fff;
        box-shadow: 0 0 0 2px rgb(79 70 229 / 0.2);
      }
      .proj small {
        font-size: 11px;
        color: var(--c-faint);
        display: flex;
        align-items: center;
        gap: 4px;
      }
      .center {
        flex: 1;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 10px;
        min-width: 0;
      }
      .center select {
        width: auto;
        height: 30px;
      }
      .mode {
        width: 190px;
      }
      .right {
        display: flex;
        align-items: center;
        gap: 4px;
      }
      .sep {
        width: 1px;
        height: 22px;
        background: var(--c-line);
        margin: 0 4px;
      }
      .main {
        display: grid;
        grid-template-columns: 280px 1fr 300px;
        min-height: 0;
      }
      .main.preview {
        grid-template-columns: 0 1fr 0;
      }
      .main.preview .left,
      .main.preview .right-panel {
        visibility: hidden;
      }
      .left,
      .right-panel {
        background: var(--c-panel);
        display: flex;
        flex-direction: column;
        min-height: 0;
        overflow: hidden;
      }
      .left {
        border-right: 1px solid var(--c-line);
      }
      .right-panel {
        border-left: 1px solid var(--c-line);
      }
      .left-tabs {
        display: flex;
        gap: 2px;
        padding: 8px 10px 0;
      }
      .left-tabs button {
        height: 30px;
        padding: 0 10px;
        border: 0;
        border-bottom: 2px solid transparent;
        background: none;
        cursor: pointer;
        font-weight: 600;
        color: var(--c-muted);
        display: inline-flex;
        align-items: center;
        gap: 6px;
      }
      .left-tabs button.on {
        color: var(--c-text);
        border-bottom-color: var(--c-text);
      }
      .left > :not(.left-tabs) {
        flex: 1;
        min-height: 0;
        border-top: 1px solid var(--c-line);
      }
      .center-col {
        display: flex;
        flex-direction: column;
        min-width: 0;
        min-height: 0;
      }
      wb-canvas {
        flex: 1;
        min-height: 0;
      }
      .block-banner {
        display: flex;
        align-items: center;
        gap: 10px;
        padding: 8px 14px;
        background: #f5f3ff;
        border-bottom: 1px solid #ede9fe;
        color: #5b21b6;
        font-weight: 500;
      }
      .block-banner .bb-text {
        min-width: 0;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
      .block-banner .btn {
        margin-left: auto;
        flex: none;
      }
      @media (max-width: 1180px) {
        .main {
          grid-template-columns: 236px 1fr 272px;
        }
        .brand {
          width: auto;
        }
        .proj small,
        .hide-narrow {
          display: none;
        }
        .proj input {
          width: 130px;
        }
        .mode {
          width: auto;
        }
      }
      .toast {
        position: fixed;
        left: 50%;
        bottom: 190px;
        transform: translateX(-50%);
        z-index: 200;
        padding: 9px 14px;
        border-radius: 10px;
        background: #1d2330;
        color: #fff;
        font-weight: 500;
        box-shadow: 0 10px 30px rgb(15 23 42 / 0.3);
        animation: up 0.18s ease-out;
        max-width: 80vw;
      }
      @keyframes up {
        from {
          transform: translate(-50%, 8px);
          opacity: 0;
        }
      }
    `,
  ];

  connectedCallback() {
    super.connectedCallback();
    window.addEventListener('keydown', this.onKey);
    dnd.onDrop((payload, target) => actions.drop(payload, target));
    this.addEventListener('save-block', () => store.setUI({ dialog: 'save-block' }));
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    window.removeEventListener('keydown', this.onKey);
  }

  private onKey = (e: KeyboardEvent) => {
    const path = e.composedPath();
    const typing = path.some((el) => el instanceof HTMLElement && (el.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(el.tagName)));
    if (typing || store.ui.dialog) return;
    const mod = e.ctrlKey || e.metaKey;
    const k = e.key.toLowerCase();
    const edit = store.ui.mode === 'edit';
    const handled = () => e.preventDefault();

    if (mod && k === 'z') return handled(), e.shiftKey ? store.redo() : store.undo();
    if (mod && k === 'y') return handled(), store.redo();
    if (k === 'p' && !mod) return handled(), store.setUI({ mode: edit ? 'preview' : 'edit', selectedId: null });
    if (k === '/' && !mod) return handled(), store.setUI({ leftTab: 'components' }), this.updateComplete.then(() => (this.renderRoot.querySelector('wb-palette') as WbPalette | null)?.focusSearch());
    if (k === '?' ) return handled(), store.setUI({ dialog: 'shortcuts' });
    if ((k === '[' || k === ']') && !mod) {
      const screens = store.project.screens;
      const i = screens.findIndex((s) => s.id === store.screen?.id);
      const next = screens[i + (k === ']' ? 1 : -1)];
      if (next) store.openScreen(next.id);
      return handled();
    }
    if (!edit) return;
    if (k === 'escape') return handled(), store.ui.selectedId ? actions.selectParent() : store.ui.target.kind === 'block' && store.closeBlock();
    if (k === 'delete' || k === 'backspace') return handled(), actions.removeSelected();
    if (mod && k === 'd') return handled(), actions.duplicateSelected();
    if (mod && k === 'c') return actions.copySelected() && handled();
    if (mod && k === 'v') return handled(), actions.paste();
    if (e.altKey && (k === 'arrowup' || k === 'arrowdown')) return handled(), actions.nudgeSelected(k === 'arrowup' ? -1 : 1);
  };

  render() {
    const { ui, project } = store;
    const edit = ui.mode === 'edit';
    const block = store.block;
    return html`
      <div class="top">
        <div class="brand">
          <span class="logo">${icon('smartphone', 16)}</span>
          <div class="proj">
            <input type="text" .value=${project.name} title="Project name" @input=${(e: Event) => store.update((p) => void (p.name = (e.target as HTMLInputElement).value), 'project-name')} />
            <small>
              ${icon(ui.storage === 'repo' ? 'hard-drive' : 'globe', 11)}
              ${ui.storage === 'repo' ? 'Saved to builder-data/ in the repo' : 'Saved in this browser'}
            </small>
          </div>
        </div>
        <div class="center">
          <div class="seg mode">
            <button class=${edit ? 'on' : ''} @click=${() => store.setUI({ mode: 'edit' })}>${icon('pencil', 13)} Design</button>
            <button class=${!edit ? 'on' : ''} @click=${() => store.setUI({ mode: 'preview', selectedId: null })}>${icon('play', 13)} Preview</button>
          </div>
          <select title="Device" @change=${(e: Event) => store.setUI({ device: (e.target as HTMLSelectElement).value as DeviceId })}>
            ${Object.entries(DEVICES).map(([id, d]) => html`<option value=${id} ?selected=${ui.device === id}>${d.label}</option>`)}
          </select>
          <select title="Zoom" @change=${(e: Event) => store.setUI({ zoom: Number((e.target as HTMLSelectElement).value) })}>
            ${ZOOMS.map((z) => html`<option value=${z} ?selected=${ui.zoom === z}>${z === 0 ? 'Fit' : `${Math.round(z * 100)}%`}</option>`)}
          </select>
        </div>
        <div class="right">
          <button class="icon-btn" title="Undo (Ctrl+Z)" ?disabled=${!store.canUndo} @click=${() => store.undo()}>${icon('undo-2', 17)}</button>
          <button class="icon-btn" title="Redo (Ctrl+Shift+Z)" ?disabled=${!store.canRedo} @click=${() => store.redo()}>${icon('redo-2', 17)}</button>
          <span class="sep"></span>
          <button class="icon-btn" title="Keyboard shortcuts (?)" @click=${() => store.setUI({ dialog: 'shortcuts' })}>${icon('keyboard', 17)}</button>
          <button class="btn ghost" @click=${() => store.setUI({ dialog: 'libraries' })}>${icon('library', 15)}<span class="hide-narrow">Libraries</span></button>
          <button class="btn primary" @click=${() => store.setUI({ dialog: 'export' })}>${icon('code', 15)}<span class="hide-narrow">Export</span></button>
        </div>
      </div>
      <div class="main ${edit ? '' : 'preview'}">
        <aside class="left">
          <div class="left-tabs">
            <button class=${ui.leftTab === 'components' ? 'on' : ''} @click=${() => store.setUI({ leftTab: 'components' })}>${icon('blocks', 14)} Components</button>
            <button class=${ui.leftTab === 'layers' ? 'on' : ''} @click=${() => store.setUI({ leftTab: 'layers' })}>${icon('layers', 14)} Layers</button>
          </div>
          ${ui.leftTab === 'components' ? html`<wb-palette></wb-palette>` : html`<wb-layers></wb-layers>`}
        </aside>
        <div class="center-col">
          ${block
            ? html`<div class="block-banner">
                ${icon('component', 16)}
                <span class="bb-text">Editing block <b>${block.name}</b><span class="hide-narrow">. Changes apply everywhere it's used.</span></span>
                <button class="btn sm primary" @click=${() => store.closeBlock()}>${icon('check', 13)} Done</button>
              </div>`
            : nothing}
          <wb-canvas></wb-canvas>
          <wb-screens></wb-screens>
        </div>
        <aside class="right-panel"><wb-inspector></wb-inspector></aside>
      </div>
      <wb-dialogs></wb-dialogs>
      ${ui.toast ? html`<div class="toast" role="status">${ui.toast}</div>` : nothing}
    `;
  }
}
customElements.define('wb-app', WbApp);
