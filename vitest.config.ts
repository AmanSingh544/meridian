import { defineConfig } from 'vitest/config';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default defineConfig({
  resolve: {
    alias: {
      '@3sc/types': path.resolve(__dirname, 'packages/types/src'),
      '@3sc/utils': path.resolve(__dirname, 'packages/utils/src'),
      '@3sc/config': path.resolve(__dirname, 'packages/config/src'),
      '@3sc/theme': path.resolve(__dirname, 'packages/theme/src'),
      '@3sc/permissions': path.resolve(__dirname, 'packages/permissions/src'),
      '@3sc/auth': path.resolve(__dirname, 'packages/auth/src'),
      '@3sc/api': path.resolve(__dirname, 'packages/api/src'),
      '@3sc/realtime': path.resolve(__dirname, 'packages/realtime/src'),
      '@3sc/hooks': path.resolve(__dirname, 'packages/hooks/src'),
      '@3sc/ui': path.resolve(__dirname, 'packages/ui/src'),
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    include: ['**/*.test.{ts,tsx}'],
    coverage: {
      reporter: ['text', 'html'],
      include: ['packages/*/src/**/*.{ts,tsx}'],
    },
  },
});
