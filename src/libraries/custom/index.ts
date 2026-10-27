import type { LibraryDef } from '../../core/registry.js';
import { opts } from '../../core/registry.js';

/**
 * Your team's own components. To add one:
 *   1. Write a Lit element in this folder (see team-promo-card.ts).
 *   2. Describe it below: tag, props and how to import it.
 * Vite hot-reloads it into the palette, and it can be used on any screen.
 */
export const customLibrary: LibraryDef = {
  id: 'custom',
  name: 'Team components',
  description: 'Components your team codes in src/libraries/custom.',
  badge: 'Team',
  color: '#7C3AED',
  source: 'code',
  omitDefaults: true,
  components: () => [
    {
      type: 'custom/promo-card',
      library: 'custom',
      tag: 'team-promo-card',
      label: 'Promo card',
      icon: 'sparkles',
      category: 'Team',
      description: 'Feature promotion with icon and call to action.',
      importPath: '../../src/libraries/custom/team-promo-card.js',
      load: () => import('./team-promo-card.js'),
      inlineEdit: 'heading',
      summary: 'heading',
      props: [
        { name: 'heading', label: 'Title', type: 'text', default: 'Save automatically', group: 'content' },
        { name: 'text', type: 'textarea', default: 'Round up every payment and put the change aside.', group: 'content' },
        { name: 'cta', label: 'Button label', type: 'text', default: 'Set up', group: 'content' },
        { name: 'icon', type: 'icon', default: 'piggy-bank', group: 'content' },
        { name: 'tone', type: 'select', options: opts('primary', 'accent'), default: 'primary', group: 'style' },
      ],
    },
    {
      type: 'custom/code-input',
      library: 'custom',
      tag: 'team-code-input',
      label: 'Code input',
      icon: 'rectangle-ellipsis',
      category: 'Team',
      description: 'One-time code entry (SMS / app confirmation).',
      importPath: '../../src/libraries/custom/team-code-input.js',
      load: () => import('./team-code-input.js'),
      inlineEdit: 'label',
      summary: 'label',
      props: [
        { name: 'label', type: 'text', default: 'Enter the code we sent you', group: 'content' },
        { name: 'length', label: 'Digits', type: 'number', default: 6, group: 'behavior' },
      ],
    },
  ],
};
