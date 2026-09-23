import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { fileURLToPath } from 'node:url';
import { progressPlugin } from './vite-plugin-progress.ts';
import { localCheckPlugin } from './vite-plugin-local-check.ts';

// GITHUB_PAGES=1 builds for the project site at look-itsaxiom.github.io/react-refresher (see scripts/deploy-pages.mjs).
const base = process.env.GITHUB_PAGES === '1' ? '/react-refresher/' : '/';

export default defineConfig({
  base,
  // The sandbox grades exercises with Testing Library, whose render/act need React's development
  // build: production React omits `act` entirely, which surfaced on GitHub Pages as
  // "t.act is not a function". This is a teaching tool, so ship dev React everywhere and keep
  // the readable warnings; import.meta.env.DEV/PROD still follow the Vite mode.
  define: { 'process.env.NODE_ENV': JSON.stringify('development') },
  plugins: [react({ compiler: true }), tailwindcss(), progressPlugin(), localCheckPlugin()],
  server: {
    port: 5180,
    watch: { ignored: ['**/progress/**', '**/.superpowers/**', '**/exercises-local/**'] },
  },
  resolve: {
    alias: { '@server': fileURLToPath(new URL('./src/sandbox/server', import.meta.url)) },
  },
  build: {
    rollupOptions: {
      input: {
        main: fileURLToPath(new URL('./index.html', import.meta.url)),
        preview: fileURLToPath(new URL('./preview.html', import.meta.url)),
      },
    },
  },
  test: {
    environment: 'jsdom',
    include: ['src/**/*.test.{ts,tsx}', 'vite-plugin-progress.test.ts', 'vite-plugin-local-check.test.ts'],
    setupFiles: ['src/test-setup.ts'],
  },
});
