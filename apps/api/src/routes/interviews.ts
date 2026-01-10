import type { FastifyPluginAsync } from "fastify";
import { z } from "zod";
import type { Profile } from "@in-midst-my-life/schema";
import { CompatibilityAnalyzer, type InterviewerProfile } from "@in-midst-my-life/content-model";

const InterviewQuestionSchema = z.object({
  id: z.string(),
  category: z.enum(["culture", "growth", "sustainability", "authenticity", "team"]),
  question: z.string(),
  followUp: z.string().optional(),
  expectedDuration: z.number() // seconds
});

const InterviewAnswerSchema = z.object({
  questionId: z.string(),
  answer: z.string(),
  duration: z.number(), // seconds
  timestamp: z.string().datetime(),
  tone: z.enum(["defensive", "neutral", "transparent", "enthusiastic"]).optional()
});

const InterviewSessionSchema = z.object({
  id: z.string().uuid(),
  profileId: z.string().uuid(),
  interviewerName: z.string(),
  organizationName: z.string(),
  jobTitle: z.string(),
  jobRequirements: z.array(
    z.object({
      skill: z.string(),
      level: z.enum(["novice", "intermediate", "advanced", "expert"]),
      required: z.boolean()
    })
  ),
  salaryRange: z
    .object({
      min: z.number(),
      max: z.number()
    })
    .optional(),
  answers: z.array(InterviewAnswerSchema),
  status: z.enum(["in-progress", "completed", "archived"]),
  compatibilityScore: z.number().optional(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime()
});

type InterviewSession = z.infer<typeof InterviewSessionSchema>;

// Mock storage (would be replaced with database)
const sessions = new Map<string, InterviewSession>();

const DEFAULT_INTERVIEW_QUESTIONS = [
  {
    id: "q-culture-1",
    category: "culture" as const,
    question:
      "Describe a time you made a decision that prioritized people over metrics. What was the outcome?",
    expectedDuration: 120,
    followUp: "How did you know it was the right call?"
  },
  {
    id: "q-culture-2",
    category: "culture" as const,
    question: "What does 'psychological safety' mean in your organization, and how do you foster it?",
    expectedDuration: 90
  },
  {
    id: "q-growth-1",
    category: "growth" as const,
    question:
      "What's the steepest learning curve someone on your team has climbed? How did you support them?",
    expectedDuration: 120
  },
  {
    id: "q-growth-2",
    category: "growth" as const,
    question:
      "How many people from this role have been promoted? What skills helped them get promoted?",
    expectedDuration: 90
  },
  {
    id: "q-sustainability-1",
    category: "sustainability" as const,
    question:
      "Tell me about a hire that looked perfect on paper but was a terrible fit. What did you learn?",
    expectedDuration: 120,
    followUp: "How have you applied that lesson since?"
  },
  {
    id: "q-sustainability-2",
    category: "sustainability" as const,
    question:
      "What's your team's turnover rate, and what do you think are the main reasons people leave?",
    expectedDuration: 90
  },
  {
    id: "q-authenticity-1",
    category: "authenticity" as const,
    question: "When was the last time you changed your mind about something important?",
    expectedDuration: 60,
    followUp: "What made you realize you were wrong?"
  },
  {
    id: "q-authenticity-2",
    category: "authenticity" as const,
    question:
      "If someone failed in this role, what would that failure look like? Be specific and honest.",
    expectedDuration: 120
  },
  {
    id: "q-team-1",
    category: "team" as const,
    question:
      "Describe your ideal team member. What traits are non-negotiable, and which can you work with?",
    expectedDuration: 120
  }
];

export const interviewRoutes: FastifyPluginAsync = async (server) => {
  /**
   * GET /interviews/:profileId/questions
   * Get interview questions for a candidate's profile
   */
  server.get("/interviews/:profileId/questions", async (req, _reply) => {
    const { profileId } = req.params as { profileId: string };

    // Could customize questions based on profile/industry
    // For now, return default set
    return {
      questions: DEFAULT_INTERVIEW_QUESTIONS,
      count: DEFAULT_INTERVIEW_QUESTIONS.length,
      estimatedDuration: DEFAULT_INTERVIEW_QUESTIONS.reduce((sum, q) => sum + q.expectedDuration, 0)
    };
  });

  /**
   * POST /interviews/:profileId/start
   * Start a new interview session
   */
  server.post("/interviews/:profileId/start", async (req, reply) => {
    const { profileId } = req.params as { profileId: string };
    const body = z
      .object({
        interviewerName: z.string(),
        organizationName: z.string(),
        jobTitle: z.string(),
        jobRequirements: z.array(
          z.object({
            skill: z.string(),
            level: z.enum(["novice", "intermediate", "advanced", "expert"]),
            required: z.boolean()
          })
        ),
        salaryRange: z.object({ min: z.number(), max: z.number() }).optional()
      })
      .parse(req.body);

    const sessionId = crypto.randomUUID();
    const now = new Date().toISOString();

    const session: InterviewSession = {
      id: sessionId,
      profileId,
      interviewerName: body.interviewerName,
      organizationName: body.organizationName,
      jobTitle: body.jobTitle,
      jobRequirements: body.jobRequirements,
      salaryRange: body.salaryRange,
      answers: [],
      status: "in-progress",
      createdAt: now,
      updatedAt: now
    };

    sessions.set(sessionId, session);

    return reply.status(201).send({
      sessionId,
      profileId,
      status: "in-progress",
      createdAt: now
    });
  });

  /**
   * POST /interviews/sessions/:sessionId/answer
   * Record an answer to an interview question
   */
  server.post("/interviews/sessions/:sessionId/answer", async (req, reply) => {
    const { sessionId } = req.params as { sessionId: string };
    const body = InterviewAnswerSchema.parse(req.body);

    const session = sessions.get(sessionId);
    if (!session) {
      return reply.status(404).send({ error: "Interview session not found" });
    }

    session.answers.push(body);
    session.updatedAt = new Date().toISOString();
    sessions.set(sessionId, session);

    return reply.send({
      sessionId,
      answerRecorded: true,
      totalAnswers: session.answers.length
    });
  });

  /**
   * POST /interviews/sessions/:sessionId/complete
   * Complete the interview and analyze compatibility
   */
  server.post("/interviews/sessions/:sessionId/complete", async (req, reply) => {
    const { sessionId } = req.params as { sessionId: string };

    const session = sessions.get(sessionId);
    if (!session) {
      return reply.status(404).send({ error: "Interview session not found" });
    }

    // Fetch candidate profile
    const profileResponse = await fetch(`http://localhost:3001/profiles/${session.profileId}`);
    if (!profileResponse.ok) {
      return reply.status(404).send({ error: "Candidate profile not found" });
    }
    const profile = (await profileResponse.json()) as Profile;

    // Build interviewer profile from session data
    const interviewerProfile: InterviewerProfile = {
      organizationName: session.organizationName,
      hiringManagerName: session.interviewerName,
      jobTitle: session.jobTitle,
      jobRequirements: session.jobRequirements,
      salaryRange: session.salaryRange,
      answers: Object.fromEntries(session.answers.map((a) => [a.questionId, a.answer])),
      culture: session.answers
        .filter((a) => a.questionId.includes("culture"))
        .map((a) => a.answer)
        .join(" "),
      growth: session.answers
        .filter((a) => a.questionId.includes("growth"))
        .map((a) => a.answer)
        .join(" "),
      kpis: [] // Could extract from answers
    };

    // Analyze compatibility
    const analyzer = new CompatibilityAnalyzer();
    const analysis = analyzer.analyzeCompatibility(profile, interviewerProfile);

    // Update session
    session.status = "completed";
    session.compatibilityScore = analysis.scores.overall;
    session.updatedAt = new Date().toISOString();
    sessions.set(sessionId, session);

    return reply.send({
      sessionId,
      profileId: session.profileId,
      organization: session.organizationName,
      compatibility: analysis
    });
  });

  /**
   * GET /interviews/sessions/:sessionId
   * Get interview session details and analysis
   */
  server.get("/interviews/sessions/:sessionId", async (req, reply) => {
    const { sessionId } = req.params as { sessionId: string };

    const session = sessions.get(sessionId);
    if (!session) {
      return reply.status(404).send({ error: "Interview session not found" });
    }

    return reply.send(session);
  });

  /**
   * GET /interviews/:profileId/history
   * Get interview history for a candidate
   */
  server.get("/interviews/:profileId/history", async (req, _reply) => {
    const { profileId } = req.params as { profileId: string };

    const history = Array.from(sessions.values()).filter((s) => s.profileId === profileId);

    return {
      profileId,
      totalInterviews: history.length,
      completedInterviews: history.filter((s) => s.status === "completed").length,
      averageCompatibility: Math.round(
        history.filter((s) => s.compatibilityScore).reduce((sum, s) => sum + (s.compatibilityScore ?? 0), 0) /
          Math.max(1, history.filter((s) => s.compatibilityScore).length)
      ),
      interviews: history.map((s) => ({
        sessionId: s.id,
        organization: s.organizationName,
        jobTitle: s.jobTitle,
        status: s.status,
        compatibilityScore: s.compatibilityScore,
        createdAt: s.createdAt,
        completedAt: s.status === "completed" ? s.updatedAt : undefined
      }))
    };
  });
};
