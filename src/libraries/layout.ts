import type { ComponentDef, LibraryDef, PropDef } from '../core/registry.js';
import { opts } from '../core/registry.js';
import { space } from '../core/theme.js';

/**
 * Layout primitives. They render as plain HTML with token-based spacing (no custom
 * element), so generated code has no runtime dependency for layout.
 */

const gap = (def = 'm'): PropDef => ({ name: 'gap', type: 'space', default: def, group: 'style' });
const padding = (def = 'none'): PropDef => ({ name: 'padding', type: 'space', default: def, group: 'style' });

const ALIGN: Record<string, string> = { start: 'flex-start', center: 'center', end: 'flex-end', stretch: 'stretch' };
const JUSTIFY: Record<string, string> = { ...ALIGN, between: 'space-between' };

const stack: ComponentDef = {
  type: 'layout/stack',
  library: 'layout',
  tag: 'div',
  label: 'Stack',
  icon: 'rows-3',
  category: 'Layout',
  description: 'Places children vertically with consistent spacing.',
  keywords: ['column', 'vertical', 'group'],
  container: { slot: 'default', direction: 'vertical' },
  native: {
    tag: 'div',
    className: () => 'l-stack',
    style: (p) => ({
      gap: space(p.gap, 'm'),
      padding: space(p.padding),
      'align-items': ALIGN[String(p.align)] ?? 'stretch',
    }),
  },
  props: [gap(), padding(), { name: 'align', type: 'select', options: opts('stretch', 'start', 'center', 'end'), default: 'stretch', group: 'style' }],
};

const row: ComponentDef = {
  type: 'layout/row',
  library: 'layout',
  tag: 'div',
  label: 'Row',
  icon: 'columns-3',
  category: 'Layout',
  description: 'Places children side by side.',
  keywords: ['horizontal', 'inline', 'columns'],
  container: { slot: 'default', direction: 'horizontal' },
  native: {
    tag: 'div',
    className: (p) => (p.wrap ? 'l-row l-wrap' : 'l-row'),
    style: (p) => ({
      gap: space(p.gap, 's'),
      padding: space(p.padding),
      'align-items': ALIGN[String(p.align)] ?? 'center',
      'justify-content': JUSTIFY[String(p.justify)] ?? 'flex-start',
    }),
  },
  props: [
    gap('s'),
    { name: 'justify', type: 'select', options: opts('start', 'center', 'end', 'between'), default: 'start', group: 'style' },
    { name: 'align', type: 'select', options: opts('center', 'start', 'end', 'stretch'), default: 'center', group: 'style' },
    { name: 'wrap', type: 'boolean', default: false, group: 'style' },
    padding(),
  ],
};

const card: ComponentDef = {
  type: 'layout/card',
  library: 'layout',
  tag: 'div',
  label: 'Card',
  icon: 'square',
  category: 'Layout',
  description: 'Grouped content on a surface.',
  keywords: ['panel', 'surface', 'box', 'container'],
  container: { slot: 'default', direction: 'vertical' },
  native: {
    tag: 'div',
    className: (p) => `l-card l-card--${p.surface ?? 'subtle'}`,
    style: (p) => ({ gap: space(p.gap, 's'), padding: space(p.padding, 'm'), 'align-items': ALIGN[String(p.align)] ?? 'stretch' }),
  },
  props: [
    { name: 'surface', type: 'select', options: opts('subtle', 'outlined', 'raised', 'plain'), default: 'subtle', group: 'style' },
    gap('s'),
    padding('m'),
    { name: 'align', type: 'select', options: opts('stretch', 'start', 'center', 'end'), default: 'stretch', group: 'style' },
  ],
};

const section: ComponentDef = {
  type: 'layout/section',
  library: 'layout',
  tag: 'section',
  label: 'Section',
  icon: 'panel-top',
  category: 'Layout',
  description: 'Titled group, e.g. in settings or overviews.',
  keywords: ['group', 'title', 'fieldset'],
  inlineEdit: 'title',
  summary: 'title',
  container: { slot: 'default', direction: 'vertical' },
  native: {
    tag: 'section',
    className: () => 'l-stack l-section',
    style: (p) => ({ gap: space(p.gap, 'none') }),
    title: (p) => (p.title ? String(p.title) : undefined),
  },
  props: [{ name: 'title', type: 'text', default: 'Section title', group: 'content' }, gap('none')],
};

const spacer: ComponentDef = {
  type: 'layout/spacer',
  library: 'layout',
  tag: 'div',
  label: 'Spacer',
  icon: 'unfold-vertical',
  category: 'Layout',
  description: 'Extra space, or "fill" to push content apart.',
  summary: 'size',
  native: {
    tag: 'div',
    className: () => 'l-spacer',
    style: (p): Record<string, string> => (p.size === 'fill' ? { flex: '1 1 0' } : { 'flex-basis': space(p.size, 'm'), 'min-height': space(p.size, 'm'), 'min-width': space(p.size, 'm') }),
  },
  props: [{ name: 'size', type: 'select', options: opts('xs', 's', 'm', 'l', 'xl', 'xxl', 'fill'), default: 'l', group: 'style' }],
};

export const layoutLibrary: LibraryDef = {
  id: 'layout',
  name: 'Layout',
  description: 'Stacks, rows, cards and spacing based on design tokens.',
  badge: 'Layout',
  color: '#64748B',
  source: 'builtin',
  components: () => [stack, row, card, section, spacer],
};

/** CSS for layout primitives and the screen shell. Shared by canvas, preview and export. */
export const LAYOUT_CSS = `
.mk-screen { min-height: 100%; display: flex; flex-direction: column; background: var(--mk-color-surface); color: var(--mk-color-text); font-family: var(--mk-font-family); }
.mk-screen--subtle { background: var(--mk-color-surface-subtle); }
.mk-screen__header { display: grid; grid-template-columns: 48px 1fr 48px; align-items: center; min-height: 52px; padding: 0 var(--mk-space-xs); }
.mk-screen__title { text-align: center; font-weight: 600; font-size: calc(17px * var(--mk-font-scale)); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.mk-screen__nav-btn { all: unset; display: grid; place-items: center; width: 44px; height: 44px; color: var(--mk-color-accent); cursor: pointer; }
.mk-screen__body { flex: 1 0 auto; display: flex; flex-direction: column; gap: var(--mk-space-m); padding: var(--mk-space-l) var(--mk-space-m); }
.mk-screen__body--center { justify-content: center; }
.mk-screen__footer { position: sticky; bottom: 0; display: flex; flex-direction: column; gap: var(--mk-space-s); padding: var(--mk-space-m) var(--mk-space-m) calc(var(--mk-space-m) + env(safe-area-inset-bottom, 0px)); background: inherit; }
.l-stack { display: flex; flex-direction: column; min-width: 0; }
.l-row { display: flex; flex-direction: row; min-width: 0; }
.l-wrap { flex-wrap: wrap; }
.l-card { display: flex; flex-direction: column; border-radius: calc(var(--mk-radius) * 1.5); min-width: 0; }
.l-card--subtle { background: var(--mk-color-surface-subtle); }
.l-card--outlined { border: 1px solid var(--mk-color-border); }
.l-card--raised { background: var(--mk-color-surface); box-shadow: 0 1px 2px rgb(0 0 0 / 0.06), 0 4px 16px rgb(0 0 0 / 0.06); }
.l-section > .l-section__title { margin: 0 0 var(--mk-space-xs); font-size: calc(13px * var(--mk-font-scale)); font-weight: 600; letter-spacing: 0.04em; text-transform: uppercase; color: var(--mk-color-text-muted); }
.l-spacer { flex: none; }
`;
