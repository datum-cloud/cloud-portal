import { resolve } from 'path';
import { defineConfig } from 'vite';

export default defineConfig({
  publicDir: false,
  resolve: {
    alias: { '@': resolve(import.meta.dirname, './app') },
    tsconfigPaths: true,
  },
  build: {
    ssr: 'observability/index.ts',
    outDir: 'build/observability',
    emptyOutDir: true,
    target: 'node26',
  },
});
