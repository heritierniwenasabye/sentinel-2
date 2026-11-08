import path from 'node:path';
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(import.meta.dirname, './src'),
    },
  },
  server: {
    host: '127.0.0.1',
    port: 3000,
    // Only the host passed per process (e.g. the preview proxy) is trusted.
    allowedHosts: process.env.SENTINEL_PREVIEW_HOST ? [process.env.SENTINEL_PREVIEW_HOST] : [],
  },
  preview: {
    host: '127.0.0.1',
    port: 3000,
  },
  build: {
    target: 'es2020',
    sourcemap: false,
    rolldownOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules/recharts') || id.includes('node_modules/d3-')) return 'charts';
          if (id.includes('node_modules/react-dom') || id.includes('node_modules/react/')) return 'react';
          if (id.includes('node_modules/i18next') || id.includes('node_modules/react-i18next') || id.includes('node_modules/date-fns')) return 'intl';
        },
      },
    },
  },
  test: {
    environment: 'jsdom',
    environmentOptions: { jsdom: { url: 'http://localhost:3000/' } },
    globals: true,
    setupFiles: ['./src/tests/setup.ts'],
    css: false,
    include: ['src/**/*.test.{ts,tsx}'],
  },
});
