// @vitest-environment node
import { afterAll, beforeAll, expect, it } from 'vitest';
import { mkdtemp, readFile, readdir, rm, symlink } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { parseSync } from 'vite';
import { exportProject } from '../scripts/export-project.js';
import { generateAll } from '../src/core/codegen.js';
import { n, registry } from '../src/core/registry.js';
import { seedProject } from '../src/core/templates.js';
import { codeLibraries } from '../src/libraries/index.js';

let root: string;
beforeAll(async () => {
  root = await mkdtemp(join(tmpdir(), 'builder-export-'));
  // Only these disposable output files are written. Sources and installed dependencies are read through junctions.
  await symlink(resolve('src'), join(root, 'src'), 'junction');
  await symlink(resolve('node_modules'), join(root, 'node_modules'), 'junction');
  await Promise.all(codeLibraries.map((lib) => registry.register(lib)));
});
afterAll(async () => { await rm(root, { recursive: true, force: true }); });

it('exports portable compiled screens, shared dependencies, HTML pages and theme', async () => {
  const project = seedProject();
  project.screens[0].body.push(n('lion/lion-input', { label: 'Name' }), n('custom/promo-card', { heading: '' }));
  const files = generateAll(project);
  const count = await exportProject(root, files);
  expect(count).toBeGreaterThan(files.length);
  const generated = join(root, 'generated');
  const entries = await readdir(join(generated, 'screens'));
  expect(entries.filter((file) => file.endsWith('.js'))).toHaveLength(project.screens.length);
  const allJs = [...entries.filter((file) => file.endsWith('.js')).map((file) => join(generated, 'screens', file)),
    ...(await readdir(join(generated, 'assets'))).filter((file) => file.endsWith('.js')).map((file) => join(generated, 'assets', file))];
  for (const path of allJs) {
    const code = await readFile(path, 'utf8');
    const parsed = parseSync(path, code);
    const imports = parsed.module.staticImports.map((entry) => entry.moduleRequest.value);
    for (const entry of parsed.module.dynamicImports) imports.push(code.slice(entry.moduleRequest.start + 1, entry.moduleRequest.end - 1));
    expect(imports.every((specifier) => specifier.startsWith('.'))).toBe(true);
    for (const specifier of imports) {
      await expect(readFile(resolve(dirname(path), specifier))).resolves.toBeDefined();
    }
  }
  const html = files.find((file) => file.path.startsWith('html/'))!;
  expect(html.content).toContain('../theme.css');
  const script = /src="(\.\.\/screens\/[^\"]+\.js)"/.exec(html.content)![1];
  await expect(readFile(resolve(generated, dirname(html.path), script))).resolves.toBeDefined();
}, 15000);

it('rejects duplicate output paths before writing anything', async () => {
  await expect(exportProject(root, [{ path: 'duplicate.txt', content: 'A' }, { path: 'duplicate.txt', content: 'B' }])).rejects.toThrow('Duplicate export path');
  await expect(readFile(join(root, 'generated', 'duplicate.txt'))).rejects.toThrow();
});

it('rejects paths that escape the generated directory', async () => {
  await expect(exportProject(root, [{ path: '../generated-other/escape.txt', content: 'no' }])).rejects.toThrow('Invalid export path');
});
