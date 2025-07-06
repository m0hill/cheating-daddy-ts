import path from 'node:path'
import { defineConfig } from 'vite'

export default defineConfig({
  resolve: {
    alias: {
      '@shared': path.resolve(__dirname, './src/shared'),
    },
  },
  build: {
    lib: {
      entry: 'src/preload/index.ts',
      formats: ['cjs'],
      fileName: 'preload',
    },
    rollupOptions: {
      external: ['electron'],
    },
    emptyOutDir: false,
  },
})
