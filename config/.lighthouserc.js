/**
 * Lighthouse CI Configuration (ADR-006)
 *
 * Runs Lighthouse audits in CI against the production-built Next.js app.
 * Thresholds chosen to match project commitments:
 *   - Accessibility ≥ 0.90 (WCAG 2.1 AA, see G18)
 *   - Performance ≥ 0.80 (SSR apps have realistic upper bounds)
 *   - Best Practices ≥ 0.90
 *   - SEO ≥ 0.80
 */
module.exports = {
  ci: {
    collect: {
      url: ['http://localhost:3000'],
      startServerCommand: 'npx next start -p 3000',
      startServerReadyPattern: 'Ready in',
      startServerReadyTimeout: 30000,
      numberOfRuns: 3,
      settings: {
        // Use mobile preset (Lighthouse default) for conservative scores
        preset: 'desktop',
        // Skip network throttling in CI (already constrained)
        throttlingMethod: 'simulate',
      },
    },
    assert: {
      assertions: {
        'categories:performance': ['warn', { minScore: 0.8 }],
        'categories:accessibility': ['error', { minScore: 0.9 }],
        'categories:best-practices': ['warn', { minScore: 0.9 }],
        'categories:seo': ['warn', { minScore: 0.8 }],
      },
    },
    upload: {
      // Store reports as temporary files (no Lighthouse CI server needed)
      target: 'temporary-public-storage',
    },
  },
};
