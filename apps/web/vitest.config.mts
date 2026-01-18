import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./test/setup.ts'],
    // Exclude e2e and accessibility tests - they require Playwright
    exclude: [
      '**/node_modules/**',
      '__tests__/e2e/**',
      '__tests__/accessibility/**',
    ],
  },
});
