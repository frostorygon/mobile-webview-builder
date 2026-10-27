import { LitElement, css, html, nothing } from 'lit';
import * as actions from '../core/actions.js';
import { countInstances } from '../core/blocks.js';
import { dnd, type DragPayload } from '../core/dnd.js';
import { icon } from '../core/icons.js';
import { registry, type ComponentDef } from '../core/registry.js';
import { store, StoreController } from '../core/store.js';
import { ui } from './styles.js';

const CATEGORY_ORDER = ['Layout', 'Text', 'Media', 'Actions', 'Feedback', 'Lists', 'Forms', 'Banking', 'Team'];

/** Component palette: search, library filter, saved blocks and all registered components. */
export class WbPalette extends LitElement {
  static properties = { query: { state: true }, library: { state: true }, collapsed: { state: true } };
  readonly storeController = new StoreController(this);
  private query = '';
  private library = 'all';
  private collapsed = new Set<string>();
  private unsub?: () => void;

  static styles = [
    ui,
    css`
      :host {
        display: flex;
        flex-direction: column;
        min-height: 0;
        user-select: none;
      }
      .top {
        padding: 10px 12px 8px;
        display: flex;
        flex-direction: column;
        gap: 8px;
        border-bottom: 1px solid var(--c-line);
      }
      .search {
        position: relative;
      }
      .search svg {
        position: absolute;
        left: 9px;
        top: 8px;
        color: var(--c-faint);
      }
      .search input {
        padding-left: 30px;
        height: 32px;
        background: var(--c-hover);
        border-color: transparent;
      }
      .search input:focus {
        background: #fff;
      }
      .libs {
        display: flex;
        gap: 4px;
        flex-wrap: wrap;
      }
      .lib {
        height: 24px;
        padding: 0 8px;
        border-radius: 999px;
        border: 1px solid var(--c-line);
        background: #fff;
        font-size: 11.5px;
        font-weight: 500;
        color: var(--c-muted);
        cursor: pointer;
        display: inline-flex;
        align-items: center;
        gap: 5px;
      }
      .lib .dot {
        width: 7px;
        height: 7px;
        border-radius: 50%;
      }
      .lib.on {
        background: var(--c-text);
        border-color: var(--c-text);
        color: #fff;
      }
      .list {
        flex: 1;
        overflow-y: auto;
        padding: 4px 12px 24px;
      }
      .cat {
        margin-top: 10px;
      }
      .cat-head {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 6px 2px;
        cursor: pointer;
        user-select: none;
      }
      .cat-head .label {
        display: flex;
        align-items: center;
        gap: 4px;
      }
      .cat-head .count {
        font-size: 11px;
        color: var(--c-faint);
      }
      .grid {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 6px;
      }
      .item {
        position: relative;
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 7px 8px;
        border-radius: 8px;
        border: 1px solid var(--c-line);
        background: #fff;
        cursor: grab;
        user-select: none;
        min-width: 0;
        transition: border-color 0.12s, box-shadow 0.12s, transform 0.12s;
      }
      .item:hover {
        border-color: #c7c9f5;
        box-shadow: 0 2px 8px rgb(79 70 229 / 0.1);
      }
      .item:active {
        cursor: grabbing;
        transform: scale(0.98);
      }
      .item .ico {
        flex: none;
        width: 26px;
        height: 26px;
        border-radius: 6px;
        display: grid;
        place-items: center;
        background: var(--c-hover);
        color: var(--c-text);
      }
      .item .name {
        font-size: 12px;
        font-weight: 500;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
      .item .libdot {
        position: absolute;
        top: 5px;
        right: 5px;
        width: 5px;
        height: 5px;
        border-radius: 50%;
      }
      .block-item {
        grid-column: span 2;
        border-color: #e9e3fb;
        background: #fbfaff;
      }
      .block-item .ico {
        background: #f1ebff;
        color: var(--c-block);
      }
      .block-item .meta {
        font-size: 11px;
        color: var(--c-faint);
      }
      .block-item .acts {
        margin-left: auto;
        display: flex;
        opacity: 0;
        transition: opacity 0.12s;
      }
      .block-item:hover .acts {
        opacity: 1;
      }
      .empty-blocks {
        grid-column: span 2;
        padding: 10px;
        border: 1px dashed #d9cdfa;
        border-radius: 8px;
        color: var(--c-muted);
        font-size: 12px;
        line-height: 1.45;
        background: #fdfcff;
      }
      .none {
        padding: 30px 8px;
        text-align: center;
        color: var(--c-muted);
      }
      .loading {
        font-size: 11.5px;
        color: var(--c-faint);
        padding: 6px 2px;
      }
    `,
  ];

  connectedCallback() {
    super.connectedCallback();
    this.unsub = registry.subscribe(() => this.requestUpdate());
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    this.unsub?.();
  }

  focusSearch() {
    this.renderRoot.querySelector<HTMLInputElement>('input')?.focus();
  }

  private start(e: PointerEvent, payload: DragPayload, label: string, ic: string) {
    dnd.begin(e, payload, label, ic);
  }

  private matchesQuery(def: ComponentDef, q: string) {
    if (!q) return true;
    const hay = [def.label, def.category, def.tag, def.description, ...(def.keywords ?? [])].join(' ').toLowerCase();
    return q.split(/\s+/).every((w) => hay.includes(w));
  }

  private toggle(cat: string) {
    const next = new Set(this.collapsed);
    next.has(cat) ? next.delete(cat) : next.add(cat);
    this.collapsed = next;
  }

  render() {
    const q = this.query.trim().toLowerCase();
    const disabled = new Set(store.project.disabledLibraries);
    const libs = registry.libraries().filter((l) => !disabled.has(l.id));
    const defs = registry
      .components()
      .filter((d) => !d.hidden && !disabled.has(d.library))
      .filter((d) => this.library === 'all' || d.library === this.library)
      .filter((d) => this.matchesQuery(d, q));

    const groups = new Map<string, ComponentDef[]>();
    for (const d of defs) {
      if (!groups.has(d.category)) groups.set(d.category, []);
      groups.get(d.category)!.push(d);
    }
    const cats = [...groups.keys()].sort((a, b) => {
      const ia = CATEGORY_ORDER.indexOf(a);
      const ib = CATEGORY_ORDER.indexOf(b);
      return (ia < 0 ? 99 : ia) - (ib < 0 ? 99 : ib) || a.localeCompare(b);
    });

    const blocks = store.project.blocks.filter((b) => !q || b.name.toLowerCase().includes(q));
    const showBlocks = this.library === 'all' || this.library === '@blocks';
    const lists = [...store.project.screens.flatMap((s) => [s.body, s.footer]), ...store.project.blocks.map((b) => [b.root])];

    return html`
      <div class="top">
        <div class="search">
          ${icon('search', 15)}
          <input
            type="search"
            placeholder="Search components…  ( / )"
            .value=${this.query}
            @input=${(e: InputEvent) => (this.query = (e.target as HTMLInputElement).value)}
            @keydown=${(e: KeyboardEvent) => e.key === 'Escape' && ((this.query = ''), (e.target as HTMLInputElement).blur())}
          />
        </div>
        <div class="libs">
          <button class="lib ${this.library === 'all' ? 'on' : ''}" @click=${() => (this.library = 'all')}>All</button>
          <button class="lib ${this.library === '@blocks' ? 'on' : ''}" @click=${() => (this.library = '@blocks')}>
            <span class="dot" style="background:var(--c-block)"></span>Blocks
          </button>
          ${libs.map(
            (l) => html`<button class="lib ${this.library === l.id ? 'on' : ''}" title=${l.description} @click=${() => (this.library = l.id)}>
              <span class="dot" style="background:${l.color}"></span>${l.badge}
            </button>`,
          )}
        </div>
      </div>
      <div class="list">
        ${showBlocks
          ? html`<div class="cat">
              <div class="cat-head" @click=${() => this.toggle('@blocks')}>
                <span class="label">${icon(this.collapsed.has('@blocks') ? 'chevron-right' : 'chevron-down', 12)} Blocks</span>
                <span class="count">${blocks.length}</span>
              </div>
              ${this.collapsed.has('@blocks')
                ? nothing
                : html`<div class="grid">
                    ${blocks.length
                      ? blocks.map((b) => {
                          const uses = countInstances(b.id, lists);
                          return html`<div
                            class="item block-item"
                            title="${b.description ?? b.name}. Drag onto a screen or click to insert. Edits to the block update every use."
                            @pointerdown=${(e: PointerEvent) => this.start(e, { kind: 'block', blockId: b.id }, b.name, 'component')}
                            @click=${() => actions.insert({ kind: 'block', blockId: b.id })}
                          >
                            <span class="ico">${icon(b.icon ?? 'component', 15)}</span>
                            <span style="min-width:0">
                              <div class="name">${b.name}</div>
                              <div class="meta">${uses} use${uses === 1 ? '' : 's'}</div>
                            </span>
                            <span class="acts">
                              <button
                                class="icon-btn sm"
                                title="Edit block"
                                @pointerdown=${(e: Event) => e.stopPropagation()}
                                @click=${(e: Event) => {
                                  e.stopPropagation();
                                  store.openBlock(b.id);
                                }}
                              >
                                ${icon('pencil', 13)}
                              </button>
                            </span>
                          </div>`;
                        })
                      : html`<div class="empty-blocks">
                          ${q ? 'No matching blocks.' : html`Select anything on the canvas and choose <b>Save as block</b> to reuse it across screens.`}
                        </div>`}
                  </div>`}
            </div>`
          : nothing}
        ${this.library !== '@blocks'
          ? cats.map((cat) => {
              const items = groups.get(cat)!;
              const closed = this.collapsed.has(cat) && !q;
              return html`<div class="cat">
                <div class="cat-head" @click=${() => this.toggle(cat)}>
                  <span class="label">${icon(closed ? 'chevron-right' : 'chevron-down', 12)} ${cat}</span>
                  <span class="count">${items.length}</span>
                </div>
                ${closed
                  ? nothing
                  : html`<div class="grid">
                      ${items.map((d) => {
                        const lib = registry.library(d.library);
                        return html`<div
                          class="item"
                          title="${d.label}${d.description ? `: ${d.description}` : ''}\n<${d.tag}> · ${lib?.name}\nDrag onto the screen, or click to insert."
                          @pointerdown=${(e: PointerEvent) => this.start(e, { kind: 'new', type: d.type }, d.label, d.icon)}
                          @click=${() => actions.insert({ kind: 'new', type: d.type })}
                          @pointerenter=${() => registry.ensure(d)}
                        >
                          <span class="ico">${icon(d.icon, 15)}</span>
                          <span class="name">${d.label}</span>
                          ${lib && lib.id !== 'layout' && lib.id !== 'kit' ? html`<span class="libdot" style="background:${lib.color}"></span>` : nothing}
                        </div>`;
                      })}
                    </div>`}
              </div>`;
            })
          : nothing}
        ${!cats.length && this.library !== '@blocks' && !blocks.length ? html`<div class="none">Nothing matches “${this.query}”.</div>` : nothing}
        ${registry.libraries().some((l) => !registry.components(l.id).length && !registry.error(l.id) && !disabled.has(l.id))
          ? html`<div class="loading">Loading libraries…</div>`
          : nothing}
      </div>
    `;
  }
}
customElements.define('wb-palette', WbPalette);
