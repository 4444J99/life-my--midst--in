/**
 * Market-Rate Compensation Analysis Tests
 *
 * Tests salary parsing, percentile estimation, and score comparison.
 */

import { describe, it, expect } from 'vitest';
import {
  parseSalary,
  parseSalaryRange,
  MarketRateAnalyzer,
  compareSalary,
} from '../src/hunter-protocol/market-rate';
import type { MarketRateEstimate } from '../src/hunter-protocol/market-rate';

describe('parseSalary', () => {
  it('should parse "$150k" format', () => {
    expect(parseSalary('$150k')).toBe(150_000);
  });

  it('should parse "$150K" (uppercase)', () => {
    expect(parseSalary('$150K')).toBe(150_000);
  });

  it('should parse "$150,000" format', () => {
    expect(parseSalary('$150,000')).toBe(150_000);
  });

  it('should parse "150000" (plain number)', () => {
    expect(parseSalary('150000')).toBe(150_000);
  });

  it('should parse "$150k/yr" format', () => {
    expect(parseSalary('$150k/yr')).toBe(150_000);
  });

  it('should parse "~$180k" (approximate)', () => {
    expect(parseSalary('~$180k')).toBe(180_000);
  });

  it('should return null for non-numeric strings', () => {
    expect(parseSalary('competitive')).toBeNull();
  });

  it('should return null for unreasonably small values', () => {
    expect(parseSalary('$5')).toBeNull();
  });
});

describe('parseSalaryRange', () => {
  it('should parse "$150k-$200k"', () => {
    expect(parseSalaryRange('$150k-$200k')).toEqual({
      min: 150_000,
      max: 200_000,
    });
  });

  it('should parse "150000 - 200000"', () => {
    expect(parseSalaryRange('150000 - 200000')).toEqual({
      min: 150_000,
      max: 200_000,
    });
  });

  it('should handle single value as both min and max', () => {
    expect(parseSalaryRange('$120k')).toEqual({
      min: 120_000,
      max: 120_000,
    });
  });

  it('should return null for unparseable input', () => {
    expect(parseSalaryRange('negotiable')).toBeNull();
  });
});

describe('MarketRateAnalyzer', () => {
  it('should compute percentiles from mock job data', async () => {
    const mockProvider = {
      name: 'test-provider',
      search: () =>
        Promise.resolve([
          { id: '1', salary_min: 100_000, salary_max: 120_000 },
          { id: '2', salary_min: 120_000, salary_max: 140_000 },
          { id: '3', salary_min: 140_000, salary_max: 160_000 },
          { id: '4', salary_min: 160_000, salary_max: 200_000 },
        ]),
    };

    const analyzer = new MarketRateAnalyzer(mockProvider);
    const estimate = await analyzer.estimate('Software Engineer');

    expect(estimate).not.toBeNull();
    expect(estimate!.sampleSize).toBe(4);
    expect(estimate!.median).toBeGreaterThan(0);
    expect(estimate!.p25).toBeLessThanOrEqual(estimate!.median);
    expect(estimate!.median).toBeLessThanOrEqual(estimate!.p75);
    expect(estimate!.title).toBe('Software Engineer');
  });

  it('should return null when no salary data is available', async () => {
    const mockProvider = {
      name: 'empty-provider',
      search: () => Promise.resolve([{ id: '1', title: 'Engineer' }]),
    };

    const analyzer = new MarketRateAnalyzer(mockProvider);
    const estimate = await analyzer.estimate('Engineer');

    expect(estimate).toBeNull();
  });
});

describe('compareSalary', () => {
  const estimate: MarketRateEstimate = {
    p25: 120_000,
    median: 150_000,
    p75: 180_000,
    sampleSize: 10,
    title: 'Software Engineer',
  };

  it('should classify above-market salary', () => {
    const result = compareSalary(200_000, estimate);
    expect(result.classification).toBe('above_market');
    expect(result.score).toBeGreaterThanOrEqual(85);
  });

  it('should classify at-market salary', () => {
    const result = compareSalary(160_000, estimate);
    expect(result.classification).toBe('at_market');
    expect(result.score).toBeGreaterThanOrEqual(65);
    expect(result.score).toBeLessThanOrEqual(85);
  });

  it('should classify below-market salary (between p25 and median)', () => {
    const result = compareSalary(130_000, estimate);
    expect(result.classification).toBe('below_market');
    expect(result.score).toBeGreaterThanOrEqual(40);
    expect(result.score).toBeLessThanOrEqual(65);
  });

  it('should classify well-below-market salary (below p25)', () => {
    const result = compareSalary(80_000, estimate);
    expect(result.classification).toBe('below_market');
    expect(result.score).toBeLessThan(40);
  });

  it('should include a human-readable explanation', () => {
    const result = compareSalary(160_000, estimate);
    expect(result.explanation).toContain('$160,000');
  });

  it('should always return score between 0 and 100', () => {
    expect(compareSalary(500_000, estimate).score).toBeLessThanOrEqual(100);
    expect(compareSalary(10_000, estimate).score).toBeGreaterThanOrEqual(0);
  });
});
