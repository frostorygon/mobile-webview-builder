import { nothing, type TemplateResult } from 'lit';
import { Directive, directive, PartType, type ElementPart, type PartInfo } from 'lit/directive.js';
import { ifDefined } from 'lit/directives/if-defined.js';
import { styleMap } from 'lit/directives/style-map.js';
import { html, unsafeStatic } from 'lit/static-html.js';
import { BLOCK_TYPE, resolveInstance } from './blocks.js';
import type { BlockDef, Node, Props, Screen } from './model.js';
import { BODY, FOOTER } from './model.js';
import { containerSlots, registry, type ComponentDef } from './registry.js';

/**
 * Renders node trees as real DOM via Lit. The same renderer drives the editing canvas,
 * preview mode and thumbnails, so what you see is what the generated code produces.
 *
 * In `edit` mode every selectable element gets `data-wb-id`, containers get `data-wb-dir`,
 * and regions get `data-wb-region`. The canvas uses these for selection and drop targeting.
 */

export type RenderMode = 'edit' | 'preview' | 'static';

export interface RenderOptions {
  mode: RenderMode;
  blocks: BlockDef[];
  /** Preview: navigate when a linked node is tapped. */
  onLink?: (screenId: string) => void;
}

interface Ctx {
  /** Inside a block instance: inner nodes are not individually selectable. */
  inInstance: boolean;
  /** Slot attribute required by the parent (named slots). */
  slot?: string;
  /** Id to stamp instead of the node's own (instance root). */
  idOverride?: string;
  blockPath?: string[];
}

/** Position props every node supports when it sits in a stack or row. */
export function positionStyle(props: Props): Record<string, string> {
  const s: Record<string, string> = {};
  if (props.$grow) s.flex = '1 1 0';
  if (props.$align && props.$align !== 'auto') s['align-self'] = { start: 'flex-start', center: 'center', end: 'flex-end', stretch: 'stretch' }[String(props.$align)] ?? 'auto';
  return s;
}

/** Applies props to a custom element as attributes / properties. */
class PropsDirective extends Directive {
  constructor(info: PartInfo) {
    super(info);
    if (info.type !== PartType.ELEMENT) throw new Error('props() must be used on an element');
  }
  render(_def: ComponentDef, _props: Props) {
    return nothing;
  }
  update(part: ElementPart, [def, props]: [ComponentDef, Props]) {
    const el = part.element as HTMLElement & Record<string, unknown>;
    for (const p of def.props) {
      if (p.binding === 'text') continue;
      const v = props[p.name] ?? p.default ?? null;
      if (p.binding === 'property') {
        el[p.name] = v;
        continue;
      }
      const attr = p.attribute ?? p.name;
      if (p.type === 'boolean') {
        el.toggleAttribute(attr, Boolean(v));
        // Removing an attribute that was never set leaves a `true` default in place.
        if (!v) el[p.name.replace(/-([a-z])/g, (_m, c: string) => c.toUpperCase())] = false;
      }
      else if (v === null || v === undefined) el.removeAttribute(attr);
      else el.setAttribute(attr, String(v));
    }
    return nothing;
  }
}
const props = directive(PropsDirective);

export function textOf(def: ComponentDef, p: Props): string | undefined {
  const t = def.props.find((x) => x.binding === 'text');
  if (!t) return undefined;
  const v = p[t.name] ?? t.default;
  return v === null || v === undefined ? '' : String(v);
}

export function renderNodes(nodes: Node[], opts: RenderOptions, ctx: Ctx = { inInstance: false }): TemplateResult[] {
  return nodes.map((n) => renderNode(n, opts, ctx));
}

export function renderNode(node: Node, opts: RenderOptions, ctx: Ctx = { inInstance: false }): TemplateResult {
  const edit = opts.mode === 'edit';
  const selectable = edit && !ctx.inInstance;
  const id = selectable ? (ctx.idOverride ?? node.id) : undefined;

  if (node.type === BLOCK_TYPE) {
    const blockId = String(node.props.blockId);
    if (ctx.blockPath?.includes(blockId)) {
      return html`<div class="wb-missing" data-wb-id=${ifDefined(id)} slot=${ifDefined(ctx.slot)}>Circular block reference</div>`;
    }
    const resolved = resolveInstance(node, opts.blocks);
    if (!resolved) {
      return html`<div class="wb-missing" data-wb-id=${ifDefined(id)}>Missing block</div>`;
    }
    // The instance's own position props and link win over the master's.
    resolved.props = { ...resolved.props, $grow: node.props.$grow ?? resolved.props.$grow, $align: node.props.$align ?? resolved.props.$align };
    resolved.link = node.link ?? resolved.link;
    return renderNode(resolved, opts, { inInstance: true, slot: ctx.slot, idOverride: ctx.inInstance ? undefined : id, blockPath: [...(ctx.blockPath ?? []), blockId] });
  }

  // An instance root keeps the instance id so the whole block selects as one.
  const stampId = ctx.idOverride ?? id;
  const def = registry.get(node.type);
  if (!def) {
    return html`<div class="wb-missing" data-wb-id=${ifDefined(stampId)} slot=${ifDefined(ctx.slot)}>
      Unknown component <code>${node.type}</code>
    </div>`;
  }
  registry.ensure(def);

  const link = opts.mode === 'preview' && node.link && opts.onLink ? () => opts.onLink!(node.link!) : undefined;
  const slots = containerSlots(def);
  const kids = slots.flatMap((slot) => renderNodes(node.slots?.[slot] ?? [], opts, {
    inInstance: ctx.inInstance, slot: slot === 'default' ? undefined : slot, blockPath: ctx.blockPath,
  }));
  const dir = selectable && def.container ? def.container.direction : undefined;
  const empty = selectable && def.container && !textOf(def, node.props) && !slots.some((slot) => node.slots?.[slot]?.length) ? '' : undefined;
  const linked = edit && node.link ? '' : undefined;

  if (def.native) {
    const tag = unsafeStatic(def.native.tag);
    const style = { ...def.native.style?.(node.props), ...positionStyle(node.props), ...(link ? { cursor: 'pointer' } : {}) };
    const title = def.native.title?.(node.props);
    return html`<${tag}
      class=${def.native.className(node.props)}
      style=${styleMap(style)}
      slot=${ifDefined(ctx.slot)}
      data-wb-id=${ifDefined(stampId)}
      data-wb-dir=${ifDefined(dir)}
      data-wb-empty=${ifDefined(empty)}
      data-wb-linked=${ifDefined(linked)}
      @click=${link}
    >${title ? html`<h3 class="l-section__title">${title}</h3>` : nothing}${kids}</${tag}>`;
  }

  const tag = unsafeStatic(def.tag);
  const text = textOf(def, node.props);
  const style = { ...positionStyle(node.props), ...(link ? { cursor: 'pointer' } : {}) };
  return html`<${tag}
    ${props(def, node.props)}
    style=${styleMap(style)}
    slot=${ifDefined(ctx.slot)}
    data-wb-id=${ifDefined(stampId)}
    data-wb-dir=${ifDefined(dir)}
    data-wb-empty=${ifDefined(empty)}
    data-wb-linked=${ifDefined(linked)}
    @click=${link}
  >${text ?? nothing}${kids}</${tag}>`;
}

/** Renders a whole screen: optional web header, scrollable body and sticky footer. */
export function renderScreen(screen: Screen, opts: RenderOptions): TemplateResult {
  const s = screen.settings;
  const edit = opts.mode === 'edit';
  const header =
    s.navBar === 'web'
      ? html`<header class="mk-screen__header">
          <span>${s.leading !== 'none' ? html`<button class="mk-screen__nav-btn" aria-label=${s.leading}>${navGlyph(s.leading)}</button>` : nothing}</span>
          <div class="mk-screen__title">${s.title}</div>
          <span>${s.trailing !== 'none' ? html`<button class="mk-screen__nav-btn" aria-label=${s.trailing}>${navGlyph(s.trailing)}</button>` : nothing}</span>
        </header>`
      : nothing;
  const showFooter = screen.footer.length > 0 || edit;
  return html`<div class="mk-screen ${s.background === 'subtle' ? 'mk-screen--subtle' : ''}">
    ${header}
    <main
      class="mk-screen__body ${s.bodyAlign === 'center' ? 'mk-screen__body--center' : ''}"
      data-wb-region=${ifDefined(edit ? BODY : undefined)}
      data-wb-dir=${ifDefined(edit ? 'vertical' : undefined)}
      data-wb-empty=${ifDefined(edit && screen.body.length === 0 ? '' : undefined)}
    >${renderNodes(screen.body, opts)}</main>
    ${showFooter
      ? html`<footer
          class="mk-screen__footer"
          data-wb-region=${ifDefined(edit ? FOOTER : undefined)}
          data-wb-dir=${ifDefined(edit ? 'vertical' : undefined)}
          data-wb-empty=${ifDefined(edit && screen.footer.length === 0 ? '' : undefined)}
        >${renderNodes(screen.footer, opts)}</footer>`
      : nothing}
  </div>`;
}

const GLYPH: Record<string, string> = {
  back: 'M15 18l-6-6 6-6',
  close: 'M18 6L6 18M6 6l12 12',
  help: 'M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3M12 17h.01',
  more: 'M12 12h.01M19 12h.01M5 12h.01',
};

export function navGlyph(kind: string) {
  return html`<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
    ${kind === 'help' ? html`<circle cx="12" cy="12" r="10"></circle>` : nothing}
    <path d=${GLYPH[kind] ?? ''}></path>
  </svg>`;
}

/** CSS that only applies while editing: empty-container drop hints, link markers. */
export const EDIT_CSS = `
[data-wb-empty] { min-height: 64px; outline: 1.5px dashed color-mix(in srgb, #6366F1 45%, transparent); outline-offset: -1.5px; border-radius: 8px; position: relative; }
[data-wb-empty]::after { content: 'Drop components here'; position: absolute; inset: 0; display: grid; place-items: center; font: 500 12px/1 system-ui, sans-serif; color: color-mix(in srgb, #6366F1 70%, #555); pointer-events: none; }
.mk-screen__footer[data-wb-empty] { min-height: 56px; margin: 0 var(--mk-space-m) var(--mk-space-m); }
.mk-screen__footer[data-wb-empty]::after { content: 'Footer: drop sticky actions here'; }
.mk-screen__body[data-wb-empty]::after { content: 'Drag components from the left, or click one to add it'; }
.wb-missing { padding: 12px; border: 1px dashed #d70000; color: #d70000; font: 12px system-ui; border-radius: 6px; }
`;
