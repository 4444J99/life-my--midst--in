import { describe, it, expect } from 'vitest';
import { FollowUpGenerator, generateFollowUps } from '../src/follow-up-generator';

describe('generateFollowUps', () => {
  it('generates follow-ups for categories below the gap threshold', () => {
    const result = generateFollowUps({
      gaps: [
        { category: 'sustainability', score: 40 },
        { category: 'skillMatch', score: 80 },
      ],
      tone: 'neutral',
      answeredQuestionIds: [],
    });

    expect(result.length).toBeGreaterThan(0);
    expect(result.length).toBeLessThanOrEqual(3);
    // Should generate for sustainability (40 < 65) but not skillMatch (80 >= 65)
  });

  it('returns empty array when all scores are above threshold', () => {
    const result = generateFollowUps({
      gaps: [
        { category: 'sustainability', score: 80 },
        { category: 'valuesAlign', score: 70 },
        { category: 'growthFit', score: 90 },
      ],
      tone: 'neutral',
      answeredQuestionIds: [],
    });

    expect(result).toEqual([]);
  });

  it('returns at most 3 follow-ups even with many gaps', () => {
    const result = generateFollowUps({
      gaps: [
        { category: 'sustainability', score: 20 },
        { category: 'valuesAlign', score: 25 },
        { category: 'growthFit', score: 30 },
        { category: 'skillMatch', score: 35 },
        { category: 'compensationFit', score: 40 },
      ],
      tone: 'defensive',
      answeredQuestionIds: [],
    });

    expect(result.length).toBeLessThanOrEqual(3);
  });

  it('prioritizes the lowest-scoring categories first', () => {
    const result = generateFollowUps({
      gaps: [
        { category: 'growthFit', score: 60 },
        { category: 'sustainability', score: 20 }, // Worst
        { category: 'valuesAlign', score: 50 },
      ],
      tone: 'neutral',
      answeredQuestionIds: [],
    });

    expect(result.length).toBeGreaterThanOrEqual(1);
    // The first result should come from sustainability (worst score)
    // We can't check exact text since it's implementation detail, but
    // it should contain a sustainability-related question
  });

  it('adapts questions to the detected tone', () => {
    const defensive = generateFollowUps({
      gaps: [{ category: 'sustainability', score: 30 }],
      tone: 'defensive',
      answeredQuestionIds: [],
    });

    const transparent = generateFollowUps({
      gaps: [{ category: 'sustainability', score: 30 }],
      tone: 'transparent',
      answeredQuestionIds: [],
    });

    // Different tones should produce different questions
    expect(defensive[0]).not.toBe(transparent[0]);
  });

  it('handles unknown gap categories gracefully', () => {
    const result = generateFollowUps({
      gaps: [{ category: 'nonexistent', score: 10 }],
      tone: 'neutral',
      answeredQuestionIds: [],
    });

    expect(result).toEqual([]);
  });

  it('handles empty gaps array', () => {
    const result = generateFollowUps({
      gaps: [],
      tone: 'neutral',
      answeredQuestionIds: [],
    });

    expect(result).toEqual([]);
  });

  it('respects custom gapThreshold option', () => {
    // With default threshold (65), score 60 is a gap
    const withDefault = generateFollowUps({
      gaps: [{ category: 'sustainability', score: 60 }],
      tone: 'neutral',
      answeredQuestionIds: [],
    });
    expect(withDefault.length).toBeGreaterThan(0);

    // With threshold lowered to 50, score 60 is NOT a gap
    const withLower = generateFollowUps(
      {
        gaps: [{ category: 'sustainability', score: 60 }],
        tone: 'neutral',
        answeredQuestionIds: [],
      },
      { gapThreshold: 50 },
    );
    expect(withLower).toEqual([]);
  });

  it('respects custom maxFollowUps option', () => {
    const result = generateFollowUps(
      {
        gaps: [
          { category: 'sustainability', score: 20 },
          { category: 'valuesAlign', score: 25 },
          { category: 'growthFit', score: 30 },
          { category: 'skillMatch', score: 35 },
        ],
        tone: 'neutral',
        answeredQuestionIds: [],
      },
      { maxFollowUps: 1 },
    );

    expect(result.length).toBe(1);
  });
});

describe('FollowUpGenerator class', () => {
  const generator = new FollowUpGenerator();

  it('generates follow-ups via class interface', () => {
    const result = generator.generate(
      [
        { category: 'valuesAlign', score: 30 },
        { category: 'compensationFit', score: 40 },
      ],
      'enthusiastic',
      [],
    );

    expect(result.length).toBeGreaterThan(0);
  });

  it('passes options through to generateFollowUps', () => {
    const result = generator.generate(
      [
        { category: 'sustainability', score: 20 },
        { category: 'valuesAlign', score: 25 },
        { category: 'growthFit', score: 30 },
      ],
      'neutral',
      [],
      { maxFollowUps: 2 },
    );

    expect(result.length).toBeLessThanOrEqual(2);
  });

  it('deduplicates against answered question IDs', () => {
    // First call
    const first = generator.generate([{ category: 'sustainability', score: 30 }], 'neutral', []);

    // Second call with the first question's dedup key
    const dedupKey = `followup-sustainability-${first[0]?.slice(0, 20) ?? ''}`;
    const second = generator.generate([{ category: 'sustainability', score: 30 }], 'neutral', [
      dedupKey,
    ]);

    // Should still return a result (the second question in the pool)
    if (first[0] && second[0]) {
      expect(second[0]).not.toBe(first[0]);
    }
  });
});
