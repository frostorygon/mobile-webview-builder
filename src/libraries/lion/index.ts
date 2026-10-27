import { fromManifest, type CemManifest } from '../../core/cem.js';
import type { LibraryDef } from '../../core/registry.js';
import { opts } from '../../core/registry.js';

/**
 * Lion (@lion/ui), the foundation ing-web is built on, exposed through its Custom Elements
 * Manifest. The manifest is slimmed by `npm run manifest:lion` and loaded lazily. This file
 * is the template for an ing-web adapter: the same `fromManifest` call with ing-web's
 * manifest, tags and import paths.
 */

// Vite needs static import specifiers to bundle the define modules.
const DEFINE: Record<string, () => Promise<unknown>> = {
  'lion-button': () => import('@lion/ui/define/lion-button.js'),
  'lion-input': () => import('@lion/ui/define/lion-input.js'),
  'lion-input-amount': () => import('@lion/ui/define/lion-input-amount.js'),
  'lion-input-iban': () => import('@lion/ui/define/lion-input-iban.js'),
  'lion-input-email': () => import('@lion/ui/define/lion-input-email.js'),
  'lion-input-date': () => import('@lion/ui/define/lion-input-date.js'),
  'lion-textarea': () => import('@lion/ui/define/lion-textarea.js'),
  'lion-switch': () => import('@lion/ui/define/lion-switch.js'),
  'lion-input-stepper': () => import('@lion/ui/define/lion-input-stepper.js'),
  'lion-progress-indicator': () => import('@lion/ui/define/lion-progress-indicator.js'),
};

const field = ['label', 'help-text', 'placeholder', 'disabled', 'readonly', 'name'];

const LION_SKIN = `
lion-input, lion-input-amount, lion-input-iban, lion-input-email, lion-input-date, lion-textarea, lion-input-stepper { display: block; font-family: var(--mk-font-family); }
:is(lion-input, lion-input-amount, lion-input-iban, lion-input-email, lion-input-date, lion-textarea, lion-input-stepper) [slot='label'] { display: block; font-size: 14px; font-weight: 600; margin-bottom: 6px; color: var(--mk-color-text); }
:is(lion-input, lion-input-amount, lion-input-iban, lion-input-email, lion-input-date, lion-textarea, lion-input-stepper) [slot='help-text'] { display: block; font-size: 13px; margin-top: 6px; color: var(--mk-color-text-muted); }
:is(lion-input, lion-input-amount, lion-input-iban, lion-input-email, lion-input-date, lion-input-stepper) input, lion-textarea textarea { box-sizing: border-box; width: 100%; min-height: 48px; padding: 12px 14px; border: 1px solid var(--mk-color-border); border-radius: var(--mk-radius); font: inherit; font-size: 16px; color: var(--mk-color-text); background: var(--mk-color-surface); }
lion-button { box-sizing: border-box; display: flex; justify-content: center; min-height: 48px; padding: 12px 20px; border-radius: var(--mk-radius); background: var(--mk-color-accent); color: #fff; font-family: var(--mk-font-family); font-weight: 600; font-size: 16px; }
lion-switch { display: block; font-family: var(--mk-font-family); color: var(--mk-color-text); }
lion-progress-indicator { display: block; }
`;

export const lionLibrary: LibraryDef = {
  id: 'lion',
  name: 'Lion',
  description: 'Accessible, unstyled form components from @lion/ui. Generated from its Custom Elements Manifest.',
  badge: 'Lion',
  color: '#2E7D6B',
  source: 'code',
  // Lion is unstyled by design; ing-web adds the visual layer. This light skin keeps the
  // canvas readable. Light-DOM parts (slotted inputs, labels) are styleable from the screen.
  css: LION_SKIN,
  components: async () => {
    const manifest = (await import('./lion.manifest.json')).default as unknown as CemManifest;
    return fromManifest(manifest, {
      library: 'lion',
      category: 'Lion',
      include: Object.keys(DEFINE),
      importPath: (tag) => `@lion/ui/define/${tag}.js`,
      load: (tag) => DEFINE[tag],
      overrides: {
        'lion-button': {
          label: 'Button',
          attributes: ['disabled', 'type'],
          extraProps: [{ name: 'text', label: 'Label', type: 'text', binding: 'text', default: 'Lion button', group: 'content' }],
          propOverrides: { type: { type: 'select', options: opts('button', 'submit', 'reset'), default: 'button' } },
        },
        'lion-input': {
          label: 'Input',
          attributes: [...field, 'type'],
          propOverrides: { label: { default: 'Name' }, type: { type: 'select', options: opts('text', 'email', 'tel', 'number'), default: 'text' } },
        },
        'lion-input-amount': { label: 'Amount input', attributes: ['label', 'help-text', 'currency', 'disabled'], propOverrides: { label: { default: 'Amount' }, currency: { default: 'EUR' } } },
        'lion-input-iban': { label: 'IBAN input', attributes: field, propOverrides: { label: { default: 'IBAN' } } },
        'lion-input-email': { label: 'Email input', attributes: field, propOverrides: { label: { default: 'Email address' } } },
        'lion-input-date': { label: 'Date input', attributes: ['label', 'help-text', 'disabled'], propOverrides: { label: { default: 'Date' } } },
        'lion-textarea': { label: 'Textarea', attributes: [...field, 'rows', 'max-rows'], propOverrides: { label: { default: 'Message' } } },
        'lion-switch': { label: 'Switch', attributes: ['label', 'help-text', 'checked', 'disabled'], propOverrides: { label: { default: 'Notifications' } } },
        'lion-input-stepper': { label: 'Stepper', attributes: ['label', 'min', 'max', 'step', 'disabled'], propOverrides: { label: { default: 'Quantity' } } },
        'lion-progress-indicator': {
          label: 'Progress bar',
          icon: 'loader',
          attributes: ['value', 'max', 'aria-label'],
          propOverrides: { value: { default: 40 }, max: { default: 100 }, 'aria-label': { label: 'Accessible label', default: 'Progress' } },
        },
      },
    });
  },
};
