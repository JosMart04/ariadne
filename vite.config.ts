import { watch } from 'node:fs';
import { resolve } from 'node:path';
import { defineConfig } from 'vitest/config';
import type { Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import { buildContent } from './scripts/build-content.ts';

/**
 * Recompiles content/*.yaml into src/generated/content.json while the dev server runs.
 * Vite then reloads the page because the JSON is part of the module graph.
 */
function contentPlugin(): Plugin {
  return {
    name: 'ariadne-content',
    configureServer(server) {
      // Vitest also boots Vite servers; they must not keep a file watcher alive.
      if (process.env.VITEST) return;
      let timer: NodeJS.Timeout | undefined;
      const watcher = watch(resolve('content'), { recursive: true }, (_event, file) => {
        if (!file || !String(file).endsWith('.yaml')) return;
        clearTimeout(timer);
        timer = setTimeout(() => {
          try {
            buildContent({ quiet: true });
            server.config.logger.info(`content recompiled (${file})`, { timestamp: true });
          } catch (e) {
            server.config.logger.error(String(e instanceof Error ? e.message : e));
          }
        }, 80);
      });
      watcher.unref();
      server.httpServer?.once('close', () => watcher.close());
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
