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
      entry: 'src/main/index.ts',
      formats: ['cjs'],
      fileName: 'main',
    },
    rollupOptions: {
      external: ['electron'],
    },
    emptyOutDir: false,
  },
})