/* eslint-disable @typescript-eslint/require-await, @typescript-eslint/no-unused-vars, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-explicit-any */
import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import type { Profile } from '@in-midst-my-life/schema';
import {
  CompatibilityAnalyzer,
  ToneAnalyzer,
  selectWeightedMasks,
  MASK_TAXONOMY,
  type InterviewerProfile,
} from '@in-midst-my-life/content-model';
import type {
  InterviewSessionRepo,
  InterviewSessionRecord,
} from '../repositories/interview-sessions';
import { createInterviewSessionRepo } from '../repositories/interview-sessions';
import type { PubSubEngine } from '../services/pubsub';
import { interviewScoreUpdatedTopic, interviewCompletedTopic } from '../services/pubsub';

const InterviewAnswerSchema = z.object({
  questionId: z.string(),
  answer: z.string(),
  duration: z.number(), // seconds
  timestamp: z.string().datetime(),
  tone: z.enum(['defensive', 'neutral', 'transparent', 'enthusiastic']).optional(),
});

type QuestionCategory =
  | 'culture'
  | 'growth'
  | 'sustainability'
  | 'authenticity'
  | 'team'
  | 'technical'
  | 'leadership'
  | 'values';

interface InterviewQuestion {
  id: string;
  category: QuestionCategory;
  question: string;
  expectedDuration: number;
  followUp?: string;
  /** Tags that trigger this question (matched against job requirements/context) */
  contextTags?: string[];
}

/**
 * Full question pool — dynamically filtered based on job context.
 * The GET /questions endpoint selects from this pool based on
 * the job title, required skills, and requested categories.
 */
const QUESTION_POOL: InterviewQuestion[] = [
  // ── Culture ──
  {
    id: 'q-culture-1',
    category: 'culture',
    question:
      'Describe a time you made a decision that prioritized people over metrics. What was the outcome?',
    expectedDuration: 120,
    followUp: 'How did you know it was the right call?',
  },
  {
    id: 'q-culture-2',
    category: 'culture',
    question:
      "What does 'psychological safety' mean in your organization, and how do you foster it?",
    expectedDuration: 90,
  },
  {
    id: 'q-culture-3',
    category: 'culture',
    question: 'How do you handle disagreements between team members with strongly held opinions?',
    expectedDuration: 90,
    contextTags: ['collaboration', 'teamwork', 'management'],
  },
  // ── Growth ──
  {
    id: 'q-growth-1',
    category: 'growth',
    question:
      "What's the steepest learning curve someone on your team has climbed? How did you support them?",
    expectedDuration: 120,
  },
  {
    id: 'q-growth-2',
    category: 'growth',
    question:
      'How many people from this role have been promoted? What skills helped them get promoted?',
    expectedDuration: 90,
  },
  {
    id: 'q-growth-3',
    category: 'growth',
    question: 'What training budget or professional development opportunities do you offer?',
    expectedDuration: 60,
    contextTags: ['career', 'development', 'learning'],
  },
  // ── Sustainability ──
  {
    id: 'q-sustainability-1',
    category: 'sustainability',
    question:
      'Tell me about a hire that looked perfect on paper but was a terrible fit. What did you learn?',
    expectedDuration: 120,
    followUp: 'How have you applied that lesson since?',
  },
  {
    id: 'q-sustainability-2',
    category: 'sustainability',
    question:
      "What's your team's turnover rate, and what do you think are the main reasons people leave?",
    expectedDuration: 90,
  },
  // ── Authenticity ──
  {
    id: 'q-authenticity-1',
    category: 'authenticity',
    question: 'When was the last time you changed your mind about something important?',
    expectedDuration: 60,
    followUp: 'What made you realize you were wrong?',
  },
  {
    id: 'q-authenticity-2',
    category: 'authenticity',
    question:
      'If someone failed in this role, what would that failure look like? Be specific and honest.',
    expectedDuration: 120,
  },
  // ── Team ──
  {
    id: 'q-team-1',
    category: 'team',
    question:
      'Describe your ideal team member. What traits are non-negotiable, and which can you work with?',
    expectedDuration: 120,
  },
  {
    id: 'q-team-2',
    category: 'team',
    question: 'How does your team handle on-call, overtime, or crunch periods?',
    expectedDuration: 90,
    contextTags: ['engineering', 'operations', 'devops', 'infrastructure'],
  },
  // ── Technical ──
  {
    id: 'q-technical-1',
    category: 'technical',
    question: 'Walk me through your deployment pipeline. How often do you ship to production?',
    expectedDuration: 120,
    contextTags: ['engineering', 'software', 'development', 'devops'],
  },
  {
    id: 'q-technical-2',
    category: 'technical',
    question:
      "What's your approach to technical debt? How do you balance feature work with maintenance?",
    expectedDuration: 90,
    contextTags: ['engineering', 'software', 'architecture'],
  },
  {
    id: 'q-technical-3',
    category: 'technical',
    question: 'How do you evaluate architectural decisions? Who has input, and who has final say?',
    expectedDuration: 90,
    contextTags: ['architecture', 'engineering', 'systems'],
  },
  // ── Leadership ──
  {
    id: 'q-leadership-1',
    category: 'leadership',
    question: 'How do you measure your own success as a leader? What metrics matter to you?',
    expectedDuration: 90,
    contextTags: ['management', 'leadership', 'director', 'vp'],
  },
  {
    id: 'q-leadership-2',
    category: 'leadership',
    question:
      'Describe a project that failed under your leadership. What would you do differently?',
    expectedDuration: 120,
    contextTags: ['management', 'leadership', 'senior'],
  },
  // ── Values ──
  {
    id: 'q-values-1',
    category: 'values',
    question:
      'What does your organization do when business objectives conflict with employee wellbeing?',
    expectedDuration: 120,
  },
  {
    id: 'q-values-2',
    category: 'values',
    question:
      'How transparent is compensation within the team? Can people discuss salaries openly?',
    expectedDuration: 60,
    contextTags: ['compensation', 'equity', 'transparency'],
  },
];

/**
 * Select questions dynamically based on job context.
 * Prioritizes questions whose contextTags match the job's skills/title,
 * ensures category diversity, and caps at the requested limit.
 */
function selectQuestions(options: {
  categories?: QuestionCategory[];
  jobTitle?: string;
  skills?: string[];
  limit?: number;
}): InterviewQuestion[] {
  const limit = options.limit ?? 9;
  const jobContext = new Set(
    [...(options.skills ?? []), ...(options.jobTitle ?? '').toLowerCase().split(/\s+/)].map((s) =>
      s.toLowerCase(),
    ),
  );

  // Filter by requested categories (if any)
  const pool = options.categories?.length
    ? QUESTION_POOL.filter((q) => options.categories!.includes(q.category))
    : [...QUESTION_POOL];

  // Score by context relevance
  const scored = pool.map((q) => {
    const tagScore = (q.contextTags ?? []).filter((t) => jobContext.has(t.toLowerCase())).length;
    return { question: q, score: tagScore };
  });

  // Sort: context-relevant first, then shuffle within same score for variety
  scored.sort((a, b) => b.score - a.score);

  // Pick up to `limit`, ensuring category diversity (max 3 per category)
  const selected: InterviewQuestion[] = [];
  const categoryCount = new Map<string, number>();

  for (const { question } of scored) {
    if (selected.length >= limit) break;
    const count = categoryCount.get(question.category) ?? 0;
    if (count >= 3) continue;
    selected.push(question);
    categoryCount.set(question.category, count + 1);
  }

  return selected;
}

/**
 * Build an InterviewerProfile from session data for the CompatibilityAnalyzer.
 */
function buildInterviewerProfile(session: InterviewSessionRecord): InterviewerProfile {
  return {
    organizationName: session.organizationName,
    hiringManagerName: session.interviewerName,
    jobTitle: session.jobTitle,
    jobRequirements: session.jobRequirements as any,
    salaryRange: session.salaryRange as any,
    answers: Object.fromEntries(session.answers.map((a) => [a.questionId, a.answer])),
    culture: session.answers
      .filter((a) => a.questionId.includes('culture'))
      .map((a) => a.answer)
      .join(' '),
    growth: session.answers
      .filter((a) => a.questionId.includes('growth'))
      .map((a) => a.answer)
      .join(' '),
    kpis: [],
  };
}

const toneAnalyzer = new ToneAnalyzer();
const compatibilityAnalyzer = new CompatibilityAnalyzer();

export const interviewRoutes: FastifyPluginAsync = async (server) => {
  // Resolve dependencies: repo + pubsub are injected via server.decorate or fallback
  const repo: InterviewSessionRepo =
    (server as any)['interviewSessionRepo'] ?? createInterviewSessionRepo();
  const pubsub: PubSubEngine | undefined = (server as any)['pubsub'];

  /**
   * GET /interviews/:profileId/questions
   * Get interview questions for a candidate's profile.
   *
   * Query params:
   *   - jobTitle: string — filters questions relevant to the role
   *   - skills: comma-separated — matches question contextTags
   *   - categories: comma-separated QuestionCategory values
   *   - limit: number (default 9, max 20)
   */
  server.get('/interviews/:profileId/questions', async (req, _reply) => {
    const query = req.query as {
      jobTitle?: string;
      skills?: string;
      categories?: string;
      limit?: string;
    };

    const skills = query.skills
      ?.split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    const categories = query.categories
      ?.split(',')
      .map((c) => c.trim())
      .filter(Boolean) as QuestionCategory[] | undefined;
    const limit = Math.min(Number(query.limit) || 9, 20);

    const questions = selectQuestions({
      jobTitle: query.jobTitle,
      skills,
      categories,
      limit,
    });

    return {
      questions,
      count: questions.length,
      estimatedDuration: questions.reduce((sum, q) => sum + q.expectedDuration, 0),
    };
  });

  /**
   * POST /interviews/:profileId/start
   * Start a new interview session
   */
  server.post('/interviews/:profileId/start', async (req, reply) => {
    const { profileId } = req.params as { profileId: string };
    const body = z
      .object({
        interviewerName: z.string(),
        organizationName: z.string(),
        jobTitle: z.string(),
        jobRequirements: z.array(
          z.object({
            skill: z.string(),
            level: z.enum(['novice', 'intermediate', 'advanced', 'expert']),
            required: z.boolean(),
          }),
        ),
        salaryRange: z.object({ min: z.number(), max: z.number() }).optional(),
      })
      .parse(req.body);

    const sessionId = crypto.randomUUID();
    const now = new Date().toISOString();

    const session: InterviewSessionRecord = {
      id: sessionId,
      profileId,
      interviewerName: body.interviewerName,
      organizationName: body.organizationName,
      jobTitle: body.jobTitle,
      jobRequirements: body.jobRequirements,
      salaryRange: body.salaryRange,
      answers: [],
      status: 'in-progress',
      createdAt: now,
      updatedAt: now,
    };

    await repo.create(session);

    return reply.status(201).send({
      sessionId,
      profileId,
      status: 'in-progress',
      createdAt: now,
    });
  });

  /**
   * POST /interviews/sessions/:sessionId/answer
   * Record an answer to an interview question.
   * Runs incremental tone analysis and publishes a score update event.
   */
  server.post('/interviews/sessions/:sessionId/answer', async (req, reply) => {
    const { sessionId } = req.params as { sessionId: string };
    const body = InterviewAnswerSchema.parse(req.body);

    const session = await repo.find(sessionId);
    if (!session) {
      return reply.status(404).send({ error: 'Interview session not found' });
    }

    // Auto-detect tone if not provided by the client
    const tone = body.tone ?? toneAnalyzer.analyze(body.answer).tone;

    const answer = { ...body, tone };
    session.answers.push(answer);
    const now = new Date().toISOString();

    await repo.update(sessionId, {
      answers: session.answers,
      updatedAt: now,
    });

    // Run incremental scoring if we have enough answers (2+) and publish event
    let incrementalScore: Record<string, unknown> | undefined;
    if (session.answers.length >= 2 && pubsub) {
      try {
        // Build a partial interviewer profile from answers so far
        const partial = buildInterviewerProfile(session);
        // Fetch candidate profile for scoring
        const profileResponse = await fetch(`http://localhost:3001/profiles/${session.profileId}`);
        if (profileResponse.ok) {
          const profile = (await profileResponse.json()) as Profile;
          const analysis = compatibilityAnalyzer.analyzeCompatibility(profile, partial);

          incrementalScore = {
            sessionId,
            profileId: session.profileId,
            answersCount: session.answers.length,
            overallScore: analysis.scores.overall,
            categoryScores: {
              skillMatch: analysis.scores.skillMatch,
              valuesAlign: analysis.scores.valuesAlign,
              growthFit: analysis.scores.growthFit,
              sustainability: analysis.scores.sustainability,
              compensationFit: analysis.scores.compensationFit,
            },
            updatedAt: now,
          };

          void pubsub.publish(interviewScoreUpdatedTopic(sessionId), incrementalScore);
        }
      } catch {
        // Incremental scoring is best-effort; don't fail the answer recording
      }
    }

    return reply.send({
      sessionId,
      answerRecorded: true,
      totalAnswers: session.answers.length,
      tone,
      ...(incrementalScore ? { incrementalScore } : {}),
    });
  });

  /**
   * POST /interviews/sessions/:sessionId/complete
   * Complete the interview and analyze compatibility
   */
  server.post('/interviews/sessions/:sessionId/complete', async (req, reply) => {
    const { sessionId } = req.params as { sessionId: string };

    const session = await repo.find(sessionId);
    if (!session) {
      return reply.status(404).send({ error: 'Interview session not found' });
    }

    // Fetch candidate profile
    const profileResponse = await fetch(`http://localhost:3001/profiles/${session.profileId}`);
    if (!profileResponse.ok) {
      return reply.status(404).send({ error: 'Candidate profile not found' });
    }
    const profile = (await profileResponse.json()) as Profile;

    // Build interviewer profile from session data
    const interviewerProfile = buildInterviewerProfile(session);

    // Analyze compatibility
    const analysis = compatibilityAnalyzer.analyzeCompatibility(profile, interviewerProfile);
    const now = new Date().toISOString();

    // Persist final results
    await repo.update(sessionId, {
      status: 'completed',
      compatibilityScore: analysis.scores.overall,
      compatibilityAnalysis: analysis as unknown as Record<string, unknown>,
      updatedAt: now,
    });

    // Publish completion event
    if (pubsub) {
      const completedSession = await repo.find(sessionId);
      if (completedSession) {
        void pubsub.publish(interviewCompletedTopic(sessionId), completedSession);
      }
    }

    return reply.send({
      sessionId,
      profileId: session.profileId,
      organization: session.organizationName,
      compatibility: analysis,
    });
  });

  /**
   * GET /interviews/sessions/:sessionId
   * Get interview session details and analysis
   */
  server.get('/interviews/sessions/:sessionId', async (req, reply) => {
    const { sessionId } = req.params as { sessionId: string };

    const session = await repo.find(sessionId);
    if (!session) {
      return reply.status(404).send({ error: 'Interview session not found' });
    }

    return reply.send(session);
  });

  /**
   * POST /interviews/sessions/:sessionId/suggest-masks
   * Suggest identity masks based on accumulated interview context.
   * Uses job requirements, answers, and session metadata as scoring input.
   */
  server.post('/interviews/sessions/:sessionId/suggest-masks', async (req, reply) => {
    const { sessionId } = req.params as { sessionId: string };

    const session = await repo.find(sessionId);
    if (!session) {
      return reply.status(404).send({ error: 'Interview session not found' });
    }

    // Build context from job requirements + answer content
    const contexts = [
      session.jobTitle.toLowerCase(),
      ...session.jobRequirements.map((r) => r.skill.toLowerCase()),
    ];
    const tags = [
      ...session.answers
        .flatMap((a) => a.questionId.split('-').filter((s) => s !== 'q'))
        .filter(Boolean),
      ...session.jobRequirements.filter((r) => r.required).map((r) => r.skill.toLowerCase()),
    ];

    // selectWeightedMasks scoring only reads contexts/tags/availableMasks
    // from the view config — profile is unused by the mask weight algorithm
    const weighted = selectWeightedMasks({
      contexts,
      tags,
      availableMasks: MASK_TAXONOMY,
      profile: {} as any,
    });

    return reply.send({
      sessionId,
      suggestions: weighted.slice(0, 5).map((w) => ({
        maskId: w.mask.id,
        maskName: w.mask.name,
        ontology: w.mask.ontology,
        score: w.score,
        functionalScope: w.mask.functional_scope,
      })),
    });
  });

  /**
   * GET /interviews/:profileId/history
   * Get interview history for a candidate
   */
  server.get('/interviews/:profileId/history', async (req, _reply) => {
    const { profileId } = req.params as { profileId: string };

    const history = await repo.listByProfile(profileId);

    return {
      profileId,
      totalInterviews: history.length,
      completedInterviews: history.filter((s) => s.status === 'completed').length,
      averageCompatibility: Math.round(
        history
          .filter((s) => s.compatibilityScore)
          .reduce((sum, s) => sum + (s.compatibilityScore ?? 0), 0) /
          Math.max(1, history.filter((s) => s.compatibilityScore).length),
      ),
      interviews: history.map((s) => ({
        sessionId: s.id,
        organization: s.organizationName,
        jobTitle: s.jobTitle,
        status: s.status,
        compatibilityScore: s.compatibilityScore,
        createdAt: s.createdAt,
        completedAt: s.status === 'completed' ? s.updatedAt : undefined,
      })),
    };
  });
};
