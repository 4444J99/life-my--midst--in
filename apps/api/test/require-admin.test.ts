/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access */
import { beforeAll, describe, expect, it } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { buildTestApp } from './app-builder';
import { createAdminMiddleware } from '../src/middleware/require-admin';

describe('require-admin middleware', () => {
  let app: FastifyInstance;
  const adminId = '00000000-0000-0000-0000-000000000001';
  const regularUserId = '00000000-0000-0000-0000-000000000002';

  beforeAll(async () => {
    app = await buildTestApp();

    // Register a test-only route protected by admin middleware
    app.get('/test/admin-only', { preHandler: [createAdminMiddleware()] }, () => ({
      ok: true,
      message: 'admin access granted',
    }));
  });

  it('allows admin users through', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/test/admin-only',
      headers: {
        'x-mock-user-id': adminId,
        'x-mock-roles': 'admin',
      },
    });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.ok).toBe(true);
    expect(body.message).toBe('admin access granted');
  });

  it('rejects non-admin users with 403', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/test/admin-only',
      headers: {
        'x-mock-user-id': regularUserId,
        'x-mock-roles': 'user',
      },
    });
    expect(res.statusCode).toBe(403);
    const body = res.json();
    expect(body.ok).toBe(false);
    expect(body.message).toContain('Admin access required');
  });

  it('allows users with both admin and user roles', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/test/admin-only',
      headers: {
        'x-mock-user-id': regularUserId,
        'x-mock-roles': 'user,admin',
      },
    });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.ok).toBe(true);
  });
});
