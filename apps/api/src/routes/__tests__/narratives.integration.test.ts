/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-explicit-any */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { Pool } from 'pg';
import { buildTestApp } from '../../../test/app-builder';
import { runMigrations } from '../../repositories/migrations';

const connectionString =
  process.env['INTEGRATION_POSTGRES_URL'] ??
  process.env['DATABASE_URL'] ??
  process.env['POSTGRES_URL'];

if (!connectionString) {
  describe.skip('Narratives Endpoints - Integration Tests', () => {
    it('skipped because INTEGRATION_POSTGRES_URL not set', () => {
      expect(true).toBe(true);
    });
  });
} else {
  describe('Narratives Endpoints - Integration Tests', () => {
    let app: any;
    let pool: Pool;
    const profileId = 'test-profile-' + Date.now();
    const personaId = 'test-persona-' + Date.now();

    beforeAll(async () => {
      pool = new Pool({ connectionString });
      await runMigrations(pool);
      app = await buildTestApp();

      // Create test persona first
      await app.inject({
        method: 'POST',
        url: `/profiles/${profileId}/personae`,
        payload: {
          nomen: 'Test Persona',
          everyday_name: 'Test',
          role_vector: 'Testing',
          tone_register: 'Analytical',
          visibility_scope: ['Technica'],
        },
      });
    });

    afterAll(async () => {
      await app.close();
      await pool.end();
    });

    describe('GET /profiles/:id/narrative/:maskId', () => {
      it('returns narrative blocks with theatrical framing', async () => {
        const response = await app.inject({
          method: 'GET',
          url: `/profiles/${profileId}/narrative/${personaId}`,
        });

        expect(response.statusCode).toBe(200);

        const body = JSON.parse(response.body);
        expect(body).toHaveProperty('blocks');
        expect(Array.isArray(body.blocks)).toBe(true);
        expect(body).toHaveProperty('theatricalPreamble');
        expect(body).toHaveProperty('authenticDisclaimier');
      });

      it('returns 404 for non-existent profile', async () => {
        const response = await app.inject({
          method: 'GET',
          url: '/profiles/non-existent/narrative/some-mask',
        });

        expect(response.statusCode).toBe(404);
      });
    });

    describe('POST /profiles/:id/narrative/generate', () => {
      it('generates narrative with custom weights', async () => {
        const response = await app.inject({
          method: 'POST',
          url: `/profiles/${profileId}/narrative/generate`,
          payload: {
            maskId: personaId,
            weights: {
              experience: 0.4,
              skills: 0.3,
              education: 0.2,
              projects: 0.1,
            },
          },
        });

        expect(response.statusCode).toBe(200);

        const body = JSON.parse(response.body);
        expect(body).toHaveProperty('narrative');
        expect(body).toHaveProperty('generatedAt');
      });
    });

    describe('GET /profiles/:id/narrative/export', () => {
      it('exports narrative in markdown format', async () => {
        const response = await app.inject({
          method: 'GET',
          url: `/profiles/${profileId}/narrative/export?format=markdown&maskId=${personaId}`,
        });

        expect(response.statusCode).toBe(200);
        expect(response.headers['content-type']).toContain('text/markdown');
      });

      it('exports narrative in JSON format', async () => {
        const response = await app.inject({
          method: 'GET',
          url: `/profiles/${profileId}/narrative/export?format=json&maskId=${personaId}`,
        });

        expect(response.statusCode).toBe(200);
        expect(response.headers['content-type']).toContain('application/json');
      });
    });
  });
}
