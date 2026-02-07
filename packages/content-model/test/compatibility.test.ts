import { describe, it, expect } from 'vitest';
import { CompatibilityAnalyzer, type InterviewerProfile } from '../src/compatibility';
import type { Profile } from '@in-midst-my-life/schema';

/** Minimal profile fixture for testing */
function makeProfile(overrides: Partial<Profile> = {}): Profile {
  return {
    id: 'test-profile-1',
    identityId: 'test-identity-1',
    slug: 'test-user',
    displayName: 'Test User',
    title: 'Senior Software Engineer',
    headline: 'Full-stack engineer with autonomous learning mindset',
    skills: [
      { name: 'TypeScript', level: 'expert' },
      { name: 'React', level: 'advanced' },
      { name: 'Node.js', level: 'advanced' },
      { name: 'PostgreSQL', level: 'intermediate' },
    ],
    experiences: [
      {
        organizationName: 'Acme Corp',
        roleTitle: 'Senior Engineer',
        startDate: '2020-01-01',
        endDate: '2024-01-01',
        summary: 'Led architecture for distributed systems',
      },
      {
        organizationName: 'StartupCo',
        roleTitle: 'Engineer',
        startDate: '2017-06-01',
        endDate: '2019-12-31',
        summary: 'Built MVPs and shipped features',
      },
    ],
    personalThesis: {
      thesis: 'Building systems that empower autonomous learning and growth',
      invariants: ['clarity', 'autonomy'],
    },
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  } as Profile;
}

/**
 * Minimal interviewer profile fixture.
 * Uses job requirements that align with taxonomy activation contexts
 * (e.g., 'implementation', 'delivery', 'architecture') so that
 * mask resonance scoring produces meaningful results.
 */
function makeInterviewer(overrides: Partial<InterviewerProfile> = {}): InterviewerProfile {
  return {
    organizationName: 'TechCorp',
    hiringManagerName: 'Jane Doe',
    jobTitle: 'Implementation Architect',
    jobRequirements: [
      { skill: 'implementation', level: 'advanced', required: true },
      { skill: 'delivery', level: 'intermediate', required: true },
      { skill: 'architecture', level: 'advanced', required: true },
    ],
    salaryRange: { min: 140000, max: 180000 },
    answers: {
      'q-culture-1': 'We trust our engineers and give them autonomy to make decisions',
      'q-growth-1': 'Our team members learn through challenging projects and mentoring',
    },
    culture: 'We trust our engineers and give them autonomy',
    growth: 'Team members learn through challenging projects',
    kpis: [],
    ...overrides,
  };
}

describe('CompatibilityAnalyzer', () => {
  const analyzer = new CompatibilityAnalyzer();

  describe('analyzeCompatibility', () => {
    it('returns all 5 category scores and overall', () => {
      const result = analyzer.analyzeCompatibility(makeProfile(), makeInterviewer());

      expect(result.scores).toHaveProperty('overall');
      expect(result.scores).toHaveProperty('skillMatch');
      expect(result.scores).toHaveProperty('valuesAlign');
      expect(result.scores).toHaveProperty('growthFit');
      expect(result.scores).toHaveProperty('sustainability');
      expect(result.scores).toHaveProperty('compensationFit');

      // All scores should be 0-100
      for (const value of Object.values(result.scores)) {
        expect(value).toBeGreaterThanOrEqual(0);
        expect(value).toBeLessThanOrEqual(100);
      }
    });

    it('overall is the average of 5 category scores', () => {
      const result = analyzer.analyzeCompatibility(makeProfile(), makeInterviewer());
      const { overall, ...categories } = result.scores;
      const avg = Math.round(Object.values(categories).reduce((a, b) => a + b, 0) / 5);
      expect(overall).toBe(avg);
    });

    it('returns green flags, red flags, and recommendations', () => {
      const result = analyzer.analyzeCompatibility(makeProfile(), makeInterviewer());

      expect(Array.isArray(result.greenFlags)).toBe(true);
      expect(Array.isArray(result.redFlags)).toBe(true);
      expect(Array.isArray(result.recommendations)).toBe(true);
    });

    it('returns mask resonance with proper structure', () => {
      const result = analyzer.analyzeCompatibility(makeProfile(), makeInterviewer());

      expect(Array.isArray(result.maskResonance)).toBe(true);
      expect(result.maskResonance.length).toBeGreaterThan(0);
      expect(result.maskResonance.length).toBeLessThanOrEqual(5);

      for (const entry of result.maskResonance) {
        expect(entry).toHaveProperty('maskName');
        expect(entry).toHaveProperty('fitScore');
        expect(entry).toHaveProperty('reasoning');
        expect(typeof entry.maskName).toBe('string');
        expect(entry.fitScore).toBeGreaterThanOrEqual(10);
        expect(entry.fitScore).toBeLessThanOrEqual(100);
      }
    });
  });

  describe('skill matching', () => {
    it('scores higher when candidate has required skills', () => {
      const profile = makeProfile({
        skills: [
          { name: 'implementation', level: 'expert' },
          { name: 'delivery', level: 'advanced' },
          { name: 'architecture', level: 'advanced' },
        ],
      });
      const result = analyzer.analyzeCompatibility(profile, makeInterviewer());
      expect(result.scores.skillMatch).toBeGreaterThan(50);
    });

    it('scores lower when candidate lacks required skills', () => {
      const profile = makeProfile({ skills: [] });
      const result = analyzer.analyzeCompatibility(profile, makeInterviewer());
      expect(result.scores.skillMatch).toBeLessThanOrEqual(50);
    });

    it('returns 50 when no job requirements specified', () => {
      const interviewer = makeInterviewer({ jobRequirements: [] });
      const result = analyzer.analyzeCompatibility(makeProfile(), interviewer);
      expect(result.scores.skillMatch).toBe(50);
    });
  });

  describe('values alignment', () => {
    it('detects alignment when interviewer language matches candidate values', () => {
      const profile = makeProfile({
        personalThesis: { thesis: 'I value autonomous learning and growth' },
      });
      const interviewer = makeInterviewer({
        answers: {
          q1: 'We trust our team and give them autonomy. Learning is central to our culture.',
        },
      });
      const result = analyzer.analyzeCompatibility(profile, interviewer);
      expect(result.scores.valuesAlign).toBeGreaterThan(0);
    });
  });

  describe('sustainability', () => {
    it('penalizes when interviewer mentions burnout', () => {
      const interviewer = makeInterviewer({
        answers: {
          q1: 'We have experienced some burnout and high churn recently',
        },
      });
      const result = analyzer.analyzeCompatibility(makeProfile(), interviewer);
      expect(result.scores.sustainability).toBeLessThan(75);
    });

    it('boosts when interviewer emphasizes balance', () => {
      const interviewer = makeInterviewer({
        answers: {
          q1: 'We maintain sustainable pace and reasonable work-life balance',
        },
      });
      const result = analyzer.analyzeCompatibility(makeProfile(), interviewer);
      expect(result.scores.sustainability).toBeGreaterThanOrEqual(75);
    });
  });

  describe('compensation', () => {
    it('uses market compensation score when provided', () => {
      const interviewer = makeInterviewer({ marketCompensationScore: 85 });
      const result = analyzer.analyzeCompatibility(makeProfile(), interviewer);
      expect(result.scores.compensationFit).toBe(85);
    });

    it('returns 50 when no salary data available', () => {
      const interviewer = makeInterviewer({
        salaryRange: undefined,
        marketCompensationScore: undefined,
      });
      const result = analyzer.analyzeCompatibility(makeProfile(), interviewer);
      expect(result.scores.compensationFit).toBe(50);
    });
  });

  describe('green and red flags', () => {
    it('detects trust/autonomy as green flag', () => {
      const interviewer = makeInterviewer({
        answers: { q1: 'We have high trust and give people full autonomy' },
      });
      const result = analyzer.analyzeCompatibility(makeProfile(), interviewer);
      expect(result.greenFlags.some((f) => f.includes('trust'))).toBe(true);
    });

    it('detects credential emphasis as red flag', () => {
      const interviewer = makeInterviewer({
        answers: { q1: 'We look for specific credentials and the right degree' },
      });
      const result = analyzer.analyzeCompatibility(makeProfile(), interviewer);
      expect(result.redFlags.some((f) => f.includes('credentials'))).toBe(true);
    });
  });

  describe('mask resonance', () => {
    it('scores masks based on job context from full taxonomy', () => {
      const interviewer = makeInterviewer({
        jobTitle: 'Systems Architect',
        jobRequirements: [
          { skill: 'system design', level: 'expert', required: true },
          { skill: 'architecture', level: 'advanced', required: true },
        ],
      });
      const result = analyzer.analyzeCompatibility(makeProfile(), interviewer);

      // Should return masks from the real taxonomy, not just hardcoded 4
      expect(result.maskResonance.length).toBeGreaterThanOrEqual(1);
      // First mask should have the highest fit score (100 or close)
      const top = result.maskResonance[0];
      expect(top).toBeDefined();
      expect(top!.fitScore).toBeGreaterThanOrEqual(50);
    });

    it('includes reasoning referencing job requirements', () => {
      const result = analyzer.analyzeCompatibility(makeProfile(), makeInterviewer());
      const top = result.maskResonance[0];
      expect(top).toBeDefined();
      expect(top!.reasoning.length).toBeGreaterThan(10);
    });
  });
});
