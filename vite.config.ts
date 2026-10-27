import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import type { IncomingMessage } from 'node:http';
import { defineConfig, type Plugin } from 'vite';
import { exportProject, type ExportFile } from './scripts/export-project.js';

/**
 * Dev-server storage: the builder saves the project to builder-data/project.json, so screens
 * and blocks live in git next to the code, and "Write all screens to repo" puts generated
 * Lit files in ./generated. Without the dev server (static build) it falls back to localStorage.
 */
function builderStorage(): Plugin {
  const root = process.cwd();
  const projectFile = join(root, 'builder-data', 'project.json');

  const body = (req: IncomingMessage) =>
    new Promise<string>((ok, fail) => {
      let data = '';
      req.on('data', (c) => (data += c));
      req.on('end', () => ok(data));
      req.on('error', fail);
    });

  return {
    name: 'builder-storage',
    configureServer(server) {
      server.middlewares.use('/__builder/project', async (req, res) => {
        try {
          if (req.method === 'GET') {
            const text = await readFile(projectFile, 'utf8').catch(() => '');
            res.setHeader('content-type', 'application/json');
            res.end(text);
            return;
          }
          if (req.method === 'PUT') {
            const text = await body(req);
            JSON.parse(text); // refuse to write anything that isn't JSON
            await mkdir(dirname(projectFile), { recursive: true });
            await writeFile(projectFile, text);
            res.end('ok');
            return;
          }
          res.statusCode = 405;
          res.end();
        } catch (err) {
          res.statusCode = 500;
          res.end(String(err));
        }
      });

      server.middlewares.use('/__builder/export', async (req, res) => {
        if (req.method !== 'POST') {
          res.statusCode = 405;
          res.end();
          return;
        }
        try {
          const { files } = JSON.parse(await body(req)) as { files: ExportFile[] };
          const count = await exportProject(root, files);
          res.setHeader('content-type', 'application/json');
          res.end(JSON.stringify({ dir: 'generated', count }));
        } catch (err) {
          res.statusCode = 500;
          res.end(String((err as Error).message ?? err));
        }
      });
    },
  };
}

export default defineConfig({
  plugins: [builderStorage()],
  // The full Lucide icon set (searchable picker) makes the main chunk large; fine for a dev tool.
  build: { chunkSizeWarningLimit: 900 },
  server: {
    port: 5180,
    watch: { ignored: ['**/builder-data/**', '**/generated/**'] },
  },
});
