import { defineConfig } from 'vite';
import path from 'node:path';

// https://vitejs.dev/config
export default defineConfig({
  resolve: {
    alias: {
      '@shared': path.resolve(__dirname, './src/shared'),
    },
  },
  build: {
    // Add this 'lib' section to properly build the preload script
    lib: {
      entry: 'src/preload/index.ts',
      formats: ['cjs'],
      fileName: 'preload', // Name the output file preload.js
    },
    rollupOptions: {
      external: ['electron'],
    },
    emptyOutDir: false,
  },
});