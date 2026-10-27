import type { ComponentDef, LibraryDef, PropDef, PropOption } from '../../core/registry.js';
import { opts } from '../../core/registry.js';

/**
 * Mobile kit: a small Lit component set in the style of simple, uniform in-app screens.
 * It stands in for ing-web in this repo. Each def maps builder props onto the element's
 * attributes, and `importPath` is what generated code imports.
 */

const load = () => import('./components.js');

const tone = (values: string[], def: string): PropDef => ({ name: 'tone', type: 'select', options: opts(...values), default: def, group: 'style' });
const align = (def = 'start', values = ['start', 'center', 'end']): PropDef => ({
  name: 'align',
  type: 'select',
  options: values.map((v): PropOption => ({ value: v, icon: `align-${v === 'start' ? 'left' : v === 'end' ? 'right' : 'center'}` })),
  default: def,
  group: 'style',
});

/** Elements that share a module file. */
const MODULE: Record<string, string> = {
  divider: 'misc', badge: 'misc', link: 'misc', spinner: 'misc', steps: 'misc', checkbox: 'misc',
  amount: 'banking', 'account-card': 'banking', image: 'banking',
};

const kit = (name: string, def: Omit<ComponentDef, 'type' | 'library' | 'tag' | 'importPath' | 'load'>): ComponentDef => ({
  type: `kit/${name}`,
  library: 'kit',
  tag: `mk-${name}`,
  importPath: `../../src/libraries/mobile-kit/mk-${MODULE[name] ?? name}.js`,
  load,
  ...def,
});

const components: ComponentDef[] = [
  kit('heading', {
    label: 'Heading',
    icon: 'heading',
    category: 'Text',
    description: 'Screen or section title.',
    inlineEdit: 'text',
    summary: 'text',
    props: [
      { name: 'text', type: 'text', binding: 'text', default: 'Heading', group: 'content' },
      { name: 'size', type: 'select', options: opts('xl', 'l', 'm', 's'), default: 'l', group: 'style' },
      align(),
      { name: 'tone', type: 'select', options: opts('default', 'muted', 'primary'), default: 'default', group: 'style' },
    ],
  }),
  kit('text', {
    label: 'Text',
    icon: 'text',
    category: 'Text',
    description: 'Paragraph or supporting copy.',
    inlineEdit: 'text',
    summary: 'text',
    props: [
      { name: 'text', type: 'textarea', binding: 'text', default: 'Supporting text that explains what is going on.', group: 'content' },
      { name: 'variant', type: 'select', options: opts('body', 'small', 'caption'), default: 'body', group: 'style' },
      tone(['default', 'muted', 'accent', 'success', 'error'], 'default'),
      align(),
      { name: 'weight', type: 'select', options: opts('regular', 'bold'), default: 'regular', group: 'style' },
    ],
  }),
  kit('icon', {
    label: 'Icon',
    icon: 'smile',
    category: 'Media',
    summary: 'name',
    props: [
      { name: 'name', label: 'Icon', type: 'icon', default: 'star', group: 'content' },
      { name: 'size', type: 'select', options: opts('s', 'm', 'l', 'xl'), default: 'm', group: 'style' },
      tone(['default', 'primary', 'accent', 'muted', 'success', 'warning', 'error'], 'primary'),
    ],
  }),
  kit('icon-badge', {
    label: 'Icon badge',
    icon: 'circle-dot',
    category: 'Media',
    description: 'Icon in a tinted circle, the hero of status screens.',
    summary: 'icon',
    props: [
      { name: 'icon', type: 'icon', default: 'download', group: 'content' },
      { name: 'size', type: 'select', options: opts('m', 'l', 'xl'), default: 'xl', group: 'style' },
      tone(['primary', 'accent', 'success', 'warning', 'error', 'neutral'], 'accent'),
    ],
  }),
  kit('image', {
    label: 'Image',
    icon: 'image',
    category: 'Media',
    props: [
      { name: 'src', label: 'Image URL', type: 'image', default: '', placeholder: 'https://… (empty = placeholder)', group: 'content' },
      { name: 'alt', label: 'Alt text', type: 'text', default: '', group: 'content' },
      { name: 'ratio', type: 'select', options: opts('16/9', '4/3', '1/1', '3/1'), default: '16/9', group: 'style' },
      { name: 'rounded', type: 'boolean', default: true, group: 'style' },
    ],
  }),
  kit('button', {
    label: 'Button',
    icon: 'mouse-pointer-click',
    category: 'Actions',
    description: 'Primary, secondary or link action.',
    inlineEdit: 'label',
    summary: 'label',
    props: [
      { name: 'label', type: 'text', binding: 'text', default: 'Continue', group: 'content' },
      { name: 'variant', type: 'select', options: opts('primary', 'secondary', 'tertiary', 'link'), default: 'primary', group: 'style' },
      { name: 'block', label: 'Full width', type: 'boolean', default: true, group: 'style' },
      { name: 'icon', type: 'icon', default: '', group: 'content' },
      { name: 'disabled', type: 'boolean', default: false, group: 'behavior' },
    ],
  }),
  kit('link', {
    label: 'Link',
    icon: 'link',
    category: 'Actions',
    inlineEdit: 'label',
    summary: 'label',
    props: [
      { name: 'label', type: 'text', binding: 'text', default: 'Learn more', group: 'content' },
      { name: 'icon', label: 'Trailing icon', type: 'icon', default: 'chevron-right', group: 'content' },
      align('start', ['start', 'center']),
    ],
  }),
  kit('note', {
    label: 'Note',
    icon: 'info',
    category: 'Feedback',
    description: 'Inline message: tip, release note, warning.',
    inlineEdit: 'text',
    summary: 'text',
    props: [
      { name: 'text', type: 'textarea', binding: 'text', default: 'Helpful information about this step.', group: 'content' },
      { name: 'heading', label: 'Title', type: 'text', default: '', group: 'content' },
      tone(['neutral', 'info', 'success', 'warning', 'error'], 'neutral'),
      { name: 'icon', label: 'Show icon', type: 'boolean', default: false, group: 'style' },
      align('start', ['start', 'center']),
    ],
  }),
  kit('badge', {
    label: 'Badge',
    icon: 'tag',
    category: 'Feedback',
    inlineEdit: 'text',
    summary: 'text',
    props: [
      { name: 'text', type: 'text', binding: 'text', default: 'New', group: 'content' },
      tone(['primary', 'accent', 'success', 'warning', 'error', 'neutral'], 'accent'),
    ],
  }),
  kit('spinner', {
    label: 'Spinner',
    icon: 'loader',
    category: 'Feedback',
    props: [
      { name: 'size', type: 'select', options: opts('s', 'm', 'l'), default: 'm', group: 'style' },
      { name: 'label', type: 'text', default: 'Loading…', group: 'content' },
    ],
  }),
  kit('steps', {
    label: 'Step progress',
    icon: 'list-ordered',
    category: 'Feedback',
    props: [
      { name: 'current', type: 'number', default: 1, group: 'content' },
      { name: 'total', type: 'number', default: 3, group: 'content' },
      { name: 'label', label: 'Show label', type: 'boolean', default: true, group: 'style' },
    ],
  }),
  kit('list-item', {
    label: 'List item',
    icon: 'rows-3',
    category: 'Lists',
    description: 'Tappable row for menus and settings.',
    inlineEdit: 'heading',
    summary: 'heading',
    props: [
      { name: 'heading', label: 'Title', type: 'text', default: 'List item', group: 'content' },
      { name: 'subtitle', type: 'text', default: '', group: 'content' },
      { name: 'icon', type: 'icon', default: '', group: 'content' },
      { name: 'trailing', type: 'select', options: opts('chevron', 'value', 'switch', 'check', 'none'), default: 'chevron', group: 'style' },
      { name: 'value', type: 'text', default: '', group: 'content', when: (p) => p.trailing === 'value' || p.trailing === 'chevron' },
      { name: 'checked', type: 'boolean', default: false, group: 'behavior', when: (p) => p.trailing === 'switch' || p.trailing === 'check' },
      { name: 'divider', type: 'boolean', default: true, group: 'style' },
    ],
  }),
  kit('divider', {
    label: 'Divider',
    icon: 'separator-horizontal',
    category: 'Lists',
    props: [{ name: 'inset', type: 'boolean', default: false, group: 'style' }],
  }),
  kit('input', {
    label: 'Text field',
    icon: 'text-cursor-input',
    category: 'Forms',
    inlineEdit: 'label',
    summary: 'label',
    props: [
      { name: 'label', type: 'text', default: 'Label', group: 'content' },
      { name: 'placeholder', type: 'text', default: '', group: 'content' },
      { name: 'helpText', label: 'Help text', attribute: 'help-text', type: 'text', default: '', group: 'content' },
      { name: 'type', type: 'select', options: opts('text', 'email', 'tel', 'number', 'password'), default: 'text', group: 'behavior' },
      { name: 'error', label: 'Error message', type: 'text', default: '', group: 'behavior' },
    ],
  }),
  kit('checkbox', {
    label: 'Checkbox',
    icon: 'square-check',
    category: 'Forms',
    inlineEdit: 'label',
    summary: 'label',
    props: [
      { name: 'label', type: 'text', default: 'I agree to the terms and conditions', group: 'content' },
      { name: 'checked', type: 'boolean', default: false, group: 'behavior' },
    ],
  }),
  kit('amount', {
    label: 'Amount',
    icon: 'euro',
    category: 'Banking',
    description: 'Large money amount.',
    summary: 'amount',
    props: [
      { name: 'amount', type: 'number', default: 250, group: 'content' },
      { name: 'currency', type: 'select', options: opts('EUR', 'USD', 'GBP', 'PLN', 'RON', 'TRY'), default: 'EUR', group: 'content' },
      { name: 'label', type: 'text', default: '', group: 'content' },
      { name: 'size', type: 'select', options: opts('m', 'l', 'xl'), default: 'l', group: 'style' },
      tone(['default', 'positive', 'negative', 'primary'], 'default'),
      align('start', ['start', 'center']),
    ],
  }),
  kit('account-card', {
    label: 'Account card',
    icon: 'landmark',
    category: 'Banking',
    summary: 'name',
    props: [
      { name: 'name', type: 'text', default: 'Current account', group: 'content' },
      { name: 'iban', label: 'IBAN', type: 'text', default: 'NL00 BANK 0123 4567 89', group: 'content' },
      { name: 'balance', type: 'number', default: 1250.5, group: 'content' },
      { name: 'currency', type: 'select', options: opts('EUR', 'USD', 'GBP'), default: 'EUR', group: 'content' },
      { name: 'icon', type: 'icon', default: 'wallet', group: 'style' },
    ],
  }),
];

export const mobileKit: LibraryDef = {
  id: 'kit',
  name: 'Mobile kit',
  description: 'Lit components for simple in-app screens. Stand-in for ing-web.',
  badge: 'Kit',
  color: '#FF6200',
  source: 'code',
  omitDefaults: true,
  components: () => components,
};
