import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { SerperJobSearchProvider, MockJobSearchProvider } from '../src/search';
import {
  ProductionJobSearchProvider,
  createJobSearchProvider,
  MockJobSearchProvider as HunterMockProvider,
} from '../src/hunter-protocol/job-search';
import type { JobSearchQuery } from '../src/jobs';

describe('MockJobSearchProvider', () => {
  let provider: MockJobSearchProvider;

  beforeEach(() => {
    provider = new MockJobSearchProvider();
  });

  it('should have correct name', () => {
    expect(provider.name).toBe('mock');
  });

  it('should search jobs by keywords', async () => {
    const query: JobSearchQuery = {
      keywords: ['typescript'],
      limit: 10,
    };

    const results = await provider.search(query);

    expect(Array.isArray(results)).toBe(true);
    expect(results.length).toBeGreaterThan(0);
    expect(results[0]).toHaveProperty('id');
    expect(results[0]).toHaveProperty('title');
    expect(results[0]).toHaveProperty('company');
    expect(results[0]).toHaveProperty('status');
    expect(results[0].status).toBe('active');
  });

  it('should filter jobs by keywords', async () => {
    const query: JobSearchQuery = {
      keywords: ['typescript'],
      limit: 20,
    };

    const results = await provider.search(query);

    const hasTypescript = results.some(
      (job) =>
        job.title.toLowerCase().includes('typescript') ||
        job.company.toLowerCase().includes('typescript'),
    );
    expect(hasTypescript).toBe(true);
  });

  it('should include location in search results', async () => {
    const query: JobSearchQuery = {
      keywords: ['engineer'],
      location: 'Remote',
      limit: 10,
    };

    const results = await provider.search(query);

    expect(results.length).toBeGreaterThan(0);
    expect(results[0].location).toBeDefined();
  });

  it('should respect limit parameter', async () => {
    const query: JobSearchQuery = {
      keywords: ['developer'],
      limit: 3,
    };

    const results = await provider.search(query);

    expect(results.length).toBeLessThanOrEqual(3);
  });

  it('should return empty array for non-matching keywords', async () => {
    const query: JobSearchQuery = {
      keywords: ['xyznonexistentkeyword12345'],
      limit: 10,
    };

    const results = await provider.search(query);

    expect(Array.isArray(results)).toBe(true);
    expect(results.length).toBe(0);
  });

  it('should include job descriptions', async () => {
    const query: JobSearchQuery = {
      keywords: ['engineer'],
      limit: 5,
    };

    const results = await provider.search(query);

    expect(results[0]).toHaveProperty('descriptionMarkdown');
    expect(results[0].descriptionMarkdown).toBeTruthy();
    expect(results[0].descriptionMarkdown).toContain('**');
  });

  it('should include salary range when available', async () => {
    const query: JobSearchQuery = {
      keywords: ['engineer'],
      limit: 5,
    };

    const results = await provider.search(query);

    expect(results[0]).toHaveProperty('salaryRange');
    expect(results[0].salaryRange).toBeTruthy();
  });

  it('should return null for getById', async () => {
    const result = await provider.getById('any-id');

    expect(result).toBeNull();
  });

  it('should handle empty keywords array', async () => {
    const query: JobSearchQuery = {
      keywords: [],
      limit: 10,
    };

    const results = await provider.search(query);

    expect(Array.isArray(results)).toBe(true);
    // With empty keywords, might return empty or all jobs depending on implementation
  });

  it('should handle multiple keywords', async () => {
    const query: JobSearchQuery = {
      keywords: ['typescript', 'react', 'engineer'],
      limit: 20,
    };

    const results = await provider.search(query);

    // Should find jobs matching any of the keywords
    expect(results.length).toBeGreaterThanOrEqual(0);
  });
});

describe('SerperJobSearchProvider', () => {
  let provider: SerperJobSearchProvider;
  const originalFetch = global.fetch;

  beforeEach(() => {
    provider = new SerperJobSearchProvider({
      apiKey: 'test-api-key', // allow-secret
    });
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it('should have correct name', () => {
    expect(provider.name).toBe('serper');
  });

  it('should use custom base URL if provided', () => {
    const customProvider = new SerperJobSearchProvider({
      apiKey: 'test-key', // allow-secret
      baseUrl: 'https://custom.serper.dev',
    });

    expect(customProvider).toBeDefined();
  });

  it('should handle API errors gracefully', async () => {
    global.fetch = vi.fn(() =>
      Promise.resolve({
        ok: false,
        status: 401,
        statusText: 'Unauthorized',
      } as Response),
    );

    const query: JobSearchQuery = {
      keywords: ['test'],
      limit: 10,
    };

    await expect(provider.search(query)).rejects.toThrow('Serper API error: 401 Unauthorized');
  });

  it('should wrap network errors with descriptive message', async () => {
    global.fetch = vi.fn(() => Promise.reject(new Error('ECONNREFUSED')));

    const query: JobSearchQuery = {
      keywords: ['test'],
      limit: 10,
    };

    await expect(provider.search(query)).rejects.toThrow('Job search failed: ECONNREFUSED');
  });

  it('should map API response to JobPosting array', async () => {
    global.fetch = vi.fn(() =>
      Promise.resolve({
        ok: true,
        json: () =>
          Promise.resolve({
            searchParameters: { q: 'typescript developer' },
            jobs: [
              {
                title: 'Senior TS Engineer',
                company: 'AcmeCorp',
                description: 'Build amazing stuff',
                location: 'Remote',
                url: 'https://example.com/job/1',
                salary: '$150k-$200k',
                jobType: 'Full-time',
                postedDate: '2026-01-15',
              },
              {
                title: 'Frontend Dev',
                company: 'StartupInc',
                location: 'NYC',
              },
            ],
          }),
      } as Response),
    );

    const results = await provider.search({ keywords: ['typescript'], limit: 10 });

    expect(results).toHaveLength(2);
    expect(results[0]).toMatchObject({
      title: 'Senior TS Engineer',
      company: 'AcmeCorp',
      descriptionMarkdown: 'Build amazing stuff',
      location: 'Remote',
      url: 'https://example.com/job/1',
      salaryRange: '$150k-$200k',
      status: 'active',
    });
    expect(results[0]?.id).toMatch(/^serper_/);
    expect(results[1]?.company).toBe('StartupInc');
  });

  it('should respect limit parameter', async () => {
    global.fetch = vi.fn(() =>
      Promise.resolve({
        ok: true,
        json: () =>
          Promise.resolve({
            searchParameters: {},
            jobs: Array.from({ length: 20 }, (_, i) => ({
              title: `Job ${i}`,
              company: `Company ${i}`,
            })),
          }),
      } as Response),
    );

    const results = await provider.search({ keywords: ['eng'], limit: 5 });

    expect(results).toHaveLength(5);
  });

  it('should construct search query correctly', async () => {
    const mockFetch = vi.fn(() =>
      Promise.resolve({
        ok: true,
        json: () =>
          Promise.resolve({
            jobs: [],
            searchParameters: {},
          }),
      } as Response),
    );

    global.fetch = mockFetch;

    const query: JobSearchQuery = {
      keywords: ['typescript', 'developer'],
      location: 'Remote',
      limit: 10,
    };

    await provider.search(query);

    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('/search'),
      expect.objectContaining({
        method: 'POST',
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        headers: expect.objectContaining({
          'X-API-KEY': 'test-api-key',
          'Content-Type': 'application/json',
        }),
      }),
    );

    const callBody = String(mockFetch.mock.calls[0]?.[1]?.body ?? '{}');
    expect(callBody).toContain('"typescript developer Remote"');
    expect(callBody).toContain('"jobs"');
  });

  it('should handle empty jobs array from API', async () => {
    global.fetch = vi.fn(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ searchParameters: {}, jobs: [] }),
      } as Response),
    );

    const results = await provider.search({ keywords: ['xyz'], limit: 10 });

    expect(results).toEqual([]);
  });

  it('should return null for getById', async () => {
    const result = await provider.getById('any-id');

    expect(result).toBeNull();
  });
});

describe('Job search integration', () => {
  it('should provide consistent interface between providers', async () => {
    const mock = new MockJobSearchProvider();
    const serper = new SerperJobSearchProvider({ apiKey: 'test-key' }); // allow-secret

    const query: JobSearchQuery = {
      keywords: ['engineer'],
      limit: 5,
    };

    // Both should have same method signatures
    expect(typeof mock.search).toBe('function');
    expect(typeof serper.search).toBe('function');
    expect(typeof mock.getById).toBe('function');
    expect(typeof serper.getById).toBe('function');

    // Mock should work
    const mockResults = await mock.search(query);
    expect(Array.isArray(mockResults)).toBe(true);
  });

  it('should handle query with all optional parameters', async () => {
    const provider = new MockJobSearchProvider();

    const query: JobSearchQuery = {
      keywords: ['typescript'],
      location: 'San Francisco, CA',
      remote: true,
      limit: 20,
    };

    const results = await provider.search(query);

    expect(Array.isArray(results)).toBe(true);
    expect(results.length).toBeLessThanOrEqual(20);
  });
});

describe('ProductionJobSearchProvider', () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it('should throw when no API key is configured', async () => {
    const provider = new ProductionJobSearchProvider();

    await expect(provider.search({ keywords: ['test'], locations: [] })).rejects.toThrow(
      'Serper API key not configured',
    );
  });

  it('should delegate to SerperJobSearchProvider when API key is set', async () => {
    global.fetch = vi.fn(() =>
      Promise.resolve({
        ok: true,
        json: () =>
          Promise.resolve({
            searchParameters: {},
            jobs: [{ title: 'Senior Engineer', company: 'TestCorp', location: 'Remote' }],
          }),
      } as Response),
    );

    const provider = new ProductionJobSearchProvider('test-serper-key'); // allow-secret

    const results = await provider.search({
      keywords: ['typescript'],
      locations: ['Remote'],
    });

    expect(results).toHaveLength(1);
    expect(results[0]?.title).toBe('Senior Engineer');
    expect(global.fetch).toHaveBeenCalled();
  });

  it('should map Serper JobPosting back to JobListing format', async () => {
    global.fetch = vi.fn(() =>
      Promise.resolve({
        ok: true,
        json: () =>
          Promise.resolve({
            searchParameters: {},
            jobs: [
              {
                title: 'Staff Engineer',
                company: 'BigCo',
                location: 'NYC',
                url: 'https://example.com/job',
                description: 'Great role',
              },
            ],
          }),
      } as Response),
    );

    const provider = new ProductionJobSearchProvider('test-key'); // allow-secret
    const results = await provider.search({ keywords: ['engineer'] });

    expect(results[0]).toMatchObject({
      title: 'Staff Engineer',
      company: 'BigCo',
      location: 'NYC',
      job_url: 'https://example.com/job',
      description: 'Great role',
      source: 'other',
      technologies: [],
    });
  });
});

describe('createJobSearchProvider', () => {
  const originalEnv = process.env['SERPER_API_KEY'];

  afterEach(() => {
    if (originalEnv !== undefined) {
      process.env['SERPER_API_KEY'] = originalEnv;
    } else {
      delete process.env['SERPER_API_KEY'];
    }
  });

  it('should return MockJobSearchProvider when no API key is set', () => {
    delete process.env['SERPER_API_KEY'];
    const provider = createJobSearchProvider();

    expect(provider.name).toBe('mock-hunter');
  });

  it('should return ProductionJobSearchProvider when SERPER_API_KEY is set', () => {
    process.env['SERPER_API_KEY'] = 'sk-test'; // allow-secret
    const provider = createJobSearchProvider();

    expect(provider.name).toBe('production-hunter');
  });

  it('should return ProductionJobSearchProvider when useProduction flag is true', () => {
    delete process.env['SERPER_API_KEY'];
    const provider = createJobSearchProvider(true);

    expect(provider.name).toBe('production-hunter');
  });
});

describe('HunterMockProvider', () => {
  it('should filter jobs by keywords', async () => {
    const provider = new HunterMockProvider();
    const results = await provider.search({ keywords: ['typescript'] });

    expect(results.length).toBeGreaterThan(0);
    const allMatch = results.every(
      (job) =>
        job.title.toLowerCase().includes('typescript') ||
        job.description.toLowerCase().includes('typescript') ||
        job.requirements.toLowerCase().includes('typescript'),
    );
    expect(allMatch).toBe(true);
  });

  it('should filter jobs by location', async () => {
    const provider = new HunterMockProvider();
    const results = await provider.search({
      keywords: [],
      locations: ['remote'],
    });

    expect(results.length).toBeGreaterThan(0);
  });

  it('should filter by remote requirement', async () => {
    const provider = new HunterMockProvider();
    const results = await provider.search({
      keywords: [],
      remote_requirement: 'fully',
    });

    expect(results.every((j) => j.remote === 'fully')).toBe(true);
  });
});
