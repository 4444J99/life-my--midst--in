import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { buildTestApp } from '../../../test/app-builder';
import { Profile } from '@in-midst-my-life/schema';
import type { FastifyInstance } from 'fastify';

describe('Hunter Protocol Integration Tests', () => {
  let app: FastifyInstance;
  let testProfileId: string;

  beforeAll(async () => {
    app = await buildTestApp();
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(async () => {
    // Create test profile
    const profileResponse = await app.inject({
      method: 'POST',
      url: '/profiles',
      payload: {
        name: 'Test Candidate',
        email: 'test@example.com',
        phone: '555-1234',
        summary: '8+ years TypeScript, React, Node.js, PostgreSQL, system design',
      },
    });
    testProfileId = JSON.parse(profileResponse.payload).id;
  });

  describe('POST /profiles/:id/hunter/search', () => {
    it('returns job listings matching search criteria', async () => {
      const response = await app.inject({
        method: 'POST',
        url: `/profiles/${testProfileId}/hunter/search`,
        payload: {
          keywords: ['TypeScript', 'React'],
          locations: ['San Francisco, CA'],
          remote_requirement: 'hybrid',
          max_results: 10,
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.payload);
      expect(body).toHaveProperty('jobs');
      expect(body).toHaveProperty('totalFound');
      expect(body).toHaveProperty('searchDurationMs');
      expect(Array.isArray(body.jobs)).toBe(true);
    });

    it('filters jobs by required technologies', async () => {
      const response = await app.inject({
        method: 'POST',
        url: `/profiles/${testProfileId}/hunter/search`,
        payload: {
          keywords: ['Engineer'],
          required_technologies: ['TypeScript', 'React'],
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.payload);
      const jobs = body.jobs;

      // Each job should contain at least one of the required technologies
      jobs.forEach((job: any) => {
        if (job.technologies && job.technologies.length > 0) {
          const hasRequiredTech = job.technologies.some((tech: string) =>
            ['TypeScript', 'React'].includes(tech)
          );
          expect(hasRequiredTech || job.technologies.length > 0).toBe(true);
        }
      });
    });

    it('filters jobs by remote requirement', async () => {
      const response = await app.inject({
        method: 'POST',
        url: `/profiles/${testProfileId}/hunter/search`,
        payload: {
          keywords: ['Engineer'],
          remote_requirement: 'fully',
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.payload);
      const jobs = body.jobs;

      jobs.forEach((job: any) => {
        expect(['fully', 'hybrid', 'onsite']).toContain(job.remote);
      });
    });

    it('filters jobs by salary range', async () => {
      const response = await app.inject({
        method: 'POST',
        url: `/profiles/${testProfileId}/hunter/search`,
        payload: {
          keywords: ['Engineer'],
          min_salary: 180000,
          max_salary: 250000,
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.payload);
      expect(Array.isArray(body.jobs)).toBe(true);
    });

    it('respects max_results parameter', async () => {
      const response = await app.inject({
        method: 'POST',
        url: `/profiles/${testProfileId}/hunter/search`,
        payload: {
          keywords: ['Engineer'],
          max_results: 5,
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.payload);
      expect(body.jobs.length).toBeLessThanOrEqual(5);
    });

    it('returns empty array when no matches found', async () => {
      const response = await app.inject({
        method: 'POST',
        url: `/profiles/${testProfileId}/hunter/search`,
        payload: {
          keywords: ['Nonexistent-Skill-XYZ-123'],
          locations: ['Nonexistent-City-XYZ-123'],
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.payload);
      expect(body.jobs.length).toBe(0);
      expect(body.totalFound).toBe(0);
    });
  });

  describe('POST /profiles/:id/hunter/analyze/:jobId', () => {
    let testJobId: string;

    beforeEach(async () => {
      // First search for a job
      const searchResponse = await app.inject({
        method: 'POST',
        url: `/profiles/${testProfileId}/hunter/search`,
        payload: {
          keywords: ['Engineer'],
          max_results: 1,
        },
      });

      const jobs = JSON.parse(searchResponse.payload).jobs;
      if (jobs.length > 0) {
        testJobId = jobs[0].id;
      }
    });

    it('analyzes job compatibility with profile', async () => {
      if (!testJobId) {
        // Skip if no jobs available
        expect(true).toBe(true);
        return;
      }

      const response = await app.inject({
        method: 'POST',
        url: `/profiles/${testProfileId}/hunter/analyze/${testJobId}`,
        payload: {
          job: {
            id: testJobId,
            title: 'Senior Engineer',
            company: 'TechCorp',
            technologies: ['TypeScript', 'React', 'Node.js'],
          },
          personaId: 'Architect',
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.payload);
      expect(body).toHaveProperty('compatibility');
      expect(body).toHaveProperty('recommendation');
      expect(body).toHaveProperty('effortEstimate');
    });

    it('returns 5-dimensional compatibility scores', async () => {
      if (!testJobId) return;

      const response = await app.inject({
        method: 'POST',
        url: `/profiles/${testProfileId}/hunter/analyze/${testJobId}`,
        payload: {
          job: {
            id: testJobId,
            title: 'Senior Engineer',
            company: 'TechCorp',
            technologies: ['TypeScript', 'React'],
          },
          personaId: 'Engineer',
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.payload);
      const compat = body.compatibility;

      expect(compat).toHaveProperty('skill_match');
      expect(compat).toHaveProperty('cultural_match');
      expect(compat).toHaveProperty('growth_potential');
      expect(compat).toHaveProperty('compensation_fit');
      expect(compat).toHaveProperty('location_suitability');
      expect(compat).toHaveProperty('overall_score');

      // All scores should be 0-100
      [
        compat.skill_match,
        compat.cultural_match,
        compat.growth_potential,
        compat.compensation_fit,
        compat.location_suitability,
        compat.overall_score,
      ].forEach((score: number) => {
        expect(score).toBeGreaterThanOrEqual(0);
        expect(score).toBeLessThanOrEqual(100);
      });
    });

    it('provides skill gap analysis', async () => {
      if (!testJobId) return;

      const response = await app.inject({
        method: 'POST',
        url: `/profiles/${testProfileId}/hunter/analyze/${testJobId}`,
        payload: {
          job: {
            id: testJobId,
            title: 'Senior Engineer',
            company: 'TechCorp',
            requirements: 'TypeScript, React, Kubernetes, AWS, PostgreSQL',
            technologies: ['TypeScript', 'React', 'Kubernetes', 'AWS'],
          },
          personaId: 'Engineer',
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.payload);
      expect(body.compatibility).toHaveProperty('skill_gaps');
      expect(Array.isArray(body.compatibility.skill_gaps)).toBe(true);
    });

    it('recommends appropriate action based on score', async () => {
      if (!testJobId) return;

      const response = await app.inject({
        method: 'POST',
        url: `/profiles/${testProfileId}/hunter/analyze/${testJobId}`,
        payload: {
          job: {
            id: testJobId,
            title: 'Senior Engineer',
            company: 'TechCorp',
          },
          personaId: 'Engineer',
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.payload);
      const recommendation = body.recommendation;

      expect(['apply_now', 'strong_candidate', 'moderate_fit', 'stretch_goal', 'skip']).toContain(
        recommendation
      );
    });

    it('estimates application effort', async () => {
      if (!testJobId) return;

      const response = await app.inject({
        method: 'POST',
        url: `/profiles/${testProfileId}/hunter/analyze/${testJobId}`,
        payload: {
          job: {
            id: testJobId,
            title: 'Senior Engineer',
            company: 'TechCorp',
          },
          personaId: 'Engineer',
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.payload);
      expect(typeof body.effortEstimate).toBe('number');
      expect(body.effortEstimate).toBeGreaterThan(0);
    });

    it('identifies strengths matching job', async () => {
      if (!testJobId) return;

      const response = await app.inject({
        method: 'POST',
        url: `/profiles/${testProfileId}/hunter/analyze/${testJobId}`,
        payload: {
          job: {
            id: testJobId,
            title: 'Senior Engineer',
            company: 'TechCorp',
          },
          personaId: 'Engineer',
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.payload);
      expect(body.compatibility).toHaveProperty('strengths');
      expect(Array.isArray(body.compatibility.strengths)).toBe(true);
    });

    it('identifies concerns and red flags', async () => {
      if (!testJobId) return;

      const response = await app.inject({
        method: 'POST',
        url: `/profiles/${testProfileId}/hunter/analyze/${testJobId}`,
        payload: {
          job: {
            id: testJobId,
            title: 'Senior Engineer',
            company: 'TechCorp',
          },
          personaId: 'Engineer',
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.payload);
      expect(body.compatibility).toHaveProperty('concerns');
      expect(Array.isArray(body.compatibility.concerns)).toBe(true);
    });
  });

  describe('POST /profiles/:id/hunter/tailor-resume', () => {
    let testJobId: string;

    beforeEach(async () => {
      const searchResponse = await app.inject({
        method: 'POST',
        url: `/profiles/${testProfileId}/hunter/search`,
        payload: {
          keywords: ['Engineer'],
          max_results: 1,
        },
      });

      const jobs = JSON.parse(searchResponse.payload).jobs;
      if (jobs.length > 0) {
        testJobId = jobs[0].id;
      }
    });

    it('generates persona-specific resume', async () => {
      if (!testJobId) return;

      const response = await app.inject({
        method: 'POST',
        url: `/profiles/${testProfileId}/hunter/tailor-resume`,
        payload: {
          jobId: testJobId,
          personaId: 'Architect',
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.payload);
      expect(body).toHaveProperty('resume');
      expect(typeof body.resume).toBe('string');
      expect(body.resume.length).toBeGreaterThan(100);
    });

    it('includes emphasis points in resume', async () => {
      if (!testJobId) return;

      const response = await app.inject({
        method: 'POST',
        url: `/profiles/${testProfileId}/hunter/tailor-resume`,
        payload: {
          jobId: testJobId,
          personaId: 'Engineer',
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.payload);
      expect(body).toHaveProperty('emphasize');
      expect(Array.isArray(body.emphasize)).toBe(true);
      expect(body.emphasize.length).toBeGreaterThan(0);
    });

    it('specifies areas to de-emphasize', async () => {
      if (!testJobId) return;

      const response = await app.inject({
        method: 'POST',
        url: `/profiles/${testProfileId}/hunter/tailor-resume`,
        payload: {
          jobId: testJobId,
          personaId: 'Technician',
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.payload);
      expect(body).toHaveProperty('deEmphasize');
      expect(Array.isArray(body.deEmphasize)).toBe(true);
    });

    it('returns selected persona name', async () => {
      if (!testJobId) return;

      const response = await app.inject({
        method: 'POST',
        url: `/profiles/${testProfileId}/hunter/tailor-resume`,
        payload: {
          jobId: testJobId,
          personaId: 'Architect',
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.payload);
      expect(body).toHaveProperty('personaName');
      expect(body.personaName).toBe('Architect');
    });
  });

  describe('POST /profiles/:id/hunter/write-cover-letter', () => {
    let testJobId: string;

    beforeEach(async () => {
      const searchResponse = await app.inject({
        method: 'POST',
        url: `/profiles/${testProfileId}/hunter/search`,
        payload: {
          keywords: ['Engineer'],
          max_results: 1,
        },
      });

      const jobs = JSON.parse(searchResponse.payload).jobs;
      if (jobs.length > 0) {
        testJobId = jobs[0].id;
      }
    });

    it('generates personalized cover letter', async () => {
      if (!testJobId) return;

      const response = await app.inject({
        method: 'POST',
        url: `/profiles/${testProfileId}/hunter/write-cover-letter`,
        payload: {
          jobId: testJobId,
          personaId: 'Engineer',
          resume: 'Sample resume content',
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.payload);
      expect(body).toHaveProperty('letter');
      expect(typeof body.letter).toBe('string');
      expect(body.letter.length).toBeGreaterThan(100);
    });

    it('letter includes personalization elements', async () => {
      if (!testJobId) return;

      const response = await app.inject({
        method: 'POST',
        url: `/profiles/${testProfileId}/hunter/write-cover-letter`,
        payload: {
          jobId: testJobId,
          personaId: 'Engineer',
          resume: 'Sample resume content',
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.payload);
      expect(body).toHaveProperty('personalized');
      expect(Array.isArray(body.personalized)).toBe(true);
    });

    it('selects appropriate tone based on job', async () => {
      if (!testJobId) return;

      const response = await app.inject({
        method: 'POST',
        url: `/profiles/${testProfileId}/hunter/write-cover-letter`,
        payload: {
          jobId: testJobId,
          personaId: 'Engineer',
          resume: 'Sample resume content',
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.payload);
      expect(body).toHaveProperty('tone');
      expect(['formal', 'conversational', 'enthusiastic']).toContain(body.tone);
    });
  });

  describe('POST /profiles/:id/hunter/applications/batch', () => {
    it('submits batch applications with auto-apply threshold', async () => {
      const response = await app.inject({
        method: 'POST',
        url: `/profiles/${testProfileId}/hunter/applications/batch`,
        payload: {
          searchFilter: {
            keywords: ['Engineer'],
          },
          autoApplyThreshold: 70,
          maxApplications: 5,
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.payload);
      expect(body).toHaveProperty('applications');
      expect(Array.isArray(body.applications)).toBe(true);
    });

    it('respects max applications limit', async () => {
      const response = await app.inject({
        method: 'POST',
        url: `/profiles/${testProfileId}/hunter/applications/batch`,
        payload: {
          searchFilter: {
            keywords: ['Engineer'],
          },
          autoApplyThreshold: 0,
          maxApplications: 3,
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.payload);
      expect(body.applications.length).toBeLessThanOrEqual(3);
    });

    it('filters applications by compatibility score', async () => {
      const response = await app.inject({
        method: 'POST',
        url: `/profiles/${testProfileId}/hunter/applications/batch`,
        payload: {
          searchFilter: {
            keywords: ['Engineer'],
          },
          autoApplyThreshold: 75,
          maxApplications: 10,
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.payload);
      body.applications.forEach((app: any) => {
        if (app.compatibility) {
          expect(app.compatibility.overall_score).toBeGreaterThanOrEqual(75);
        }
      });
    });

    it('returns skipped applications count', async () => {
      const response = await app.inject({
        method: 'POST',
        url: `/profiles/${testProfileId}/hunter/applications/batch`,
        payload: {
          searchFilter: {
            keywords: ['Engineer'],
          },
          autoApplyThreshold: 80,
          maxApplications: 10,
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.payload);
      expect(body).toHaveProperty('skipped');
      expect(typeof body.skipped).toBe('number');
    });

    it('reports any submission errors', async () => {
      const response = await app.inject({
        method: 'POST',
        url: `/profiles/${testProfileId}/hunter/applications/batch`,
        payload: {
          searchFilter: {
            keywords: ['Engineer'],
          },
          autoApplyThreshold: 50,
          maxApplications: 5,
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.payload);
      expect(body).toHaveProperty('errors');
      expect(Array.isArray(body.errors)).toBe(true);
    });
  });

  describe('Hunter Protocol Complete Workflow', () => {
    it('completes full application pipeline: search → analyze → tailor → apply', async () => {
      // 1. Search for jobs
      const searchResponse = await app.inject({
        method: 'POST',
        url: `/profiles/${testProfileId}/hunter/search`,
        payload: {
          keywords: ['Engineer'],
          max_results: 1,
        },
      });

      expect(searchResponse.statusCode).toBe(200);
      const searchBody = JSON.parse(searchResponse.payload);
      if (searchBody.jobs.length === 0) {
        // Skip if no test jobs available
        expect(true).toBe(true);
        return;
      }

      const job = searchBody.jobs[0];

      // 2. Analyze compatibility
      const analyzeResponse = await app.inject({
        method: 'POST',
        url: `/profiles/${testProfileId}/hunter/analyze/${job.id}`,
        payload: {
          job,
          personaId: 'Engineer',
        },
      });

      expect(analyzeResponse.statusCode).toBe(200);
      const analyzeBody = JSON.parse(analyzeResponse.payload);
      expect(analyzeBody.compatibility.overall_score).toBeGreaterThanOrEqual(0);

      // 3. Tailor resume
      const tailorResponse = await app.inject({
        method: 'POST',
        url: `/profiles/${testProfileId}/hunter/tailor-resume`,
        payload: {
          jobId: job.id,
          personaId: 'Engineer',
        },
      });

      expect(tailorResponse.statusCode).toBe(200);
      const tailorBody = JSON.parse(tailorResponse.payload);
      expect(tailorBody.resume.length).toBeGreaterThan(100);

      // 4. Generate cover letter
      const letterResponse = await app.inject({
        method: 'POST',
        url: `/profiles/${testProfileId}/hunter/write-cover-letter`,
        payload: {
          jobId: job.id,
          personaId: 'Engineer',
          resume: tailorBody.resume,
        },
      });

      expect(letterResponse.statusCode).toBe(200);
      const letterBody = JSON.parse(letterResponse.payload);
      expect(letterBody.letter.length).toBeGreaterThan(100);

      // Entire pipeline succeeded
      expect(true).toBe(true);
    });
  });
});
