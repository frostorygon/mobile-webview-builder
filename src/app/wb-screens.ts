import { LitElement, css, html, nothing } from 'lit';
import * as actions from '../core/actions.js';
import { icon } from '../core/icons.js';
import { DEVICES, store, StoreController } from '../core/store.js';
import { ui } from './styles.js';
import './wb-screen-view.js';

const THUMB_W = 78;

/** Filmstrip of all screens with live thumbnails. */
export class WbScreens extends LitElement {
  static properties = { renaming: { state: true } };
  readonly storeController = new StoreController(this);
  private renaming: string | null = null;

  static styles = [
    ui,
    css`
      :host {
        display: block;
        user-select: none;
        background: var(--c-panel);
        border-top: 1px solid var(--c-line);
      }
      .strip {
        display: flex;
        gap: 14px;
        padding: 10px 16px 8px;
        overflow-x: auto;
        align-items: flex-start;
      }
      .item {
        flex: none;
        width: ${THUMB_W + 8}px;
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 5px;
        cursor: pointer;
        position: relative;
      }
      .thumb {
        width: ${THUMB_W}px;
        height: 128px;
        border-radius: 10px;
        overflow: clip; /* not a scroll container, so sticky footers stay put */
        position: relative;
        border: 1px solid var(--c-line);
        background: #fff;
        box-shadow: 0 1px 2px rgb(16 24 40 / 0.06);
        transition: box-shadow 0.15s, border-color 0.15s;
      }
      .item:hover .thumb {
        border-color: var(--c-line-strong);
        box-shadow: 0 4px 12px rgb(16 24 40 / 0.1);
      }
      .item.on .thumb {
        border-color: var(--c-accent);
        box-shadow: 0 0 0 2px var(--c-accent);
      }
      .thumb wb-screen-view {
        position: absolute;
        top: 0;
        left: 0;
        transform-origin: top left;
        pointer-events: none;
      }
      .name {
        font-size: 11.5px;
        font-weight: 500;
        max-width: 100%;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
        color: var(--c-muted);
      }
      .item.on .name {
        color: var(--c-text);
        font-weight: 600;
      }
      .name-input {
        height: 22px;
        font-size: 11.5px;
        padding: 0 4px;
        width: ${THUMB_W + 8}px;
      }
      .tools {
        position: absolute;
        top: 4px;
        right: 4px;
        display: none;
        flex-direction: column;
        gap: 2px;
        z-index: 2;
      }
      .item:hover .tools {
        display: flex;
      }
      .tools button {
        all: unset;
        width: 20px;
        height: 20px;
        display: grid;
        place-items: center;
        border-radius: 5px;
        background: rgb(29 35 48 / 0.82);
        color: #fff;
        cursor: pointer;
      }
      .tools button:hover {
        background: #1d2330;
      }
      .add .thumb {
        display: grid;
        place-items: center;
        border-style: dashed;
        color: var(--c-muted);
        background: #fafbfc;
        box-shadow: none;
      }
      .add:hover .thumb {
        color: var(--c-accent);
        border-color: var(--c-accent);
      }
      .num {
        position: absolute;
        left: 5px;
        bottom: 4px;
        font-size: 10px;
        font-weight: 600;
        color: var(--c-faint);
        background: rgb(255 255 255 / 0.9);
        border-radius: 4px;
        padding: 0 4px;
      }
    `,
  ];

  render() {
    const { project, ui } = store;
    const dev = DEVICES[ui.device];
    const scale = THUMB_W / dev.width;
    const activeId = ui.target.kind === 'screen' ? ui.target.id : ui.returnTo;
    return html`<div class="strip">
      ${project.screens.map(
        (s, i) => html`<div class="item ${s.id === activeId ? 'on' : ''}" @click=${() => store.openScreen(s.id)} title="${s.name}. Double-click the name to rename.">
          <div class="thumb">
            <wb-screen-view
              style="width:${dev.width}px;height:${dev.height}px;transform:scale(${scale})"
              .screen=${s}
              .blocks=${project.blocks}
              .theme=${project.theme}
              mode="static"
            ></wb-screen-view>
            <span class="num">${i + 1}</span>
          </div>
          <div class="tools" @click=${(e: Event) => e.stopPropagation()}>
            <button title="Duplicate" @click=${() => actions.duplicateScreen(s.id)}>${icon('copy', 11)}</button>
            ${i > 0 ? html`<button title="Move left" @click=${() => actions.moveScreen(s.id, -1)}>${icon('arrow-left', 11)}</button>` : nothing}
            ${i < project.screens.length - 1 ? html`<button title="Move right" @click=${() => actions.moveScreen(s.id, 1)}>${icon('arrow-right', 11)}</button>` : nothing}
            <button title="Delete" @click=${() => actions.deleteScreen(s.id)}>${icon('trash-2', 11)}</button>
          </div>
          ${this.renaming === s.id
            ? html`<input
                class="name-input"
                type="text"
                .value=${s.name}
                @click=${(e: Event) => e.stopPropagation()}
                @input=${(e: Event) => actions.renameScreen(s.id, (e.target as HTMLInputElement).value)}
                @keydown=${(e: KeyboardEvent) => {
                  e.stopPropagation();
                  if (e.key === 'Enter' || e.key === 'Escape') this.renaming = null;
                }}
                @blur=${() => (this.renaming = null)}
              />`
            : html`<div class="name" @dblclick=${() => this.startRename(s.id)}>${s.name}</div>`}
        </div>`,
      )}
      <div class="item add" @click=${() => store.setUI({ dialog: 'new-screen' })} title="New screen from a template">
        <div class="thumb">${icon('plus', 22)}</div>
        <div class="name">New screen</div>
      </div>
    </div>`;
  }

  protected updated() {
    this.renderRoot.querySelector('.item.on')?.scrollIntoView({ block: 'nearest', inline: 'nearest' });
  }

  private async startRename(id: string) {
    this.renaming = id;
    await this.updateComplete;
    const input = this.renderRoot.querySelector<HTMLInputElement>('.name-input');
    input?.focus();
    input?.select();
  }
}
customElements.define('wb-screens', WbScreens);
