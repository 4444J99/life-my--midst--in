const withBundleAnalyzer = require('@next/bundle-analyzer')({
  enabled: process.env.ANALYZE === 'true',
});

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Produce a self-contained server bundle for Docker deployment
  output: 'standalone',

  // Configure webpack fallback for server-only dependencies (used with --webpack)
  webpack: (config, { isServer }) => {
    if (!isServer) {
      // Prevent webpack from trying to bundle server-only modules with native dependencies
      config.resolve.fallback = {
        ...config.resolve.fallback,
        'ssh2': false,
        'cpu-features': false,
        'smb2': false,
        'fs': false,
        'path': false,
        'node:crypto': false,
        'crypto': false,
        'node:fs': false,
        'node:path': false
      };
    }
    return config;
  },

  // Turbopack config (default bundler in Next.js 16)
  turbopack: {
    resolveAlias: {
      'ssh2': { browser: '' },
      'cpu-features': { browser: '' },
      'smb2': { browser: '' },
    },
  },

  // Handle Google Fonts gracefully in offline environments
  experimental: {
    optimizePackageImports: ['@in-midst-my-life/core']
  },

  // TypeScript strict mode
  typescript: {
    tsconfigPath: './tsconfig.json'
  },
};

module.exports = withBundleAnalyzer(nextConfig);
