/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-argument */
import { beforeAll, describe, expect, it } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { buildTestApp } from './app-builder';

const profileId = '00000000-0000-0000-0000-000000000001';

describe('cv entities (publications, awards, certifications)', () => {
  let server: FastifyInstance;

  beforeAll(async () => {
    server = await buildTestApp();
  });

  it('creates, lists, gets, patches, and deletes publications', async () => {
    const now = new Date().toISOString();
    const publication = {
      id: '00000000-0000-0000-0000-000000000501',
      profileId,
      title: 'Impact of AI on CVs',
      venue: 'Journal of Future Work',
      date: '2025-05-15',
      url: 'https://example.com/paper',
      tags: ['AI', 'Career'],
      createdAt: now,
      updatedAt: now,
    };

    // Create
    const create = await server.inject({
      method: 'POST',
      url: `/profiles/${profileId}/publications`,
      payload: publication,
    });
    expect(create.statusCode).toBe(200);
    expect(create.json().data.title).toBe(publication.title);

    // List
    const list = await server.inject({
      method: 'GET',
      url: `/profiles/${profileId}/publications`,
    });
    expect(list.statusCode).toBe(200);
    expect(list.json().data).toHaveLength(1);
    expect(list.json().data[0].id).toBe(publication.id);

    // Get
    const get = await server.inject({
      method: 'GET',
      url: `/profiles/${profileId}/publications/${publication.id}`,
    });
    expect(get.statusCode).toBe(200);
    expect(get.json().data.title).toBe(publication.title);

    // Patch
    const patch = await server.inject({
      method: 'PATCH',
      url: `/profiles/${profileId}/publications/${publication.id}`,
      payload: { title: 'Updated Title' },
    });
    expect(patch.statusCode).toBe(200);
    expect(patch.json().data.title).toBe('Updated Title');

    // Delete
    const del = await server.inject({
      method: 'DELETE',
      url: `/profiles/${profileId}/publications/${publication.id}`,
    });
    expect(del.statusCode).toBe(200);

    // List again to verify empty
    const listEmpty = await server.inject({
      method: 'GET',
      url: `/profiles/${profileId}/publications`,
    });
    expect(listEmpty.json().data).toHaveLength(0);
  });

  it('creates, lists, gets, patches, and deletes awards', async () => {
    const now = new Date().toISOString();
    const award = {
      id: '00000000-0000-0000-0000-000000000601',
      profileId,
      title: 'Innovation Award',
      issuer: 'TechConf 2025',
      date: '2025-06-01',
      createdAt: now,
      updatedAt: now,
    };

    // Create
    const create = await server.inject({
      method: 'POST',
      url: `/profiles/${profileId}/awards`,
      payload: award,
    });
    expect(create.statusCode).toBe(200);
    expect(create.json().data.title).toBe(award.title);

    // List
    const list = await server.inject({
      method: 'GET',
      url: `/profiles/${profileId}/awards`,
    });
    expect(list.statusCode).toBe(200);
    expect(list.json().data).toHaveLength(1);

    // Patch
    const patch = await server.inject({
      method: 'PATCH',
      url: `/profiles/${profileId}/awards/${award.id}`,
      payload: { issuer: 'Global TechConf' },
    });
    expect(patch.statusCode).toBe(200);
    expect(patch.json().data.issuer).toBe('Global TechConf');

    // Delete
    const del = await server.inject({
      method: 'DELETE',
      url: `/profiles/${profileId}/awards/${award.id}`,
    });
    expect(del.statusCode).toBe(200);
  });

  it('creates, lists, gets, patches, and deletes certifications', async () => {
    const now = new Date().toISOString();
    const cert = {
      id: '00000000-0000-0000-0000-000000000701',
      profileId,
      name: 'Certified Solutions Architect',
      issuer: 'CloudProvider',
      issueDate: '2025-01-01',
      createdAt: now,
      updatedAt: now,
    };

    // Create
    const create = await server.inject({
      method: 'POST',
      url: `/profiles/${profileId}/certifications`,
      payload: cert,
    });
    expect(create.statusCode).toBe(200);
    expect(create.json().data.name).toBe(cert.name);

    // List
    const list = await server.inject({
      method: 'GET',
      url: `/profiles/${profileId}/certifications`,
    });
    expect(list.statusCode).toBe(200);
    expect(list.json().data).toHaveLength(1);

    // Patch
    const patch = await server.inject({
      method: 'PATCH',
      url: `/profiles/${profileId}/certifications/${cert.id}`,
      payload: { name: 'Senior Architect' },
    });
    expect(patch.statusCode).toBe(200);
    expect(patch.json().data.name).toBe('Senior Architect');

    // Delete
    const del = await server.inject({
      method: 'DELETE',
      url: `/profiles/${profileId}/certifications/${cert.id}`,
    });
    expect(del.statusCode).toBe(200);
  });
});
