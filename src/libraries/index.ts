import type { LibraryDef } from '../core/registry.js';
import { customLibrary } from './custom/index.js';
import { ingWebLibrary } from './ing-web/index.js';
import { layoutLibrary } from './layout.js';
import { lionLibrary } from './lion/index.js';
import { mobileKit } from './mobile-kit/index.js';

/** Libraries registered from code. Order = palette order. */
export const codeLibraries: LibraryDef[] = [
  layoutLibrary,
  mobileKit,
  ...(ingWebLibrary ? [ingWebLibrary] : []),
  customLibrary,
  lionLibrary,
];
