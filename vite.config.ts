import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { fileURLToPath } from 'node:url';
import { progressPlugin } from './vite-plugin-progress.ts';

export default defineConfig({
  plugins: [react({ compiler: true }), tailwindcss(), progressPlugin()],
  server: {
    port: 5180,
    watch: { ignored: ['**/progress/**', '**/.superpowers/**'] },
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
    include: ['src/**/*.test.{ts,tsx}', 'vite-plugin-progress.test.ts'],
    setupFiles: ['src/test-setup.ts'],
  },
});
