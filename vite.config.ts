import { defineConfig } from 'vitest/config';
import type { Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import { buildContent } from './scripts/build-content.ts';

/** Recompiles content/*.yaml into src/generated/content.json while the dev server runs. */
function contentPlugin(): Plugin {
  return {
    name: 'ariadne-content',
    configureServer(server) {
      server.watcher.add('content');
      server.watcher.on('change', (file) => {
        const f = file.replace(/\\/g, '/');
        if (!f.includes('/content/') || !f.endsWith('.yaml')) return;
        try {
          buildContent({ quiet: true });
        } catch (e) {
          server.config.logger.error(String(e instanceof Error ? e.message : e));
        }
      });
    },
  };
}

export default defineConfig({
  // Relative base: the same build works on GitHub Pages (/ariadne/) and anywhere else.
  base: './',
  plugins: [react(), contentPlugin()],
  build: { target: 'es2022', chunkSizeWarningLimit: 600 },
  test: { include: ['tests/**/*.test.ts'], environment: 'node' },
});
