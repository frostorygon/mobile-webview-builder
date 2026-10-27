import { LitElement, css, html, nothing, type TemplateResult } from 'lit';
import { styleMap } from 'lit/directives/style-map.js';
import { BLOCK_TYPE } from '../core/blocks.js';
import { insertionSlot } from '../core/actions.js';
import { dnd, type DragPayload, type DropZone } from '../core/dnd.js';
import { icon } from '../core/icons.js';
import type { DropTarget, Node } from '../core/model.js';
import { BODY, FOOTER } from '../core/model.js';
import { containerSlots, registry } from '../core/registry.js';
import { store, StoreController } from '../core/store.js';
import { ROOT, findNode, isWithin } from '../core/tree.js';
import { ui } from './styles.js';
import { nodeLabel } from './wb-canvas.js';

const ROW_H = 28;

/** Tree of the current screen. Click to select, drag to restructure precisely. */
export class WbLayers extends LitElement {
  static properties = { collapsed: { state: true }, indicator: { state: true } };
  readonly storeController = new StoreController(this);
  private collapsed = new Set<string>();
  private indicator: { top: number; left: number; inside?: { top: number; height: number } } | null = null;
  private removeZone?: () => void;

  static styles = [
    ui,
    css`
      :host {
        display: flex;
        flex-direction: column;
        min-height: 0;
        user-select: none;
      }
      .tree {
        position: relative;
        flex: 1;
        overflow-y: auto;
        padding: 6px 8px 24px;
      }
      .region {
        display: flex;
        align-items: center;
        gap: 6px;
        height: 28px;
        padding: 0 6px;
        margin-top: 8px;
      }
      .region .count {
        margin-left: auto;
        font-size: 11px;
        color: var(--c-faint);
      }
      .row {
        position: relative;
        display: flex;
        align-items: center;
        gap: 6px;
        height: ${ROW_H}px;
        border-radius: 6px;
        cursor: default;
        user-select: none;
        white-space: nowrap;
        color: var(--c-text);
      }
      .row:hover,
      .row.hovered {
        background: var(--c-hover);
      }
      .row.selected {
        background: var(--c-accent-soft);
        color: var(--c-accent-text);
      }
      .row.instance .ic {
        color: var(--c-block);
      }
      .row .tw {
        width: 16px;
        height: 16px;
        display: grid;
        place-items: center;
        flex: none;
        color: var(--c-faint);
        cursor: pointer;
        border-radius: 4px;
      }
      .row .tw:hover {
        background: rgb(0 0 0 / 0.06);
      }
      .row .ic {
        flex: none;
        display: grid;
        color: var(--c-muted);
      }
      .row.selected .ic {
        color: var(--c-accent);
      }
      .row .nm {
        font-weight: 500;
        font-size: 12.5px;
      }
      .row .sm {
        color: var(--c-faint);
        overflow: hidden;
        text-overflow: ellipsis;
        min-width: 0;
        font-size: 12px;
      }
      .row .end {
        margin-left: auto;
        padding-right: 6px;
        display: flex;
        gap: 4px;
        color: var(--c-faint);
      }
      .empty {
        padding: 6px 10px 6px 28px;
        color: var(--c-faint);
        font-size: 12px;
        font-style: italic;
      }
      .ind {
        position: absolute;
        right: 8px;
        height: 2px;
        background: var(--c-accent);
        border-radius: 2px;
        pointer-events: none;
      }
      .ind-inside {
        position: absolute;
        left: 8px;
        right: 8px;
        border: 1.5px solid var(--c-accent);
        border-radius: 6px;
        pointer-events: none;
        background: rgb(79 70 229 / 0.06);
      }
      .tip {
        margin: 12px 6px 0;
        font-size: 11.5px;
        color: var(--c-faint);
        line-height: 1.5;
      }
    `,
  ];

  connectedCallback() {
    super.connectedCallback();
    const zone: DropZone = {
      host: this,
      resolve: (e, p) => this.resolve(e, p),
      clear: () => (this.indicator = null),
    };
    this.removeZone = dnd.addZone(zone);
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    this.removeZone?.();
  }

  protected updated() {
    const sel = this.renderRoot.querySelector('.row.selected');
    if (sel && !this.matches(':hover')) (sel as HTMLElement).scrollIntoView({ block: 'nearest' });
  }

  private resolve(e: PointerEvent, payload: DragPayload): DropTarget | null {
    const tree = this.renderRoot.querySelector('.tree') as HTMLElement;
    const row = e.composedPath().find((x) => x instanceof HTMLElement && (x.dataset.rowId || x.dataset.regionId || x.dataset.slotParent)) as HTMLElement | undefined;
    if (!row || !tree) return (this.indicator = null);
    const doc = store.doc;
    const tRect = tree.getBoundingClientRect();
    const r = row.getBoundingClientRect();
    const top = r.top - tRect.top + tree.scrollTop;
    const moving = payload.kind === 'move' ? payload.nodeId : null;

    if (row.dataset.slotParent) {
      const parentId = row.dataset.slotParent;
      if (moving && isWithin(doc, moving, parentId)) return (this.indicator = null);
      this.indicator = { top: 0, left: 0, inside: { top, height: r.height } };
      return { parentId, slot: row.dataset.slotName!, index: Infinity };
    }

    if (row.dataset.regionId) {
      const region = row.dataset.regionId;
      if (region === ROOT) return (this.indicator = null);
      this.indicator = { top: top + r.height, left: 30 };
      return { parentId: region, slot: 'default', index: 0 };
    }

    const id = row.dataset.rowId!;
    const depth = Number(row.dataset.depth);
    const located = findNode(doc, id);
    if (!located) return (this.indicator = null);
    if (moving && isWithin(doc, moving, id)) return (this.indicator = null);
    const def = registry.get(located.node.type);
    const container = def?.container && located.node.type !== BLOCK_TYPE;
    const y = e.clientY - r.top;
    const zone = container ? (y < r.height * 0.3 ? 'before' : y > r.height * 0.7 ? 'after' : 'inside') : y < r.height / 2 ? 'before' : 'after';
    if (located.parentId === ROOT && zone !== 'inside') return (this.indicator = null);

    if (zone === 'inside') {
      this.indicator = { top: 0, left: 0, inside: { top, height: r.height } };
      return { parentId: id, slot: insertionSlot(id, def!), index: Infinity };
    }
    const left = 22 + depth * 14;
    this.indicator = { top: zone === 'before' ? top - 1 : top + r.height - 1, left };
    return { parentId: located.parentId, slot: located.slot, index: located.index + (zone === 'after' ? 1 : 0) };
  }

  private toggle(id: string, e: Event) {
    e.stopPropagation();
    const next = new Set(this.collapsed);
    next.has(id) ? next.delete(id) : next.add(id);
    this.collapsed = next;
  }

  private rows(list: Node[], depth: number): TemplateResult[] {
    const out: TemplateResult[] = [];
    for (const node of list) {
      const def = registry.get(node.type);
      const inst = node.type === BLOCK_TYPE;
      const slots = inst ? [] : containerSlots(def);
      const children = slots.flatMap((slot) => node.slots?.[slot] ?? []);
      const expandable = children.length > 0 || slots.length > 1;
      const open = !this.collapsed.has(node.id);
      const sumProp = def?.summary;
      const summary = sumProp ? String(node.props[sumProp] ?? '') : '';
      const sel = store.ui.selectedId === node.id;
      out.push(html`<div
        class="row ${sel ? 'selected' : ''} ${store.ui.hoveredId === node.id ? 'hovered' : ''} ${inst ? 'instance' : ''}"
        style=${styleMap({ paddingLeft: `${4 + depth * 14}px` })}
        data-row-id=${node.id}
        data-depth=${depth}
        @pointerdown=${(e: PointerEvent) => {
          store.select(node.id);
          const located = findNode(store.doc, node.id);
          if (located && located.parentId !== ROOT) dnd.begin(e, { kind: 'move', nodeId: node.id }, nodeLabel(node), def?.icon ?? 'box');
        }}
        @dblclick=${() => inst && store.openBlock(String(node.props.blockId))}
        @pointerenter=${() => store.hover(node.id)}
        @pointerleave=${() => store.hover(null)}
      >
        <span class="tw" @pointerdown=${(e: Event) => e.stopPropagation()} @click=${(e: Event) => expandable && this.toggle(node.id, e)}>
          ${expandable ? icon(open ? 'chevron-down' : 'chevron-right', 12) : nothing}
        </span>
        <span class="ic">${icon(inst ? 'component' : (def?.icon ?? 'box'), 14)}</span>
        <span class="nm">${nodeLabel(node)}</span>
        ${summary && summary !== nodeLabel(node) ? html`<span class="sm">${summary}</span>` : nothing}
        <span class="end">${node.link ? html`<span title="Links to another screen">${icon('link-2', 12)}</span>` : nothing}</span>
      </div>`);
      if (open) for (const slot of slots) {
        if (slots.length > 1) out.push(html`<div class="row" style="padding-left:${22 + depth * 14}px"
          data-slot-parent=${node.id} data-slot-name=${slot}
          @click=${() => { store.select(node.id); store.setUI({ insertionSlot: { nodeId: node.id, slot } }); }}>
          <span class="sm">${slot === 'default' ? 'Content (default)' : slot}</span>
        </div>`);
        out.push(...this.rows(node.slots?.[slot] ?? [], depth + 1));
      }
    }
    return out;
  }

  private region(id: string, label: string, ic: string, list: Node[]) {
    return html`<div class="region" data-region-id=${id}>
        <span class="label" style="display:flex;gap:6px;align-items:center">${icon(ic, 12)} ${label}</span>
        <span class="count">${list.length}</span>
      </div>
      ${list.length ? this.rows(list, 0) : html`<div class="empty">Empty</div>`}`;
  }

  render() {
    const doc = store.doc;
    const ind = this.indicator;
    return html`<div class="tree">
      ${store.ui.target.kind === 'block'
        ? this.region(ROOT, 'Block', 'component', doc[ROOT] ?? [])
        : html`${this.region(BODY, 'Body', 'panel-top', doc[BODY] ?? [])} ${this.region(FOOTER, 'Footer · sticky', 'panel-bottom', doc[FOOTER] ?? [])}`}
      ${ind && !ind.inside ? html`<div class="ind" style="top:${ind.top}px;left:${ind.left}px"></div>` : nothing}
      ${ind?.inside ? html`<div class="ind-inside" style="top:${ind.inside.top}px;height:${ind.inside.height}px"></div>` : nothing}
      <div class="tip">Drag rows to reorder or nest. Drop on the middle of a container to put it inside.</div>
    </div>`;
  }
}
customElements.define('wb-layers', WbLayers);
