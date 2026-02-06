/** @type {import('next').NextConfig} */
const nextConfig = {
  // Produce a self-contained server bundle for Docker deployment
  output: 'standalone',

  // Configure webpack to handle server-only dependencies
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

  // Handle Google Fonts gracefully in offline environments
  experimental: {
    optimizePackageImports: ['@in-midst-my-life/core']
  },

  // TypeScript strict mode
  typescript: {
    tsconfigPath: './tsconfig.json'
  },

  // Lint in a dedicated CI step (`pnpm lint`), not during `next build`.
  // This avoids treating ESLint warnings as build-breaking errors.
  eslint: {
    ignoreDuringBuilds: true,
  }
};

module.exports = nextConfig;
