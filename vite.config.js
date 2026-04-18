import { fileURLToPath, URL } from 'node:url'
import { mkdirSync, writeFileSync } from 'node:fs'

import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { nodePolyfills } from 'vite-plugin-node-polyfills'

// https://vitejs.dev/config/
export default defineConfig({
  base: '/admin/',
  plugins: [
    vue(),
    nodePolyfills({
      include: ['buffer']
    }),
    {
      name: 'admin-root-redirect',
      closeBundle() {
        const distRoot = fileURLToPath(new URL('./dist', import.meta.url));
        mkdirSync(distRoot, { recursive: true });
        writeFileSync(
          `${distRoot}/index.html`,
          `<!doctype html><html><head><meta charset="utf-8"><meta http-equiv="refresh" content="0; url=/admin/"><script>location.replace('/admin/' + location.search + location.hash)</script><title>Redirecting…</title></head><body>Redirecting to <a href="/admin/">/admin/</a>…</body></html>`
        );
      }
    }
  ],
  build: {
    outDir: 'dist/admin',
    emptyOutDir: true,
    rollupOptions: {
      output: {
        // Налаштування для коректного завантаження файлів
        entryFileNames: 'assets/[hash].p.js',
        chunkFileNames: 'assets/[hash].c.js',
        assetFileNames: 'assets/[hash].s.[ext]',
        sanitizeFileName: false,
      },
    },
  },
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url))
    }
  }
})
