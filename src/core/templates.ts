import { createInstance } from './blocks.js';
import type { BlockDef, Node, Project, Screen, ScreenSettings } from './model.js';
import { defaultScreenSettings, uid } from './model.js';
import { n } from './registry.js';
import { defaultTheme } from './theme.js';

/**
 * Screen templates: starting points for the screen types most in-app flows repeat.
 * Each returns fresh nodes (new ids) so templates can be used many times.
 */

export interface ScreenTemplate {
  id: string;
  name: string;
  description: string;
  build: () => Omit<Screen, 'id'>;
}

const screen = (name: string, settings: Partial<ScreenSettings>, body: Node[], footer: Node[] = []): Omit<Screen, 'id'> => ({
  name,
  settings: { ...defaultScreenSettings(name), ...settings },
  body,
  footer,
});

const statusHero = (icon: string, tone: string, title: string, text: string) =>
  n('layout/stack', { gap: 'l', align: 'center' }, [
    n('kit/icon-badge', { icon, tone }),
    n('layout/stack', { gap: 'xs', align: 'stretch' }, [
      n('kit/heading', { text: title, size: 'm', align: 'center' }),
      n('kit/text', { text, tone: 'muted', align: 'center', variant: 'small' }),
    ]),
  ]);

export const TEMPLATES: ScreenTemplate[] = [
  {
    id: 'blank',
    name: 'Blank',
    description: 'Empty screen with a native navigation bar.',
    build: () => screen('New screen', {}, []),
  },
  {
    id: 'info',
    name: 'Info / update',
    description: 'Centered icon, title, note and one action.',
    build: () =>
      screen('Software update', { title: 'Software Update', bodyAlign: 'center', leading: 'close' }, [
        statusHero('download', 'accent', 'Pro Camera', 'Version v3.2 available'),
        n('kit/note', { text: 'Faster autofocus algorithm', align: 'center' }),
      ], [n('kit/button', { label: 'Update now' })]),
  },
  {
    id: 'success',
    name: 'Success',
    description: 'Confirmation after completing a task.',
    build: () =>
      screen('Done', { title: '', bodyAlign: 'center', leading: 'none', trailing: 'close' }, [
        statusHero('circle-check', 'success', 'All done', 'Your changes have been saved.'),
      ], [n('kit/button', { label: 'Back to overview' })]),
  },
  {
    id: 'error',
    name: 'Error',
    description: 'Something went wrong, with retry.',
    build: () =>
      screen('Error', { title: '', bodyAlign: 'center', leading: 'none', trailing: 'close' }, [
        statusHero('circle-alert', 'error', 'Something went wrong', 'Please try again in a moment. Your money is safe.'),
      ], [n('kit/button', { label: 'Try again' }), n('kit/button', { label: 'Close', variant: 'link' })]),
  },
  {
    id: 'form',
    name: 'Form',
    description: 'Step progress, title and input fields.',
    build: () =>
      screen('Form', { title: 'Personal details' }, [
        n('kit/steps', { current: 1, total: 3 }),
        n('kit/heading', { text: 'Tell us about yourself', size: 'm' }),
        n('kit/input', { label: 'Full name', placeholder: 'As shown on your ID' }),
        n('kit/input', { label: 'Email address', type: 'email', placeholder: 'name@example.com' }),
        n('kit/input', { label: 'Phone number', type: 'tel', helpText: 'We only use this for security codes.' }),
      ], [n('kit/button', { label: 'Continue' })]),
  },
  {
    id: 'list',
    name: 'Settings list',
    description: 'Grouped list items with toggles and chevrons.',
    build: () =>
      screen('Settings', { title: 'Settings', background: 'subtle' }, [
        n('layout/section', { title: 'Notifications' }, [
          n('kit/list-item', { heading: 'Push notifications', icon: 'bell', trailing: 'switch', checked: true }),
          n('kit/list-item', { heading: 'Email updates', icon: 'mail', trailing: 'switch', divider: false }),
        ]),
        n('layout/section', { title: 'Security' }, [
          n('kit/list-item', { heading: 'Biometric login', subtitle: 'Face ID', icon: 'scan-face', trailing: 'switch', checked: true }),
          n('kit/list-item', { heading: 'Change PIN', icon: 'key-round' }),
          n('kit/list-item', { heading: 'Trusted devices', icon: 'smartphone', value: '2', divider: false }),
        ]),
      ]),
  },
  {
    id: 'review',
    name: 'Review & confirm',
    description: 'Amount summary with details and confirmation.',
    build: () =>
      screen('Review', { title: 'Review transfer' }, [
        n('kit/amount', { amount: 250, label: 'You are sending', size: 'xl', align: 'center' }),
        n('layout/card', { surface: 'outlined', gap: 'none', padding: 'm' }, [
          n('kit/list-item', { heading: 'To', subtitle: 'J. de Vries · NL00 BANK 0987 6543 21', trailing: 'none' }),
          n('kit/list-item', { heading: 'From', subtitle: 'Current account', trailing: 'none' }),
          n('kit/list-item', { heading: 'Description', subtitle: 'Dinner', trailing: 'none', divider: false }),
        ]),
        n('kit/note', { text: 'The money arrives within a few seconds.', tone: 'info', icon: true }),
      ], [n('kit/button', { label: 'Confirm transfer' }), n('kit/button', { label: 'Cancel', variant: 'link' })]),
  },
  {
    id: 'loading',
    name: 'Loading',
    description: 'Waiting state with spinner.',
    build: () =>
      screen('Loading', { title: '', bodyAlign: 'center', leading: 'none', navBar: 'none' }, [n('kit/spinner', { size: 'l', label: 'One moment please…' })]),
  },
];

export function screenFromTemplate(id: string): Screen {
  const t = TEMPLATES.find((x) => x.id === id) ?? TEMPLATES[0];
  return { id: uid('s'), ...t.build() };
}

/** First-run project: a handful of screens that share blocks and one theme. */
export function seedProject(): Project {
  const statusHeader: BlockDef = {
    id: uid('b'),
    name: 'Status header',
    description: 'Icon badge with title and supporting text.',
    icon: 'circle-dot',
    root: statusHero('download', 'accent', 'Title', 'Supporting text'),
  };
  const helpLink: BlockDef = {
    id: uid('b'),
    name: 'Help link',
    description: 'Centered link to customer support.',
    icon: 'circle-help',
    root: n('kit/link', { label: 'Questions? Contact us', icon: 'chevron-right', align: 'center' }),
  };
  const [badge, texts] = statusHeader.root.slots!.default;
  const [title, subtitle] = texts.slots!.default;
  const instance = (icon: string, tone: string, t: string, s: string) => {
    const node = createInstance(statusHeader);
    node.overrides = { [badge.id]: { icon, tone }, [title.id]: { text: t }, [subtitle.id]: { text: s } };
    return node;
  };

  const sentId = uid('s');
  const reviewId = uid('s');

  const update: Screen = {
    id: uid('s'),
    name: 'Software update',
    settings: { ...defaultScreenSettings('Software Update'), bodyAlign: 'center', leading: 'close' },
    body: [instance('download', 'accent', 'Pro Camera', 'Version v3.2 available'), n('kit/note', { text: 'Faster autofocus algorithm', align: 'center' })],
    footer: [n('kit/button', { label: 'Update now' })],
  };

  const review: Screen = { id: reviewId, ...TEMPLATES.find((t) => t.id === 'review')!.build() };
  review.name = 'Transfer review';
  review.footer[0].link = sentId;

  const sent: Screen = {
    id: sentId,
    name: 'Transfer sent',
    settings: { ...defaultScreenSettings(''), bodyAlign: 'center', leading: 'none', trailing: 'close' },
    body: [instance('circle-check', 'success', 'Money sent', '€ 250,00 is on its way to J. de Vries.'), createInstance(helpLink)],
    footer: [{ ...n('kit/button', { label: 'Done' }), link: reviewId }],
  };

  const verify: Screen = {
    id: uid('s'),
    name: 'Verify code',
    settings: { ...defaultScreenSettings('Verification') },
    body: [
      n('kit/steps', { current: 2, total: 3 }),
      n('kit/heading', { text: 'Enter your code', size: 'm' }),
      n('kit/text', { text: 'We sent a 6-digit code to your phone ending in 42.', tone: 'muted' }),
      n('layout/spacer', { size: 's' }),
      n('custom/code-input', {}),
      n('kit/link', { label: 'Send a new code', icon: '', align: 'center' }),
      n('layout/spacer', { size: 'fill' }),
      createInstance(helpLink),
    ],
    footer: [n('kit/button', { label: 'Verify' })],
  };

  const home: Screen = {
    id: uid('s'),
    name: 'Savings overview',
    settings: { ...defaultScreenSettings('Savings'), background: 'subtle' },
    body: [
      n('kit/amount', { amount: 4820.35, label: 'Total savings', size: 'xl' }),
      n('kit/account-card', { name: 'Holiday', iban: 'NL00 BANK 0555 1234 00', balance: 1320.35, icon: 'plane' }),
      n('kit/account-card', { name: 'Rainy day', iban: 'NL00 BANK 0555 9876 00', balance: 3500, icon: 'umbrella' }),
      n('custom/promo-card', {}),
      n('layout/section', { title: 'Recent' }, [
        n('kit/list-item', { heading: 'Round-up', subtitle: 'Today', icon: 'arrow-down-left', trailing: 'value', value: '+ € 0,65' }),
        n('kit/list-item', { heading: 'Monthly transfer', subtitle: '1 Oct', icon: 'repeat', trailing: 'value', value: '+ € 100,00', divider: false }),
      ]),
    ],
    footer: [],
  };

  return {
    version: 1,
    name: 'Mobile webviews',
    theme: defaultTheme(),
    screens: [update, review, sent, verify, home],
    blocks: [statusHeader, helpLink],
    remoteLibraries: [],
    disabledLibraries: [],
  };
}
