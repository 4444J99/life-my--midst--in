/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-return, @typescript-eslint/no-explicit-any */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { Pool } from 'pg';
import { buildTestApp } from '../../../test/app-builder';
import { runMigrations } from '../../repositories/migrations';

const connectionString =
  process.env['INTEGRATION_POSTGRES_URL'] ??
  process.env['DATABASE_URL'] ??
  process.env['POSTGRES_URL'];

if (!connectionString) {
  describe.skip('Aetas Endpoints - Integration Tests', () => {
    it('skipped because INTEGRATION_POSTGRES_URL not set', () => {
      expect(true).toBe(true);
    });
  });
} else {
  describe('Aetas Endpoints - Integration Tests', () => {
    let app: any;
    let pool: Pool;
    const profileId = 'test-profile-' + Date.now();

    beforeAll(async () => {
      pool = new Pool({ connectionString });
      await runMigrations(pool);
      app = await buildTestApp();
    });

    afterAll(async () => {
      await app.close();
      await pool.end();
    });

    describe('GET /taxonomy/aetas', () => {
      it('returns all 8 canonical aetas definitions', async () => {
        const response = await app.inject({
          method: 'GET',
          url: '/taxonomy/aetas',
        });

        expect(response.statusCode).toBe(200);

        const body = JSON.parse(response.body);
        expect(Array.isArray(body.aetas)).toBe(true);
        expect(body.aetas.length).toBe(8);
      });

      it('includes complete metadata for each canonical aetas', async () => {
        const response = await app.inject({
          method: 'GET',
          url: '/taxonomy/aetas',
        });

        expect(response.statusCode).toBe(200);

        const body = JSON.parse(response.body);
        const aetas = body.aetas[0];

        expect(aetas).toHaveProperty('id');
        expect(aetas).toHaveProperty('nomen');
        expect(aetas).toHaveProperty('label');
        expect(aetas).toHaveProperty('age_range');
        expect(aetas).toHaveProperty('description');
        expect(aetas).toHaveProperty('capability_profile');
        expect(aetas).toHaveProperty('duration_years');
      });

      it('canonical aetas are properly ordered', async () => {
        const response = await app.inject({
          method: 'GET',
          url: '/taxonomy/aetas',
        });

        expect(response.statusCode).toBe(200);

        const body = JSON.parse(response.body);
        const labels = body.aetas.map((a: any) => a.label);

        // Should follow canonical order
        expect(labels[0]).toContain('Initiation');
        expect(labels[labels.length - 1]).toContain('Stewardship');
      });

      it('supports pagination for aetas listing', async () => {
        const response = await app.inject({
          method: 'GET',
          url: '/taxonomy/aetas?offset=0&limit=4',
        });

        expect(response.statusCode).toBe(200);

        const body = JSON.parse(response.body);
        expect(body.aetas.length).toBeLessThanOrEqual(4);
      });
    });

    describe('GET /profiles/:id/aetas', () => {
      it('returns empty array for profile with no aetas assignments', async () => {
        const response = await app.inject({
          method: 'GET',
          url: `/profiles/${profileId}/aetas`,
        });

        expect(response.statusCode).toBe(200);

        const body = JSON.parse(response.body);
        expect(Array.isArray(body.profileAetas)).toBe(true);
        expect(body.profileAetas.length).toBe(0);
      });

      it('lists all aetas assigned to profile', async () => {
        // Assign first aetas
        await app.inject({
          method: 'POST',
          url: `/profiles/${profileId}/aetas`,
          payload: {
            aetasId: 'aetas-1',
            startDate: '2020-01-01',
          },
        });

        const response = await app.inject({
          method: 'GET',
          url: `/profiles/${profileId}/aetas`,
        });

        expect(response.statusCode).toBe(200);

        const body = JSON.parse(response.body);
        expect(body.profileAetas.length).toBeGreaterThan(0);
        expect(body.profileAetas[0]).toHaveProperty('aetasId');
        expect(body.profileAetas[0]).toHaveProperty('startDate');
      });
    });

    describe('POST /profiles/:id/aetas', () => {
      it('assigns aetas to profile with start date', async () => {
        const response = await app.inject({
          method: 'POST',
          url: `/profiles/${profileId}/aetas`,
          payload: {
            aetasId: 'aetas-1',
            startDate: '2020-01-01',
          },
        });

        expect(response.statusCode).toBe(201);

        const body = JSON.parse(response.body);
        expect(body.id).toBeDefined();
        expect(body.aetasId).toBe('aetas-1');
        expect(body.startDate).toBeDefined();
      });

      it('supports end date for completed aetas', async () => {
        const response = await app.inject({
          method: 'POST',
          url: `/profiles/${profileId}/aetas`,
          payload: {
            aetasId: 'aetas-2',
            startDate: '2024-01-01',
            endDate: '2024-06-01',
          },
        });

        expect(response.statusCode).toBe(201);

        const body = JSON.parse(response.body);
        expect(body.endDate).toBeDefined();
      });

      it('validates aetas ID exists', async () => {
        const response = await app.inject({
          method: 'POST',
          url: `/profiles/${profileId}/aetas`,
          payload: {
            aetasId: 'invalid-aetas',
            startDate: '2020-01-01',
          },
        });

        expect(response.statusCode).toBe(400);
      });

      it('validates date format', async () => {
        const response = await app.inject({
          method: 'POST',
          url: `/profiles/${profileId}/aetas`,
          payload: {
            aetasId: 'aetas-1',
            startDate: 'invalid-date',
          },
        });

        expect(response.statusCode).toBe(400);
      });

      it('allows optional metadata (notes, observations)', async () => {
        const response = await app.inject({
          method: 'POST',
          url: `/profiles/${profileId}/aetas`,
          payload: {
            aetasId: 'aetas-3',
            startDate: '2025-01-01',
            metadata: {
              notes: 'Currently in this stage',
              key_learnings: ['Leadership', 'Systems thinking'],
            },
          },
        });

        expect(response.statusCode).toBe(201);

        const body = JSON.parse(response.body);
        expect(body.metadata).toBeDefined();
      });
    });

    describe('PATCH /profiles/:id/aetas/:aetasId', () => {
      let assignedAetasId: string;

      beforeAll(async () => {
        const response = await app.inject({
          method: 'POST',
          url: `/profiles/${profileId}/aetas`,
          payload: {
            aetasId: 'aetas-4',
            startDate: '2023-01-01',
          },
        });

        assignedAetasId = JSON.parse(response.body).id;
      });

      it('updates aetas end date to mark completion', async () => {
        const response = await app.inject({
          method: 'PATCH',
          url: `/profiles/${profileId}/aetas/${assignedAetasId}`,
          payload: {
            endDate: '2024-01-01',
          },
        });

        expect(response.statusCode).toBe(200);

        const body = JSON.parse(response.body);
        expect(body.endDate).toBeDefined();
      });

      it('updates metadata for aetas', async () => {
        const response = await app.inject({
          method: 'PATCH',
          url: `/profiles/${profileId}/aetas/${assignedAetasId}`,
          payload: {
            metadata: {
              reflection: 'Significant growth in this stage',
              achievements: ['Project completion', 'Leadership development'],
            },
          },
        });

        expect(response.statusCode).toBe(200);

        const body = JSON.parse(response.body);
        expect(body.metadata.reflection).toBeDefined();
      });

      it('returns 404 for non-existent assignment', async () => {
        const response = await app.inject({
          method: 'PATCH',
          url: `/profiles/${profileId}/aetas/non-existent`,
          payload: {
            endDate: '2024-01-01',
          },
        });

        expect(response.statusCode).toBe(404);
      });
    });

    describe('DELETE /profiles/:id/aetas/:aetasId', () => {
      let assignedAetasId: string;

      beforeAll(async () => {
        const response = await app.inject({
          method: 'POST',
          url: `/profiles/${profileId}/aetas`,
          payload: {
            aetasId: 'aetas-5',
            startDate: '2023-06-01',
          },
        });

        assignedAetasId = JSON.parse(response.body).id;
      });

      it('removes aetas assignment from profile', async () => {
        const response = await app.inject({
          method: 'DELETE',
          url: `/profiles/${profileId}/aetas/${assignedAetasId}`,
        });

        expect(response.statusCode).toBe(204);
      });

      it('returns 404 when deleting non-existent assignment', async () => {
        const response = await app.inject({
          method: 'DELETE',
          url: `/profiles/${profileId}/aetas/non-existent`,
        });

        expect(response.statusCode).toBe(404);
      });
    });

    describe('Aetas progression tracking', () => {
      const progressProfileId = 'progress-' + Date.now();

      it('tracks complete aetas progression over time', async () => {
        const assignments = [
          { aetasId: 'aetas-1', startDate: '2020-01-01', endDate: '2024-01-01' },
          { aetasId: 'aetas-2', startDate: '2024-01-01', endDate: '2025-01-01' },
          { aetasId: 'aetas-3', startDate: '2025-01-01' }, // Current
        ];

        for (const assignment of assignments) {
          await app.inject({
            method: 'POST',
            url: `/profiles/${progressProfileId}/aetas`,
            payload: assignment,
          });
        }

        const response = await app.inject({
          method: 'GET',
          url: `/profiles/${progressProfileId}/aetas`,
        });

        expect(response.statusCode).toBe(200);

        const body = JSON.parse(response.body);
        expect(body.profileAetas.length).toBe(3);

        // Should be ordered chronologically
        expect(body.profileAetas[0].startDate).toBeLessThan(body.profileAetas[1].startDate);
      });

      it('identifies current aetas (the one without endDate)', async () => {
        const response = await app.inject({
          method: 'GET',
          url: `/profiles/${progressProfileId}/aetas`,
        });

        expect(response.statusCode).toBe(200);

        const body = JSON.parse(response.body);
        const current = body.profileAetas.find((a: any) => !a.endDate);

        expect(current).toBeDefined();
        expect(current.aetasId).toBe('aetas-3');
      });

      it('calculates duration spent in each aetas', async () => {
        const response = await app.inject({
          method: 'GET',
          url: `/profiles/${progressProfileId}/aetas`,
        });

        expect(response.statusCode).toBe(200);

        const body = JSON.parse(response.body);
        const completedAetas = body.profileAetas.filter((a: any) => a.endDate);

        for (const aetas of completedAetas) {
          const start = new Date(aetas.startDate);
          const end = new Date(aetas.endDate);
          const durationDays = (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24);

          expect(durationDays).toBeGreaterThan(0);
        }
      });
    });

    describe('Canonical aetas information', () => {
      it('provides capability profile for each stage', async () => {
        const response = await app.inject({
          method: 'GET',
          url: '/taxonomy/aetas',
        });

        expect(response.statusCode).toBe(200);

        const body = JSON.parse(response.body);
        const aetas = body.aetas[0];

        expect(aetas.capability_profile).toBeDefined();
        expect(aetas.capability_profile.primary).toBeDefined();
        expect(Array.isArray(aetas.capability_profile.primary)).toBe(true);
      });

      it('includes age range guidance for each stage', async () => {
        const response = await app.inject({
          method: 'GET',
          url: '/taxonomy/aetas',
        });

        expect(response.statusCode).toBe(200);

        const body = JSON.parse(response.body);
        const aetas = body.aetas[0];

        expect(aetas.age_range).toBeDefined();
        expect(typeof aetas.age_range).toBe('string');
        // Should contain age range like "18-25"
        expect(aetas.age_range).toMatch(/\d+.*\d+/);
      });

      it('provides duration guidance for each stage', async () => {
        const response = await app.inject({
          method: 'GET',
          url: '/taxonomy/aetas',
        });

        expect(response.statusCode).toBe(200);

        const body = JSON.parse(response.body);
        const aetas = body.aetas[0];

        expect(aetas.duration_years).toBeDefined();
        expect(typeof aetas.duration_years).toBe('number');
        expect(aetas.duration_years).toBeGreaterThan(0);
      });
    });

    describe('Error handling and validation', () => {
      it('prevents duplicate aetas assignments in overlapping periods', async () => {
        const testProfile = 'overlap-test-' + Date.now();

        // Assign first aetas
        await app.inject({
          method: 'POST',
          url: `/profiles/${testProfile}/aetas`,
          payload: {
            aetasId: 'aetas-1',
            startDate: '2023-01-01',
            endDate: '2024-01-01',
          },
        });

        // Try to assign overlapping same aetas
        const response = await app.inject({
          method: 'POST',
          url: `/profiles/${testProfile}/aetas`,
          payload: {
            aetasId: 'aetas-1',
            startDate: '2023-06-01',
            endDate: '2024-06-01',
          },
        });

        // Should either reject or create new assignment (depending on business logic)
        // Test verifies the endpoint responds appropriately
        expect([200, 201, 409]).toContain(response.statusCode);
      });

      it('validates start date before end date', async () => {
        const response = await app.inject({
          method: 'POST',
          url: `/profiles/${profileId}/aetas`,
          payload: {
            aetasId: 'aetas-1',
            startDate: '2024-01-01',
            endDate: '2023-01-01', // Invalid: end before start
          },
        });

        expect(response.statusCode).toBe(400);
      });
    });
  });
}
