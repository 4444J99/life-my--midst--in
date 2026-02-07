import { describe, it, expect } from 'vitest';
import { ToneAnalyzer, KeywordToneStrategy } from '../src/tone';

describe('ToneAnalyzer', () => {
  const analyzer = new ToneAnalyzer();

  it('detects defensive tone from keyword signals', () => {
    const result = analyzer.analyze(
      "Well, actually, that's not how we do things. The thing is, it depends on the situation.",
    );
    expect(result.tone).toBe('defensive');
    expect(result.confidence).toBeGreaterThan(0.5);
    expect(result.signals.length).toBeGreaterThan(0);
  });

  it('detects transparent tone from honest/candid language', () => {
    const result = analyzer.analyze(
      "Honestly, we struggled with retention last year. We learned from our mistakes and we're working on it.",
    );
    expect(result.tone).toBe('transparent');
    expect(result.confidence).toBeGreaterThan(0.5);
    expect(result.signals).toContain('honestly');
  });

  it('detects enthusiastic tone from positive language', () => {
    const result = analyzer.analyze(
      "We're so excited about this role! The team is thriving and we have amazing opportunities for growth.",
    );
    expect(result.tone).toBe('enthusiastic');
    expect(result.confidence).toBeGreaterThan(0.5);
    expect(result.signals).toContain('excited');
  });

  it('returns neutral for generic text without strong signals', () => {
    const result = analyzer.analyze(
      'The team meets weekly to discuss project status and allocate resources for the quarter.',
    );
    expect(result.tone).toBe('neutral');
    expect(result.confidence).toBe(0.5);
    expect(result.signals).toEqual([]);
  });

  it('returns neutral for empty text', () => {
    const result = analyzer.analyze('');
    expect(result.tone).toBe('neutral');
  });

  it('is case-insensitive', () => {
    const result = analyzer.analyze('HONESTLY, we FAILED at this and WE LEARNED from it.');
    expect(result.tone).toBe('transparent');
  });

  it('picks the tone with the most keyword matches when multiple are present', () => {
    // Mix of tones, but more transparent keywords
    const result = analyzer.analyze(
      "Well, honestly, we struggled and we failed, but we learned and the reality is we could improve. We're working on it.",
    );
    expect(result.tone).toBe('transparent');
  });

  it('accepts a custom strategy', () => {
    const alwaysDefensive: KeywordToneStrategy = {
      analyze: () => ({ tone: 'defensive', confidence: 1.0, signals: ['custom'] }),
    };
    const custom = new ToneAnalyzer(alwaysDefensive);
    expect(custom.analyze('anything').tone).toBe('defensive');
  });
});

describe('KeywordToneStrategy', () => {
  const strategy = new KeywordToneStrategy();

  it('confidence scales with match count', () => {
    const one = strategy.analyze('honestly I think this is fine');
    const many = strategy.analyze(
      'honestly, to be honest, the reality is we failed, we struggled, and candidly we learned from our mistake',
    );
    expect(many.confidence).toBeGreaterThan(one.confidence);
  });

  it('confidence caps below 1.0', () => {
    const result = strategy.analyze(
      'honestly truthfully candidly frankly the reality is we struggled we failed our mistake we learned in hindsight admitted not perfect',
    );
    expect(result.confidence).toBeLessThanOrEqual(0.95);
  });
});
