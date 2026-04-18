import { fileURLToPath, URL } from 'node:url'

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
    })
  ],
  build: {
    outDir: 'dist',
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
