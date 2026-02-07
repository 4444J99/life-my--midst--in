/**
 * Market-Rate Compensation Analysis
 *
 * Searches comparable jobs via any JobSearchProvider, parses salary data,
 * and computes percentile-based market estimates. Enables the compatibility
 * analyzer to score offered compensation against real market data rather
 * than hardcoded title-based guesses.
 */

import type { JobSearchProvider } from '../jobs';

export interface MarketRateEstimate {
  /** 25th percentile salary */
  p25: number;
  /** Median (50th percentile) salary */
  median: number;
  /** 75th percentile salary */
  p75: number;
  /** Number of salary data points found */
  sampleSize: number;
  /** Title used for the search */
  title: string;
  /** Location used for the search (if any) */
  location?: string;
}

export interface SalaryComparison {
  /** 0-100 score: how the offered salary compares to market */
  score: number;
  /** Classification: above, at, or below market */
  classification: 'above_market' | 'at_market' | 'below_market';
  /** Human-readable explanation */
  explanation: string;
  /** The market estimate used for comparison */
  estimate: MarketRateEstimate;
}

/**
 * Parse a salary string into a numeric value.
 * Handles formats like "$150k", "$150,000", "150000", "$150K/yr", "~$180k"
 */
export function parseSalary(raw: string): number | null {
  // Remove common noise: currency symbols, commas, spaces, ~, "per year", "/yr", etc.
  const cleaned = raw
    .replace(/[$€£¥,~]/g, '')
    .replace(/\s/g, '')
    .replace(/\/yr|\/year|peryear|perannum|p\.?a\.?/gi, '')
    .trim();

  // Match number optionally followed by "k" or "K"
  const match = cleaned.match(/^(\d+(?:\.\d+)?)\s*([kK])?$/);
  if (!match) return null;

  const numStr = match[1];
  const multiplier = match[2] ? 1000 : 1;
  if (!numStr) return null;

  const value = parseFloat(numStr) * multiplier;
  // Sanity check: salary should be between $10k and $10M
  if (value < 10_000 || value > 10_000_000) return null;

  return value;
}

/**
 * Parse a salary range string like "$150k-$200k" or "150000 - 200000"
 */
export function parseSalaryRange(raw: string): { min: number; max: number } | null {
  // Split on common range delimiters
  const parts = raw.split(/[-–—to]/i).map((s) => s.trim());
  if (parts.length < 2) {
    // Single value — treat as both min and max
    const single = parseSalary(raw);
    return single ? { min: single, max: single } : null;
  }

  const min = parseSalary(parts[0] ?? '');
  const max = parseSalary(parts[1] ?? '');
  if (min === null || max === null) return null;

  return { min: Math.min(min, max), max: Math.max(min, max) };
}

/**
 * Compute percentiles from a sorted array of numbers.
 */
function percentile(sorted: number[], p: number): number {
  if (sorted.length === 0) return 0;
  if (sorted.length === 1) return sorted[0]!;

  const idx = (p / 100) * (sorted.length - 1);
  const lower = Math.floor(idx);
  const upper = Math.ceil(idx);
  const weight = idx - lower;

  return sorted[lower]! * (1 - weight) + sorted[upper]! * weight;
}

/**
 * Analyzes market compensation by querying a job search provider
 * for comparable roles and computing salary percentiles.
 */
export class MarketRateAnalyzer {
  constructor(private provider: JobSearchProvider) {}

  /**
   * Estimate the market rate for a given title and optional location.
   */
  async estimate(title: string, location?: string): Promise<MarketRateEstimate | null> {
    const query = {
      keywords: [title],
      location,
      limit: 30,
    };

    const results = await this.provider.search(query);
    const salaries: number[] = [];

    for (const job of results) {
      // JobListing has salary_min/salary_max; JobPosting may have salary string
      const listing = job as Record<string, unknown>;
      const salaryMin = listing['salary_min'] as number | undefined;
      const salaryMax = listing['salary_max'] as number | undefined;

      if (typeof salaryMin === 'number' && typeof salaryMax === 'number') {
        // Use midpoint of range
        salaries.push((salaryMin + salaryMax) / 2);
      } else if (typeof salaryMin === 'number') {
        salaries.push(salaryMin);
      } else if (typeof salaryMax === 'number') {
        salaries.push(salaryMax);
      }
    }

    if (salaries.length === 0) return null;

    salaries.sort((a, b) => a - b);

    return {
      p25: Math.round(percentile(salaries, 25)),
      median: Math.round(percentile(salaries, 50)),
      p75: Math.round(percentile(salaries, 75)),
      sampleSize: salaries.length,
      title,
      location,
    };
  }
}

/**
 * Compare an offered salary against a market rate estimate.
 * Returns a 0-100 score and a classification.
 */
export function compareSalary(offered: number, estimate: MarketRateEstimate): SalaryComparison {
  const { median, p25, p75 } = estimate;

  let score: number;
  let classification: SalaryComparison['classification'];
  let explanation: string;

  if (offered >= p75) {
    score = Math.min(100, 85 + ((offered - p75) / (p75 * 0.2)) * 15);
    classification = 'above_market';
    explanation = `Offered $${offered.toLocaleString()} is above the 75th percentile ($${p75.toLocaleString()})`;
  } else if (offered >= median) {
    // Between median and p75 → score 65-85
    const range = p75 - median || 1;
    score = 65 + ((offered - median) / range) * 20;
    classification = 'at_market';
    explanation = `Offered $${offered.toLocaleString()} is between median ($${median.toLocaleString()}) and 75th percentile ($${p75.toLocaleString()})`;
  } else if (offered >= p25) {
    // Between p25 and median → score 40-65
    const range = median - p25 || 1;
    score = 40 + ((offered - p25) / range) * 25;
    classification = 'below_market';
    explanation = `Offered $${offered.toLocaleString()} is between 25th percentile ($${p25.toLocaleString()}) and median ($${median.toLocaleString()})`;
  } else {
    // Below p25 → score 0-40
    score = Math.max(0, 40 * (offered / (p25 || 1)));
    classification = 'below_market';
    explanation = `Offered $${offered.toLocaleString()} is below the 25th percentile ($${p25.toLocaleString()})`;
  }

  return {
    score: Math.round(Math.min(100, Math.max(0, score))),
    classification,
    explanation,
    estimate,
  };
}
