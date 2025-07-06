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
    // This is the key change
    lib: {
      entry: 'src/main/index.ts',
      formats: ['cjs'],
      fileName: 'main',
    },
    rollupOptions: {
      external: ['electron', '@google/genai'],
    },
    // Recommended: Prevent multiple builds from interfering with each other
    emptyOutDir: false,
  },
});