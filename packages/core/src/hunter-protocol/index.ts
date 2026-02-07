/**
 * Hunter Protocol
 * Autonomous job-search agent that solves the "2000 applications, 0 interviews" problem
 *
 * Four Core Tools:
 * 1. find_jobs - Search job boards intelligently
 * 2. analyze_gap - Honest skill assessment
 * 3. tailor_resume - Show the right mask for this role
 * 4. write_cover_letter - Personalized, authentic
 */

export * from './hunter-agent';
export * from './job-search';
export * from './compatibility-analyzer';
export * from './document-generator';
export * from './market-rate';

import { HunterAgent } from './hunter-agent';
import { MockJobSearchProvider, createJobSearchProvider } from './job-search';
import { DefaultCompatibilityAnalyzer } from './compatibility-analyzer';
import {
  DefaultResumeTailor,
  DefaultCoverLetterGenerator,
  DocumentGenerator,
} from './document-generator';

/**
 * Factory function to create fully configured Hunter Agent
 */
export function createHunterProtocolAgent(useMockData = true): HunterAgent {
  const jobSearchService = createJobSearchProvider(!useMockData);
  const compatibilityAnalyzer = new DefaultCompatibilityAnalyzer();
  const resumeTailor = new DefaultResumeTailor();
  const coverLetterGenerator = new DefaultCoverLetterGenerator();

  return new HunterAgent(
    jobSearchService,
    compatibilityAnalyzer,
    resumeTailor,
    coverLetterGenerator,
  );
}

/**
 * Convenience exports for the MVP
 */
export { MockJobSearchProvider };
export { DefaultCompatibilityAnalyzer };
export { DefaultResumeTailor, DefaultCoverLetterGenerator };
export { DocumentGenerator };
