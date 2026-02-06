import { beforeAll, describe, expect, it } from 'vitest';
import { performance } from 'node:perf_hooks';
import { buildServer } from '../src/index';
import { createProfileRepo, type ProfileRepo } from '../src/repositories/profiles';
import { createCvRepos, type CvRepos } from '../src/repositories/cv';

let server: ReturnType<typeof buildServer>;
let profileRepo: ProfileRepo;
let cvRepos: CvRepos;

const profileId = '88888888-8888-8888-8888-888888888888';
const now = new Date().toISOString();

beforeAll(async () => {
  profileRepo = createProfileRepo({ kind: 'memory' });
  cvRepos = createCvRepos({ kind: 'memory' });
  await profileRepo.reset();
  await cvRepos.experiences.reset();

  await profileRepo.add({
    id: profileId,
    identityId: '77777777-7777-7777-7777-777777777777',
    slug: 'perf',
    displayName: 'Perf Profile',
    title: 'Benchmark',
    headline: 'Testing speed',
    isActive: true,
    createdAt: now,
    updatedAt: now,
  });

  for (let i = 0; i < 25; i += 1) {
    await cvRepos.experiences.create({
      id: `00000000-0000-0000-0000-${String(i).padStart(12, '0')}`,
      profileId,
      roleTitle: `Role ${i}`,
      organization: `Org ${i}`,
      startDate: '2024-01-01',
      isCurrent: false,
      createdAt: now,
      updatedAt: now,
    });
  }

  server = buildServer({ profileRepo, cvRepos });
});

const timeRequest = async (options: Parameters<typeof server.inject>[0]) => {
  const start = performance.now();
  const res = await server.inject(options);
  const elapsed = performance.now() - start;
  return { res, elapsed };
};

describe('API performance budgets', () => {
  it('serves profile reads within budget', async () => {
    const { res, elapsed } = await timeRequest({ method: 'GET', url: `/profiles/${profileId}` });
    expect(res.statusCode).toBe(200);
    expect(elapsed).toBeLessThan(500);
  });

  it('builds narrative within budget', async () => {
    const timeline = Array.from({ length: 25 }, (_, idx) => ({
      id: `timeline-${idx}`,
      title: `Milestone ${idx}`,
      start: '2024-01-01',
      summary: 'Shipped work',
    }));
    const { res, elapsed } = await timeRequest({
      method: 'POST',
      url: `/profiles/${profileId}/narrative`,
      payload: { contexts: ['design'], tags: ['impact'], timeline },
    });
    expect(res.statusCode).toBe(200);
    expect(elapsed).toBeLessThan(300);
  });

  it('exports JSON-LD within budget', async () => {
    const { res, elapsed } = await timeRequest({
      method: 'GET',
      url: `/profiles/${profileId}/export/jsonld`,
    });
    expect(res.statusCode).toBe(200);
    expect(elapsed).toBeLessThan(200);
  });

  it('exports PDF within budget', async () => {
    const { res, elapsed } = await timeRequest({
      method: 'GET',
      url: `/profiles/${profileId}/export/pdf`,
    });
    expect(res.statusCode).toBe(200);
    expect(elapsed).toBeLessThan(450);
  });
});
