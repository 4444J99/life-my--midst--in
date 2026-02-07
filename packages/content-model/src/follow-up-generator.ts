/**
 * FollowUpGenerator — generates contextual follow-up questions
 * based on detected compatibility gaps, tone analysis, and
 * previously answered questions.
 *
 * Template-based (no LLM required): maps gap categories × tone
 * to probing questions. The Strategy interface allows swapping
 * in an LLM-based generator later.
 */

import type { InterviewTone } from './tone';

export interface FollowUpOptions {
  /** Score threshold below which a category is considered a "gap" (default: 65) */
  gapThreshold?: number;
  /** Maximum number of follow-up questions to generate (default: 3) */
  maxFollowUps?: number;
}

export interface FollowUpContext {
  /** Compatibility gap categories with scores (0-100) */
  gaps: Array<{ category: string; score: number }>;
  /** Detected tone of the most recent answer */
  tone: InterviewTone;
  /** Question IDs already asked (for deduplication) */
  answeredQuestionIds: string[];
}

/**
 * Gap-category → tone-aware question templates.
 *
 * Each category maps to questions indexed by tone. When a gap
 * is detected (score < threshold), the generator picks questions
 * matching the detected tone — e.g., if the interviewer is being
 * defensive about sustainability, we ask a diplomatically probing
 * question about workload.
 */
const GAP_QUESTIONS: Record<string, Record<InterviewTone, string[]>> = {
  sustainability: {
    defensive: [
      "What does your team's typical week look like during crunch periods?",
      'How do you measure whether your pace is sustainable long-term?',
    ],
    neutral: [
      'What boundaries does your team maintain around working hours?',
      'How do you handle periods of high workload without burning people out?',
    ],
    transparent: [
      'You mentioned challenges — what specific changes have you made to improve sustainability?',
      'What does recovery look like after an intense sprint on your team?',
    ],
    enthusiastic: [
      "That energy is great — how do you ensure it doesn't lead to overwork?",
      'How do you sustain that level of enthusiasm over a multi-year tenure?',
    ],
  },
  valuesAlign: {
    defensive: [
      'Can you give a specific example of when your stated values were tested?',
      "What happens when business goals conflict with your team's values?",
    ],
    neutral: [
      'How do new team members learn about the unwritten cultural norms?',
      "What would a former employee say about your organization's culture?",
    ],
    transparent: [
      "What's one cultural value you're still working to fully embody?",
      "How do you ensure values aren't just aspirational but practiced daily?",
    ],
    enthusiastic: [
      "How do you handle situations where someone doesn't share those values?",
      'What mechanisms exist to hold leadership accountable to these values?',
    ],
  },
  growthFit: {
    defensive: [
      'What specific promotion paths exist for this role beyond the initial title?',
      'How do you differentiate between "growing in the role" and "outgrowing the role"?',
    ],
    neutral: [
      'What does professional development look like in practice, not just in policy?',
      'Can you share an example of someone who grew significantly in this role?',
    ],
    transparent: [
      'Where do you see the biggest growth opportunities in this position?',
      "What skills would someone develop here that they couldn't elsewhere?",
    ],
    enthusiastic: [
      'How do you balance growth opportunities with the need for stability in the role?',
      "What happens when someone's growth trajectory diverges from the team's needs?",
    ],
  },
  skillMatch: {
    defensive: [
      'How do you support someone who needs to develop a required skill on the job?',
      "What's your approach when a strong candidate is missing one key skill?",
    ],
    neutral: [
      'Which skills on the requirements list are truly non-negotiable vs. learnable?',
      'How does the team share knowledge to help close skill gaps?',
    ],
    transparent: [
      'What skill gaps exist on the current team that this hire would help fill?',
      'How do you prioritize which skills matter most for day-one impact?',
    ],
    enthusiastic: [
      'Beyond the listed requirements, what skills would make someone truly exceptional here?',
      'How does the team stay current with evolving skill requirements?',
    ],
  },
  compensationFit: {
    defensive: [
      'Can we discuss the equity structure and how it factors into total compensation?',
      'What non-monetary benefits do you consider part of the overall package?',
    ],
    neutral: [
      'How does your compensation structure compare to market rates for this level?',
      'What does the compensation review cycle look like?',
    ],
    transparent: [
      'You mentioned transparency — is compensation data shared within the team?',
      'How do you ensure pay equity across similar roles?',
    ],
    enthusiastic: [
      'How do you handle compensation when someone significantly exceeds expectations?',
      'What does the path from this salary to the next band look like?',
    ],
  },
};

/** Default score threshold below which a category is considered a "gap" */
const DEFAULT_GAP_THRESHOLD = 65;

/** Default maximum number of follow-up questions */
const DEFAULT_MAX_FOLLOW_UPS = 3;

/**
 * Generate contextual follow-up questions based on compatibility gaps and tone.
 *
 * Returns up to `maxFollowUps` questions that probe the weakest areas of the
 * interview, tailored to the interviewer's detected communication style.
 */
export function generateFollowUps(context: FollowUpContext, options?: FollowUpOptions): string[] {
  const { gaps, tone, answeredQuestionIds } = context;
  const gapThreshold = options?.gapThreshold ?? DEFAULT_GAP_THRESHOLD;
  const maxFollowUps = options?.maxFollowUps ?? DEFAULT_MAX_FOLLOW_UPS;

  // Identify categories with scores below the gap threshold, sorted worst-first
  const activeGaps = gaps.filter((g) => g.score < gapThreshold).sort((a, b) => a.score - b.score);

  if (activeGaps.length === 0) return [];

  const result: string[] = [];
  const used = new Set(answeredQuestionIds);

  for (const gap of activeGaps) {
    if (result.length >= maxFollowUps) break;

    const categoryQuestions = GAP_QUESTIONS[gap.category];
    if (!categoryQuestions) continue;

    const toneQuestions = categoryQuestions[tone] ?? categoryQuestions['neutral'];
    if (!toneQuestions) continue;

    // Pick the first unused question from this category/tone combo
    for (const q of toneQuestions) {
      const qKey = `followup-${gap.category}-${q.slice(0, 20)}`;
      if (!used.has(qKey)) {
        result.push(q);
        used.add(qKey);
        break;
      }
    }
  }

  return result;
}

/**
 * FollowUpGenerator class — wraps generateFollowUps for use in service contexts.
 */
export class FollowUpGenerator {
  generate(
    gaps: Array<{ category: string; score: number }>,
    tone: InterviewTone,
    answeredQuestionIds: string[],
    options?: FollowUpOptions,
  ): string[] {
    return generateFollowUps({ gaps, tone, answeredQuestionIds }, options);
  }
}
