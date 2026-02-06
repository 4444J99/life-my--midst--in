/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access */
/**
 * API Versioning Middleware Tests
 *
 * Verifies the hybrid URL + header versioning strategy (ADR-017):
 * - Version detection from URL path (/v1/)
 * - Version detection from Accept-Version header
 * - Default version fallback
 * - Response headers (X-API-Version, Deprecation, Sunset, Link)
 *
 * Note: System endpoints (/health, /ready, /metrics) are intentionally
 * version-agnostic and registered outside versioned scopes.
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { buildTestApp } from './app-builder';

describe('API Versioning', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = await buildTestApp();
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('System Endpoints (Version-Agnostic)', () => {
    it('should serve /health without version headers', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/health',
      });

      expect(res.statusCode).toBe(200);
      // System endpoints don't have version headers - they're infrastructure
      expect(res.headers['x-api-version']).toBeUndefined();
    });

    it('should serve /ready without version headers', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/ready',
      });

      // May return 200 or 503 depending on DB state, but should work
      expect([200, 503]).toContain(res.statusCode);
      expect(res.headers['x-api-version']).toBeUndefined();
    });
  });

  describe('Version Detection on API Routes', () => {
    it('should add X-API-Version header to /v1/ routes', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/v1/taxonomy/masks',
      });

      expect(res.statusCode).toBe(200);
      expect(res.headers['x-api-version']).toBe('1');
    });

    it('should add X-API-Version header to root API routes', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/taxonomy/masks',
      });

      expect(res.statusCode).toBe(200);
      expect(res.headers['x-api-version']).toBe('1');
    });

    it('should detect version from Accept-Version header on API routes', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/taxonomy/masks',
        headers: {
          'Accept-Version': '1',
        },
      });

      expect(res.statusCode).toBe(200);
      expect(res.headers['x-api-version']).toBe('1');
    });
  });

  describe('Deprecation Headers (Root Routes)', () => {
    it('should add deprecation headers to root routes', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/taxonomy/masks',
      });

      expect(res.statusCode).toBe(200);
      expect(res.headers['deprecation']).toBe('true');
      expect(res.headers['sunset']).toBeDefined();
      expect(res.headers['link']).toContain('rel="successor-version"');
    });

    it('should NOT add deprecation headers to /v1/ routes', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/v1/taxonomy/masks',
      });

      expect(res.statusCode).toBe(200);
      expect(res.headers['deprecation']).toBeUndefined();
      expect(res.headers['sunset']).toBeUndefined();
    });
  });

  describe('Route Availability', () => {
    it('should serve /v1/profiles routes', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/v1/profiles',
      });

      // Should return 200 with empty array or profiles
      expect(res.statusCode).toBe(200);
    });

    it('should serve root /profiles routes (deprecated)', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/profiles',
      });

      expect(res.statusCode).toBe(200);
      expect(res.headers['deprecation']).toBe('true');
    });

    it('should serve /v1/taxonomy/masks', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/v1/taxonomy/masks',
      });

      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(body.ok).toBe(true);
      expect(body.data).toBeDefined();
    });
  });
});
