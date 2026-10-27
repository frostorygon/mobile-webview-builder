import { registry } from './core/registry.js';
import { registerRemote } from './core/remote.js';
import { store } from './core/store.js';
import { seedProject } from './core/templates.js';
import { codeLibraries } from './libraries/index.js';
import './app/wb-app.js';

async function boot() {
  // Libraries must be registered before seeding: templates read their prop defaults.
  await Promise.all(codeLibraries.map((lib) => registry.register(lib)));
  await store.load(seedProject);
  for (const lib of store.project.remoteLibraries) registerRemote(lib);
  document.body.append(document.createElement('wb-app'));
  document.getElementById('boot')?.remove();
  // Handy in devtools: __builder.store.project, __builder.registry.components()
  if (import.meta.env.DEV) Object.assign(window, { __builder: { store, registry } });
}

boot();
