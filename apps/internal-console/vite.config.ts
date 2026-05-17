import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { execSync } from 'child_process';

function getGitSha(): string {
  try {
    return execSync('git rev-parse HEAD', { encoding: 'utf-8' }).trim();
  } catch {
    return `build-${Date.now()}`;
  }
}

const RELEASE_SHA = getGitSha();

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@3sc/types': path.resolve(__dirname, '../../packages/types/src'),
      '@3sc/utils': path.resolve(__dirname, '../../packages/utils/src'),
      '@3sc/config': path.resolve(__dirname, '../../packages/config/src'),
      '@3sc/theme': path.resolve(__dirname, '../../packages/theme/src'),
      '@3sc/permissions': path.resolve(__dirname, '../../packages/permissions/src'),
      '@3sc/auth': path.resolve(__dirname, '../../packages/auth/src'),
      '@3sc/api': path.resolve(__dirname, '../../packages/api/src'),
      '@3sc/realtime': path.resolve(__dirname, '../../packages/realtime/src'),
      '@3sc/hooks': path.resolve(__dirname, '../../packages/hooks/src'),
      '@3sc/ui': path.resolve(__dirname, '../../packages/ui/src'),
    },
  },
  server: {
    proxy: {
      '/api': { target: 'http://localhost:8080', changeOrigin: true },
      '/ws': { target: 'ws://localhost:8080', ws: true },
    },
  },
  define: {
    'window.__BI_RELEASE__': JSON.stringify(RELEASE_SHA),
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
  },
});
