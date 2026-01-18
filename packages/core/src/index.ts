export { matchMasksToContext, rankMasksByPriority } from "./maskMatching";
export * from './masks';
export * from './crypto';
export * from './vc';
export * from './did/registry';
export * from './errors';
export * from './jobs';
export * from './search';
export * from './hunter';
export {
  HunterAgent as HunterProtocolAgent,
  createHunterProtocolAgent,
  MockJobSearchProvider as HunterMockJobSearchProvider,
  createJobSearchProvider,
  DefaultCompatibilityAnalyzer
} from './hunter-protocol';
export { DocumentGenerator } from './hunter-protocol';
export * from './licensing/licensing-service';
export * from './billing/billing-service';
export * from './analytics/events';
export * from './analytics/analytics-service';
export { GraphClient, type GraphConfig } from './graph/neo4j-client';
export { EmbeddingsService, type EmbeddingsConfig } from './embeddings/service';

// Server-only exports (cloud storage integrations with ssh2, smb2, etc.)
// are available from '@in-midst-my-life/core/server' to prevent webpack bundling issues
// See packages/core/src/server.ts
