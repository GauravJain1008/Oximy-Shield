import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

export default defineConfig({
  plugins: [react()],
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    sourcemap: false,
    rollupOptions: {
      input: {
        popup: resolve(__dirname, 'popup.html'),
        dashboard: resolve(__dirname, 'dashboard.html'),
        options: resolve(__dirname, 'options.html'),
        onboarding: resolve(__dirname, 'onboarding.html'),
        background: resolve(__dirname, 'src/background/index.ts'),
        content: resolve(__dirname, 'src/content/index.ts'),
      },
      output: {
        entryFileNames: (chunk) => {
          if (chunk.name === 'background') return 'background.js';
          if (chunk.name === 'content') return 'content.js';
          return 'assets/[name]-[hash].js';
        },
        chunkFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash].[ext]',
      },
    },
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
    },
  },
});
