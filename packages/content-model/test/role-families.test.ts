import { describe, it, expect } from 'vitest';
import { matchRoleFamily, ROLE_FAMILIES, type RoleFamily } from '../src/role-families';
import { CompatibilityAnalyzer, type InterviewerProfile } from '../src/compatibility';
import type { Profile } from '@in-midst-my-life/schema';

describe('matchRoleFamily', () => {
  describe('exact substring matching', () => {
    it('matches "Senior Frontend Engineer" → frontend-engineering', () => {
      const result = matchRoleFamily('Senior Frontend Engineer');
      expect(result).toBeDefined();
      expect(result!.id).toBe('frontend-engineering');
    });

    it('matches "React Developer" → frontend-engineering', () => {
      const result = matchRoleFamily('React Developer');
      expect(result).toBeDefined();
      expect(result!.id).toBe('frontend-engineering');
    });

    it('matches "UI Developer" → frontend-engineering (same family)', () => {
      const result = matchRoleFamily('UI Developer');
      expect(result).toBeDefined();
      expect(result!.id).toBe('frontend-engineering');
    });

    it('matches "DevOps Engineer" → devops-sre', () => {
      const result = matchRoleFamily('DevOps Engineer');
      expect(result).toBeDefined();
      expect(result!.id).toBe('devops-sre');
    });

    it('matches "Site Reliability Engineer" → devops-sre', () => {
      const result = matchRoleFamily('Site Reliability Engineer');
      expect(result).toBeDefined();
      expect(result!.id).toBe('devops-sre');
    });

    it('matches "Engineering Manager" → engineering-management', () => {
      const result = matchRoleFamily('Engineering Manager');
      expect(result).toBeDefined();
      expect(result!.id).toBe('engineering-management');
    });

    it('matches "Product Designer" → product-design', () => {
      const result = matchRoleFamily('Product Designer');
      expect(result).toBeDefined();
      expect(result!.id).toBe('product-design');
    });

    it('matches "Data Scientist" → data-engineering', () => {
      const result = matchRoleFamily('Data Scientist');
      expect(result).toBeDefined();
      expect(result!.id).toBe('data-engineering');
    });

    it('matches "Solutions Architect" → technical-consulting', () => {
      const result = matchRoleFamily('Solutions Architect');
      expect(result).toBeDefined();
      expect(result!.id).toBe('technical-consulting');
    });

    it('matches "Security Engineer" → security-engineering', () => {
      const result = matchRoleFamily('Security Engineer');
      expect(result).toBeDefined();
      expect(result!.id).toBe('security-engineering');
    });
  });

  describe('seniority stripping', () => {
    it('strips "Senior" prefix', () => {
      const result = matchRoleFamily('Senior Backend Engineer');
      expect(result).toBeDefined();
      expect(result!.id).toBe('backend-engineering');
    });

    it('strips "Staff" prefix', () => {
      const result = matchRoleFamily('Staff Software Engineer');
      expect(result).toBeDefined();
      expect(result!.id).toBe('fullstack-engineering');
    });

    it('strips "Principal" prefix', () => {
      const result = matchRoleFamily('Principal Product Manager');
      expect(result).toBeDefined();
      expect(result!.id).toBe('product-management');
    });

    it('strips "Junior" prefix', () => {
      const result = matchRoleFamily('Junior Frontend Developer');
      expect(result).toBeDefined();
      expect(result!.id).toBe('frontend-engineering');
    });
  });

  describe('fuzzy word overlap matching', () => {
    it('matches reordered titles via word overlap', () => {
      // "cloud infrastructure engineer" overlaps with "infrastructure engineer" alias
      const result = matchRoleFamily('Cloud Infrastructure Engineer');
      expect(result).toBeDefined();
      expect(result!.id).toBe('devops-sre');
    });
  });

  describe('no match (fallback)', () => {
    it('returns undefined for unrecognized roles', () => {
      expect(matchRoleFamily('Chief Happiness Officer')).toBeUndefined();
    });

    it('returns undefined for empty string', () => {
      expect(matchRoleFamily('')).toBeUndefined();
    });

    it('returns undefined for very specialized titles', () => {
      expect(matchRoleFamily('Quantum Computing Researcher')).toBeUndefined();
    });
  });

  describe('role family equivalence', () => {
    it('maps equivalent frontend titles to the same family', () => {
      const titles = ['Senior Frontend Engineer', 'UI Developer', 'React Developer'];
      const families = titles.map((t) => matchRoleFamily(t));
      const ids = families.map((f) => f?.id);

      expect(ids[0]).toBe('frontend-engineering');
      expect(ids[1]).toBe('frontend-engineering');
      expect(ids[2]).toBe('frontend-engineering');
    });

    it('maps equivalent backend titles to the same family', () => {
      const titles = ['Backend Engineer', 'API Developer', 'Server Engineer'];
      const families = titles.map((t) => matchRoleFamily(t));
      const ids = families.map((f) => f?.id);

      expect(ids.every((id) => id === 'backend-engineering')).toBe(true);
    });
  });
});

describe('ROLE_FAMILIES taxonomy', () => {
  it('has 10 families', () => {
    expect(ROLE_FAMILIES).toHaveLength(10);
  });

  it('each family has unique id', () => {
    const ids = ROLE_FAMILIES.map((f) => f.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('each family has mask blend weights summing to ~1.0', () => {
    for (const family of ROLE_FAMILIES) {
      const totalWeight = family.maskBlend.reduce((sum, b) => sum + b.weight, 0);
      expect(totalWeight).toBeCloseTo(1.0, 1);
    }
  });

  it('each family has at least 2 aliases', () => {
    for (const family of ROLE_FAMILIES) {
      expect(family.aliases.length).toBeGreaterThanOrEqual(2);
    }
  });

  it('all mask IDs in blends are valid taxonomy masks', () => {
    const validMaskIds = [
      'analyst',
      'synthesist',
      'observer',
      'strategist',
      'speculator',
      'interpreter',
      'artisan',
      'architect',
      'narrator',
      'provoker',
      'mediator',
      'executor',
      'steward',
      'integrator',
      'custodian',
      'calibrator',
    ];
    for (const family of ROLE_FAMILIES) {
      for (const blend of family.maskBlend) {
        expect(validMaskIds).toContain(blend.maskId);
      }
    }
  });
});

describe('analyzeMaskResonance integration with role families', () => {
  const analyzer = new CompatibilityAnalyzer();

  function makeProfile(): Profile {
    return {
      id: 'test-1',
      identityId: 'id-1',
      slug: 'test',
      displayName: 'Test',
      title: 'Engineer',
      headline: 'Test',
      skills: [
        { name: 'TypeScript', level: 'expert' },
        { name: 'React', level: 'advanced' },
      ],
      experiences: [
        {
          organizationName: 'Acme',
          roleTitle: 'Engineer',
          startDate: '2020-01-01',
          summary: 'Built things',
        },
      ],
      personalThesis: {
        thesis: 'Building autonomous learning systems',
        invariants: ['clarity'],
      },
      isActive: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    } as Profile;
  }

  function makeInterviewer(overrides: Partial<InterviewerProfile> = {}): InterviewerProfile {
    return {
      organizationName: 'TestCorp',
      hiringManagerName: 'Jane',
      jobTitle: 'Senior Frontend Engineer',
      jobRequirements: [
        { skill: 'React', level: 'advanced', required: true },
        { skill: 'TypeScript', level: 'expert', required: true },
      ],
      answers: { q1: 'We value trust and autonomy' },
      ...overrides,
    };
  }

  it('uses role-family curated masks for recognized job titles', () => {
    const result = analyzer.analyzeCompatibility(makeProfile(), makeInterviewer());

    // Should return curated masks for frontend-engineering
    expect(result.maskResonance.length).toBe(4); // 4 masks in blend
    expect(result.maskResonance[0]!.maskName).toBe('Architect');
    expect(result.maskResonance[0]!.fitScore).toBe(35);
    expect(result.maskResonance[0]!.reasoning).toContain('Frontend Engineering');
  });

  it('falls back to keyword scoring for unrecognized titles', () => {
    const result = analyzer.analyzeCompatibility(
      makeProfile(),
      makeInterviewer({ jobTitle: 'Chief Happiness Officer' }),
    );

    // Should use keyword-based scoring (up to 5 masks)
    expect(result.maskResonance.length).toBeLessThanOrEqual(5);
    // These won't reference a role family in reasoning
    for (const entry of result.maskResonance) {
      expect(entry.reasoning).not.toContain('role family');
    }
  });

  it('produces consistent results for equivalent titles', () => {
    const titles = ['Senior Frontend Engineer', 'React Developer', 'UI Developer'];
    const results = titles.map((title) =>
      analyzer.analyzeCompatibility(makeProfile(), makeInterviewer({ jobTitle: title })),
    );

    // All should produce the same mask resonance (role-family curated)
    const firstMasks = results[0]!.maskResonance.map((m) => m.maskName);
    for (const result of results) {
      const masks = result.maskResonance.map((m) => m.maskName);
      expect(masks).toEqual(firstMasks);
    }
  });
});
