/**
 * Role-Family Taxonomy
 *
 * Maps common job titles to role families, each with a curated mask blend.
 * This solves the equivalence problem: "Senior Frontend Engineer", "UI Developer",
 * and "React Lead" are the same role family and should produce the same mask curation.
 *
 * Matching strategy:
 *   1. Exact substring match against aliases (fast path)
 *   2. Fuzzy word-overlap ratio >= 50% (handles reordered/prefixed titles)
 *   3. Returns undefined if no match — caller falls back to keyword scoring
 */

export interface RoleFamilyMaskBlend {
  maskId: string;
  weight: number; // 0-1, relative importance within the blend
}

export interface RoleFamily {
  id: string;
  name: string;
  aliases: string[];
  maskBlend: RoleFamilyMaskBlend[];
  emphasisTags: string[];
  deEmphasisTags: string[];
}

export const ROLE_FAMILIES: RoleFamily[] = [
  {
    id: 'frontend-engineering',
    name: 'Frontend Engineering',
    aliases: [
      'frontend engineer',
      'front-end engineer',
      'front end engineer',
      'ui developer',
      'ui engineer',
      'react developer',
      'react engineer',
      'vue developer',
      'angular developer',
      'web developer',
      'frontend developer',
      'front-end developer',
    ],
    maskBlend: [
      { maskId: 'architect', weight: 0.35 },
      { maskId: 'artisan', weight: 0.3 },
      { maskId: 'integrator', weight: 0.2 },
      { maskId: 'analyst', weight: 0.15 },
    ],
    emphasisTags: ['design', 'quality', 'craft', 'architecture'],
    deEmphasisTags: ['operations', 'compliance'],
  },
  {
    id: 'backend-engineering',
    name: 'Backend Engineering',
    aliases: [
      'backend engineer',
      'back-end engineer',
      'back end engineer',
      'backend developer',
      'back-end developer',
      'server engineer',
      'api developer',
      'api engineer',
      'platform engineer',
      'systems engineer',
      'systems developer',
    ],
    maskBlend: [
      { maskId: 'architect', weight: 0.35 },
      { maskId: 'analyst', weight: 0.25 },
      { maskId: 'steward', weight: 0.2 },
      { maskId: 'executor', weight: 0.2 },
    ],
    emphasisTags: ['architecture', 'reliability', 'system'],
    deEmphasisTags: ['design', 'narrative'],
  },
  {
    id: 'fullstack-engineering',
    name: 'Full-Stack Engineering',
    aliases: [
      'full stack engineer',
      'full-stack engineer',
      'fullstack engineer',
      'full stack developer',
      'full-stack developer',
      'fullstack developer',
      'software engineer',
      'software developer',
    ],
    maskBlend: [
      { maskId: 'integrator', weight: 0.3 },
      { maskId: 'architect', weight: 0.25 },
      { maskId: 'executor', weight: 0.25 },
      { maskId: 'analyst', weight: 0.2 },
    ],
    emphasisTags: ['integration', 'delivery', 'architecture'],
    deEmphasisTags: ['speculation'],
  },
  {
    id: 'engineering-management',
    name: 'Engineering Management',
    aliases: [
      'engineering manager',
      'eng manager',
      'tech lead',
      'technical lead',
      'team lead',
      'development manager',
      'director of engineering',
      'vp of engineering',
      'vp engineering',
      'head of engineering',
    ],
    maskBlend: [
      { maskId: 'steward', weight: 0.3 },
      { maskId: 'strategist', weight: 0.25 },
      { maskId: 'mediator', weight: 0.25 },
      { maskId: 'narrator', weight: 0.2 },
    ],
    emphasisTags: ['alignment', 'roadmap', 'stakeholder'],
    deEmphasisTags: ['craft', 'tactical'],
  },
  {
    id: 'devops-sre',
    name: 'DevOps / SRE',
    aliases: [
      'devops engineer',
      'site reliability engineer',
      'sre',
      'infrastructure engineer',
      'platform engineer',
      'cloud engineer',
      'systems administrator',
      'release engineer',
      'deployment engineer',
    ],
    maskBlend: [
      { maskId: 'custodian', weight: 0.3 },
      { maskId: 'architect', weight: 0.25 },
      { maskId: 'executor', weight: 0.25 },
      { maskId: 'calibrator', weight: 0.2 },
    ],
    emphasisTags: ['reliability', 'observability', 'delivery'],
    deEmphasisTags: ['narrative', 'speculation'],
  },
  {
    id: 'data-engineering',
    name: 'Data Engineering',
    aliases: [
      'data engineer',
      'data scientist',
      'data analyst',
      'machine learning engineer',
      'ml engineer',
      'analytics engineer',
      'business intelligence',
      'bi developer',
    ],
    maskBlend: [
      { maskId: 'analyst', weight: 0.35 },
      { maskId: 'architect', weight: 0.25 },
      { maskId: 'synthesist', weight: 0.2 },
      { maskId: 'observer', weight: 0.2 },
    ],
    emphasisTags: ['analysis', 'metrics', 'research'],
    deEmphasisTags: ['craft', 'alignment'],
  },
  {
    id: 'product-design',
    name: 'Product Design',
    aliases: [
      'product designer',
      'ux designer',
      'ui/ux designer',
      'ux researcher',
      'interaction designer',
      'visual designer',
      'design lead',
      'creative director',
    ],
    maskBlend: [
      { maskId: 'artisan', weight: 0.35 },
      { maskId: 'observer', weight: 0.25 },
      { maskId: 'narrator', weight: 0.2 },
      { maskId: 'mediator', weight: 0.2 },
    ],
    emphasisTags: ['design', 'quality', 'narrative', 'research'],
    deEmphasisTags: ['operations', 'governance'],
  },
  {
    id: 'product-management',
    name: 'Product Management',
    aliases: [
      'product manager',
      'product owner',
      'program manager',
      'technical product manager',
      'group product manager',
      'chief product officer',
      'head of product',
    ],
    maskBlend: [
      { maskId: 'strategist', weight: 0.3 },
      { maskId: 'synthesist', weight: 0.25 },
      { maskId: 'narrator', weight: 0.25 },
      { maskId: 'mediator', weight: 0.2 },
    ],
    emphasisTags: ['roadmap', 'vision', 'stakeholder'],
    deEmphasisTags: ['craft', 'testing'],
  },
  {
    id: 'security-engineering',
    name: 'Security Engineering',
    aliases: [
      'security engineer',
      'application security engineer',
      'appsec engineer',
      'security analyst',
      'penetration tester',
      'security architect',
      'information security',
      'cybersecurity engineer',
    ],
    maskBlend: [
      { maskId: 'custodian', weight: 0.3 },
      { maskId: 'analyst', weight: 0.3 },
      { maskId: 'observer', weight: 0.2 },
      { maskId: 'calibrator', weight: 0.2 },
    ],
    emphasisTags: ['reliability', 'governance', 'quality'],
    deEmphasisTags: ['narrative', 'innovation'],
  },
  {
    id: 'technical-consulting',
    name: 'Technical Consulting',
    aliases: [
      'technical consultant',
      'solutions architect',
      'solutions engineer',
      'sales engineer',
      'developer advocate',
      'developer relations',
      'devrel',
      'technical account manager',
    ],
    maskBlend: [
      { maskId: 'interpreter', weight: 0.3 },
      { maskId: 'mediator', weight: 0.25 },
      { maskId: 'narrator', weight: 0.25 },
      { maskId: 'strategist', weight: 0.2 },
    ],
    emphasisTags: ['communication', 'handoff', 'alignment'],
    deEmphasisTags: ['testing', 'operations'],
  },
];

/**
 * Tokenize a string into lowercase words, stripping common prefixes/suffixes.
 */
function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s/-]/g, '')
    .split(/[\s/]+/)
    .filter((w) => w.length > 1);
}

/**
 * Calculate the overlap ratio between two word sets.
 * Returns 0-1 indicating what fraction of the smaller set appears in the larger.
 */
function wordOverlapRatio(a: string[], b: string[]): number {
  const setA = new Set(a);
  const setB = new Set(b);
  const smaller = setA.size <= setB.size ? setA : setB;
  const larger = setA.size <= setB.size ? setB : setA;

  if (smaller.size === 0) return 0;

  let overlap = 0;
  for (const word of smaller) {
    if (larger.has(word)) overlap++;
  }

  return overlap / smaller.size;
}

/** Common title prefixes/suffixes to strip for better matching */
const NOISE_WORDS = new Set([
  'senior',
  'junior',
  'jr',
  'sr',
  'staff',
  'principal',
  'lead',
  'chief',
  'head',
  'associate',
  'intern',
  'i',
  'ii',
  'iii',
  'iv',
  'v',
]);

/**
 * Normalize a job title by stripping seniority prefixes and noise words.
 */
function normalizeTitle(title: string): string {
  return tokenize(title)
    .filter((w) => !NOISE_WORDS.has(w))
    .join(' ');
}

/**
 * Match a job title to a role family.
 *
 * Pass 1: Substring match — check if the normalized title contains any alias.
 * Pass 2: Fuzzy word overlap — check if >= 50% of words overlap with any alias.
 *
 * Returns undefined if no match is found, allowing the caller to fall back
 * to the existing keyword-based mask scoring.
 */
export function matchRoleFamily(jobTitle: string): RoleFamily | undefined {
  const normalized = normalizeTitle(jobTitle);
  if (normalized.length < 2) return undefined;

  // Pass 1: Substring match (fast path)
  // Only match if the normalized title contains a full alias, or the alias contains the full title
  // Require at least 2 words in the matching side to avoid false positives
  for (const family of ROLE_FAMILIES) {
    for (const alias of family.aliases) {
      if (normalized.includes(alias)) {
        return family;
      }
      // Reverse match: only if normalized is substantive (3+ chars) and multi-word alias contains it
      if (
        normalized.length >= 3 &&
        alias.includes(normalized) &&
        tokenize(normalized).length >= 2
      ) {
        return family;
      }
    }
  }

  // Pass 2: Fuzzy word overlap (>= 50% AND at least 2 overlapping words)
  const titleWords = tokenize(normalized);
  let bestFamily: RoleFamily | undefined;
  let bestRatio = 0;

  for (const family of ROLE_FAMILIES) {
    for (const alias of family.aliases) {
      const aliasWords = tokenize(alias);
      const ratio = wordOverlapRatio(titleWords, aliasWords);
      // Require both a ratio threshold and at least 2 overlapping words
      // to avoid false positives on single-word overlaps like "researcher"
      const smaller = Math.min(titleWords.length, aliasWords.length);
      const overlapCount = Math.round(ratio * smaller);
      if (ratio >= 0.5 && overlapCount >= 2 && ratio > bestRatio) {
        bestRatio = ratio;
        bestFamily = family;
      }
    }
  }

  return bestFamily;
}
