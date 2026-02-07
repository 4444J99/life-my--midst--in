/**
 * ToneAnalyzer — keyword-based tone detection for interview answers.
 *
 * Uses a Strategy pattern: the keyword-based approach is the default
 * implementation. Swap in an LLM-based analyzer later by implementing
 * the same interface with a different strategy.
 */

export type InterviewTone = 'defensive' | 'neutral' | 'transparent' | 'enthusiastic';

export interface ToneResult {
  tone: InterviewTone;
  confidence: number; // 0-1
  signals: string[];
}

export interface ToneStrategy {
  analyze(text: string): ToneResult;
}

/** Keyword dictionaries per tone */
const TONE_KEYWORDS: Record<InterviewTone, string[]> = {
  defensive: [
    'but',
    'however',
    'actually',
    'technically',
    "that's not",
    'to be fair',
    'in fairness',
    'not really',
    'i would say',
    'it depends',
    'well',
    'look',
    'let me explain',
    'no offense',
    "that's a misconception",
    'the thing is',
    'you have to understand',
    'with all due respect',
    "i wouldn't say",
  ],
  transparent: [
    'honestly',
    'to be honest',
    'truthfully',
    "i'll be upfront",
    'we struggled',
    'we failed',
    'our mistake',
    'we learned',
    'in hindsight',
    'the reality is',
    'candidly',
    'frankly',
    'i should mention',
    "we're working on",
    'not perfect',
    "here's the truth",
    'we could improve',
    'admitted',
  ],
  enthusiastic: [
    'excited',
    'love',
    'passionate',
    'thrilled',
    'amazing',
    'fantastic',
    'incredible',
    'great opportunity',
    'proud of',
    'really enjoy',
    'absolutely',
    "can't wait",
    'so much',
    'energized',
    'inspired',
    'thriving',
    'exceptional',
    'remarkable',
    'impressive',
  ],
  neutral: [], // neutral is the fallback — no specific keywords
};

/**
 * Keyword-based ToneStrategy.
 *
 * Scores each non-neutral tone by counting keyword matches in the
 * lowercased input text. The tone with the highest count wins;
 * ties and zero-match inputs default to 'neutral'.
 */
export class KeywordToneStrategy implements ToneStrategy {
  analyze(text: string): ToneResult {
    const lower = text.toLowerCase();

    const scores: Array<{ tone: InterviewTone; count: number; signals: string[] }> = [];

    for (const tone of ['defensive', 'transparent', 'enthusiastic'] as InterviewTone[]) {
      const keywords = TONE_KEYWORDS[tone];
      const matched = keywords.filter((kw) => lower.includes(kw));
      scores.push({ tone, count: matched.length, signals: matched });
    }

    // Sort by match count descending
    scores.sort((a, b) => b.count - a.count);

    const best = scores[0];
    if (!best || best.count === 0) {
      return { tone: 'neutral', confidence: 0.5, signals: [] };
    }

    // Confidence scales with match count: 1 match = 0.4, 2 = 0.6, 3+ = 0.8+
    const confidence = Math.min(0.95, 0.2 + best.count * 0.2);

    return {
      tone: best.tone,
      confidence,
      signals: best.signals,
    };
  }
}

/**
 * Main ToneAnalyzer facade.
 * Defaults to keyword-based strategy; accepts custom strategy for testing or LLM upgrade.
 */
export class ToneAnalyzer {
  private strategy: ToneStrategy;

  constructor(strategy?: ToneStrategy) {
    this.strategy = strategy ?? new KeywordToneStrategy();
  }

  analyze(text: string): ToneResult {
    return this.strategy.analyze(text);
  }
}
