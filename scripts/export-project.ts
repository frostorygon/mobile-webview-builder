import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, isAbsolute, relative, resolve } from 'node:path';
import { build } from 'vite';

export interface ExportFile { path: string; content: string }

function targetWithin(directory: string, path: string): string {
  const target = resolve(directory, path);
  const rel = relative(directory, target);
  if (!rel || rel.startsWith('..') || isAbsolute(rel)) throw new Error(`Invalid export path: ${path}`);
  return target;
}

/** Validate and compile in memory before writing any files. Shared chunks include local dependencies. */
export async function exportProject(root: string, files: ExportFile[]): Promise<number> {
  const outDir = resolve(root, 'generated');
  const sources = new Map<string, string>();
  const paths = new Set<string>();
  const input: Record<string, string> = {};
  for (const file of files) {
    const target = targetWithin(outDir, file.path);
    const key = target.toLowerCase();
    if (paths.has(key)) throw new Error(`Duplicate export path: ${file.path}`);
    paths.add(key);
    if (file.path.endsWith('.ts')) {
      const name = /^(?:screens\/)(screen-[a-z0-9-]+)\.ts$/.exec(file.path)?.[1];
      if (!name) throw new Error(`Invalid screen path: ${file.path}`);
      input[name] = target;
      sources.set(target.replace(/\\/g, '/'), file.content);
    }
  }
  if (!Object.keys(input).length) throw new Error('No screens to export');
  const result = await build({
    root, base: './', configFile: false, logLevel: 'error',
    plugins: [{
      name: 'generated-screen-source', enforce: 'pre',
      resolveId(id) { return sources.has(id.replace(/\\/g, '/')) ? id : null; },
      load(id) { return sources.get(id.replace(/\\/g, '/')); },
    }],
    build: {
      write: false, minify: false, outDir,
      rolldownOptions: {
        input,
        output: { entryFileNames: 'screens/[name].js', chunkFileNames: 'assets/[name]-[hash].js', assetFileNames: 'assets/[name]-[hash][extname]' },
      },
    },
  });
  const outputs = (Array.isArray(result) ? result : [result]).flatMap((bundle) => {
    if (!('output' in bundle)) throw new Error('Expected a completed export build');
    return bundle.output;
  });
  const writes = [
    ...files.map((file) => ({ path: file.path, content: file.content })),
    ...outputs.map((file) => ({ path: file.fileName, content: file.type === 'chunk' ? file.code : file.source })),
  ];
  for (const file of writes) {
    const target = targetWithin(outDir, file.path);
    await mkdir(dirname(target), { recursive: true });
    await writeFile(target, file.content);
  }
  return writes.length;
}
