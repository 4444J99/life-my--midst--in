import { defineConfig } from 'vitest/config';

const isCI = process.env.CI === 'true';
const isCoverage = process.env.COVERAGE === 'true';

export default defineConfig({
  test: {
    globals: true,
    exclude: ['**/node_modules/**', '**/dist/**', '**/build/**', '**/.next/**'],
    coverage: {
      enabled: isCI || isCoverage,
      provider: 'v8',
      reporter: ['text', 'lcov', 'html'],
      reportsDirectory: './coverage',
      thresholds: {
        statements: 75,
        branches: 75,
        functions: 75,
        lines: 75,
      },
    },
  },
});
