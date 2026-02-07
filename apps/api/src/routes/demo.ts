import type { FastifyInstance } from 'fastify';

/**
 * Demo route — returns a pre-seeded read-only profile for unauthenticated visitors.
 * Allows portfolio viewers to see the system in action without signing up.
 */

const DEMO_PROFILE_ID = '00000000-0000-4000-a000-000000000001';
const DEMO_IDENTITY_ID = '00000000-0000-4000-a000-000000000002';

const now = new Date().toISOString();

const demoProfile = {
  id: DEMO_PROFILE_ID,
  identityId: DEMO_IDENTITY_ID,
  slug: 'demo-user',
  displayName: 'Alex Rivera',
  title: 'Full-Stack Engineer & Systems Thinker',
  headline: 'Building composable identity systems at the intersection of craft and computation.',
  summaryMarkdown: [
    'A polyglot engineer with 8+ years shipping products across fintech, developer tools, and identity platforms.',
    'Passionate about hexagonal architecture, schema-first design, and making complex systems legible.',
    '',
    'Currently exploring autonomous agent orchestration and verifiable credential ecosystems.',
  ].join('\n'),
  locationText: 'San Francisco, CA',
  skills: [
    { name: 'TypeScript', level: 'expert', category: 'language' },
    { name: 'Node.js', level: 'expert', category: 'runtime' },
    { name: 'React', level: 'advanced', category: 'framework' },
    { name: 'PostgreSQL', level: 'advanced', category: 'database' },
    { name: 'Kubernetes', level: 'intermediate', category: 'infrastructure' },
    { name: 'Rust', level: 'intermediate', category: 'language' },
  ],
  experiences: [
    {
      roleTitle: 'Senior Engineer',
      organization: 'IdentityForge',
      startDate: '2022-01',
      description:
        'Led development of mask-based identity filtering system. Designed DID/VC integration layer.',
    },
    {
      roleTitle: 'Platform Engineer',
      organization: 'DevToolsCo',
      startDate: '2019-06',
      endDate: '2021-12',
      description:
        'Built developer API gateway serving 50K+ requests/sec. Implemented schema-first OpenAPI pipeline.',
    },
    {
      roleTitle: 'Software Engineer',
      organization: 'FinFlow',
      startDate: '2016-09',
      endDate: '2019-05',
      description:
        'Core contributor to real-time payment processing engine. Reduced P99 latency by 40%.',
    },
  ],
  education: [
    {
      institution: 'UC Berkeley',
      degree: 'B.S. Computer Science',
      graduationDate: '2016',
    },
  ],
  languages: ['English', 'Spanish', 'Portuguese'],
  interests: ['Systems thinking', 'Generative art', 'Trail running', 'Fermentation'],
  isActive: true,
  createdAt: now,
  updatedAt: now,
};

const demoMasks = [
  {
    id: 'mask-analyst',
    nomen: 'Analyst',
    motto: 'Data illuminates; interpretation transforms.',
    ontology: 'analyst',
    visibility_scope: ['technical', 'research', 'data-science'],
    activation_rules: {
      contexts: ['technical-review', 'data-analysis', 'research'],
      triggers: ['quantitative', 'metrics', 'performance'],
    },
    stylistic_parameters: {
      tone: 'precise',
      mode: 'analytical',
      compression: 0.7,
    },
  },
  {
    id: 'mask-synthesist',
    nomen: 'Synthesist',
    motto: 'Connections create meaning.',
    ontology: 'synthesist',
    visibility_scope: ['leadership', 'strategy', 'cross-functional'],
    activation_rules: {
      contexts: ['strategy-session', 'cross-team', 'product-review'],
      triggers: ['integration', 'architecture', 'systems'],
    },
    stylistic_parameters: {
      tone: 'connective',
      mode: 'integrative',
      compression: 0.5,
    },
  },
  {
    id: 'mask-artisan',
    nomen: 'Artisan',
    motto: 'Craft is care made visible.',
    ontology: 'artisan',
    visibility_scope: ['engineering', 'code-review', 'mentoring'],
    activation_rules: {
      contexts: ['pair-programming', 'code-review', 'tech-talk'],
      triggers: ['implementation', 'quality', 'craft'],
    },
    stylistic_parameters: {
      tone: 'deliberate',
      mode: 'demonstrative',
      compression: 0.6,
    },
  },
];

const demoNarrativeBlocks = [
  {
    title: 'Identity Architecture',
    body: 'Designed and shipped a **mask-based identity system** enabling context-sensitive professional presentations. Each mask filters and reshapes the same underlying profile data, producing narratives tuned to specific audiences — from technical deep-dives to executive summaries.',
    tags: ['identity', 'architecture', 'DID'],
  },
  {
    title: 'Developer Platform Scale',
    body: 'Built an API gateway serving **50K+ requests/second** with sub-50ms P99 latency. Implemented schema-first OpenAPI pipeline that auto-generated TypeScript clients, validation middleware, and documentation from a single source of truth.',
    tags: ['APIs', 'performance', 'developer-tools'],
  },
  {
    title: 'Real-Time Payment Processing',
    body: 'Core contributor to a distributed payment engine processing millions of transactions daily. Reduced P99 latency by **40%** through connection pooling optimization and intelligent query batching.',
    tags: ['fintech', 'distributed-systems', 'optimization'],
  },
  {
    title: 'Open Source & Community',
    body: 'Active contributor to identity verification standards and open-source tooling. Speaker at DevConf on "Schema-First Design for Evolving APIs" and contributor to W3C Verifiable Credentials working group discussions.',
    tags: ['open-source', 'community', 'standards'],
  },
];

export function demoRoutes(
  fastify: FastifyInstance,
  _opts: Record<string, unknown>,
  done: () => void,
) {
  /**
   * GET /demo/profile — returns the demo profile with masks and sample narrative
   */
  fastify.get('/demo/profile', async (_request, reply) => {
    return reply.send({
      ok: true,
      data: {
        profile: demoProfile,
        masks: demoMasks,
        narrativeBlocks: demoNarrativeBlocks,
        activeMask: demoMasks[0],
      },
    });
  });

  /**
   * GET /demo/masks/:maskId — returns narrative blocks filtered by mask perspective
   */
  fastify.get<{ Params: { maskId: string } }>('/demo/masks/:maskId', async (request, reply) => {
    const { maskId } = request.params;
    const mask = demoMasks.find((m) => m.id === maskId || m.ontology === maskId);

    if (!mask) {
      return reply.code(404).send({ ok: false, error: 'mask_not_found' });
    }

    return reply.send({
      ok: true,
      data: {
        mask,
        narrativeBlocks: demoNarrativeBlocks,
        profile: {
          displayName: demoProfile.displayName,
          title: demoProfile.title,
          headline: demoProfile.headline,
        },
      },
    });
  });

  done();
}
