/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-argument */
import { beforeAll, describe, expect, it } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { buildTestApp } from './app-builder';

let server: FastifyInstance;

beforeAll(async () => {
  process.env['ORCHESTRATOR_URL'] = '';
  server = await buildTestApp();
});

describe('mask redaction enforcement', () => {
  it('removes redacted timeline entries and obfuscates dates in narratives', async () => {
    const profileId = '2fa85f64-5717-4562-b3fc-2c963f66afa6';
    await server.inject({
      method: 'POST',
      url: '/profiles',
      payload: {
        id: profileId,
        identityId: '2fa85f64-5717-4562-b3fc-2c963f66afa7',
        slug: 'redaction-test',
        displayName: 'Redaction Test',
        title: 'Engineer',
        headline: 'Ships securely',
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-02T00:00:00.000Z',
      },
    });

    await server.inject({
      method: 'PATCH',
      url: '/taxonomy/masks/analyst',
      payload: {
        redaction: {
          private_tags: ['secret'],
          obfuscate_dates: true,
        },
      },
    });

    const res = await server.inject({
      method: 'POST',
      url: `/profiles/${profileId}/narrative`,
      payload: {
        maskId: 'analyst',
        contexts: ['analysis'],
        tags: ['impact'],
        timeline: [
          {
            id: 'secret-1',
            title: 'Secret Project',
            start: '2024-03-10',
            tags: ['secret', 'analysis'],
          },
          {
            id: 'public-1',
            title: 'Public Launch',
            start: '2023-01-01',
            tags: ['public', 'analysis', 'impact'],
          },
        ],
      },
    });

    expect(res.statusCode).toBe(200);
    const body = res.json();
    const highlight = (body.data ?? []).find(
      (block: { title: string }) => block.title === 'Recent Highlights',
    ) as { title: string; body: string } | undefined;
    expect(highlight).toBeTruthy();
    expect(highlight?.body ?? '').toContain('Public Launch');
    expect(highlight?.body ?? '').not.toContain('Secret Project');
    expect(highlight?.body ?? '').not.toContain('2023-01-01');
  });
});
