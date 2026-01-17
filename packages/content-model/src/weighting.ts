/**
 * Narrative Block Weighting System for LLM Ranking
 *
 * This module provides a comprehensive scoring system for ranking narrative blocks
 * by importance, recency, relevance, and other factors. The weights are designed
 * to help LLMs prioritize which blocks to include in final outputs (abstracts, summaries).
 *
 * Weighting Strategy:
 * 1. Base Weight: template type importance (e.g., identity-mode=3, stage-context=3)
 * 2. Temporal Weight: recency factor (recent blocks score higher)
 * 3. Relevance Weight: match to active mask/epoch/stage filters
 * 4. Coherence Weight: semantic alignment with other blocks in the narrative
 * 5. Confidence Weight: how certain we are about the block's accuracy/completeness
 */

import type { NarrativeBlock, Mask, Epoch, Stage } from "@in-midst-my-life/schema";

/**
 * Configuration for weighting narrative blocks.
 * Allows customization of how different factors influence final scores.
 */
export interface WeightingConfig {
  /** Relative importance of base template weight (0-1, default: 0.25) */
  baseWeightFactor?: number;
  /** Relative importance of temporal recency (0-1, default: 0.15) */
  recencyFactor?: number;
  /** Relative importance of mask/context relevance (0-1, default: 0.35) */
  relevanceFactor?: number;
  /** Relative importance of coherence with other blocks (0-1, default: 0.15) */
  coherenceFactor?: number;
  /** Relative importance of confidence/accuracy (0-1, default: 0.10) */
  confidenceFactor?: number;
  /** How far back (in days) to consider blocks "recent" (default: 365) */
  recencyWindowDays?: number;
  /** Boost factor for blocks tagged with specific keywords (default: 1.5x) */
  keywordBoostFactor?: number;
  /** Keywords that receive relevance boosts */
  priorityKeywords?: string[];
}

/**
 * Detailed scoring breakdown for a narrative block.
 * Useful for debugging and understanding why blocks ranked as they did.
 */
export interface BlockScore {
  blockId: string;
  totalScore: number;
  contentRichness: number;
  relevanceScore: number;
  confidence: number;
  breakdown: {
    baseWeight: number;
    recencyScore: number;
    relevanceScore: number;
    coherenceScore: number;
    confidenceScore: number;
  };
  factors: {
    isRecent: boolean;
    hasRelevantTags: boolean;
    hasKeywordBoost: boolean;
    tagCount: number;
  };
}

/**
 * Calculate how recent a block is (1.0 = today, 0.0 = beyond window).
 * Assumes blocks have implicit creation or update timestamps.
 */
function calculateRecencyScore(
  createdAt: string | undefined,
  windowDays: number = 365
): number {
  if (!createdAt) return 0.5; // Unknown age gets mid-range score

  try {
    const parsed = new Date(createdAt).getTime();
    if (!Number.isFinite(parsed)) return 0.5;

    const now = Date.now();
    const ageMs = now - parsed;
    const ageDays = ageMs / (1000 * 60 * 60 * 24);

    if (ageDays < 0) return 1.0; // Future-dated (edge case)
    if (ageDays > windowDays) return 0.0;

    // Linear decay: recent blocks score 1.0, old blocks score 0.0
    return 1.0 - (ageDays / windowDays);
  } catch {
    return 0.5;
  }
}

/**
 * Calculate relevance score based on tag matching and mask affinity.
 */
function calculateRelevanceScore(
  block: NarrativeBlock,
  activeMask: Mask | undefined,
  _activeContexts: Set<string>,
  activeTags: Set<string>,
  priorityKeywords: Set<string>
): number {
  const blockTags = new Set((block.tags ?? []).map((t) => t.toLowerCase()));

  // Direct tag matching
  let tagMatches = 0;
  let tagScore = 0;

  for (const tag of blockTags) {
    if (activeTags.has(tag)) {
      tagMatches += 1;
      tagScore += 2; // Exact match
    } else if (priorityKeywords.has(tag)) {
      tagScore += 1.5; // Keyword boost
    }
  }

  // Mask affinity
  let maskScore = 0;
  if (activeMask) {
    // Check if block's tags align with mask's include_tags
    const maskIncludes = new Set(
      activeMask.filters.include_tags.map((t) => t.toLowerCase())
    );
    const maskExcludes = new Set(
      activeMask.filters.exclude_tags.map((t) => t.toLowerCase())
    );

    // Penalty for excluded tags
    if ([...blockTags].some((t) => maskExcludes.has(t))) {
      return 0; // Don't include blocks that violate mask exclusions
    }

    // Bonus for included tags
    const includeMatches = [...blockTags].filter((t) => maskIncludes.has(t)).length;
    maskScore = includeMatches * 2;
  }

  // Normalize: max score roughly 10 (5 tags * 2 points each + mask bonus)
  const normalizedScore = Math.min(10, tagScore + maskScore);
  return normalizedScore / 10;
}

/**
 * Calculate semantic coherence with other blocks in the narrative.
 * This is a simplified heuristic; in production, use embeddings or LLM-based scoring.
 */
function calculateCoherenceScore(
  block: NarrativeBlock,
  allBlocks: NarrativeBlock[],
  _contextArc: string[] // e.g., ["mask-a", "stage-b", "epoch-c"] - reserved for future context-aware coherence scoring
): number {
  if (allBlocks.length === 0) return 0.5;

  // Blocks with template IDs that follow a logical narrative order score higher
  const narrativeSequence = [
    "identity-mode",
    "stage-context",
    "sequence",
    "stage-arc",
    "epoch-arc",
    "evidence",
    "next-move"
  ];

  const templateId = block.templateId ?? "unknown";
  const templateIndex = narrativeSequence.indexOf(templateId);

  // Blocks that are in the expected sequence score higher
  if (templateIndex >= 0) {
    return (templateIndex + 1) / narrativeSequence.length;
  }

  // Count overlapping tags with adjacent blocks as a coherence proxy
  const blockTagSet = new Set((block.tags ?? []).map((t) => t.toLowerCase()));
  let coherenceMatches = 0;
  let comparisons = 0;

  for (const otherBlock of allBlocks) {
    if (otherBlock === block) continue;
    comparisons += 1;

    const otherTags = new Set((otherBlock.tags ?? []).map((t) => t.toLowerCase()));
    const intersection = [...blockTagSet].filter((t) => otherTags.has(t)).length;
    if (intersection > 0) coherenceMatches += 1;
  }

  if (comparisons === 0) return 0.5;
  return coherenceMatches / comparisons;
}

/**
 * Calculate confidence in a block's accuracy.
 * This is a placeholder; in production, track verification status, sources, etc.
 */
function calculateConfidenceScore(
  block: NarrativeBlock,
  _mask: Mask | undefined
): number {
  // Blocks with template IDs from official templates score higher
  const officialTemplates = [
    "identity-mode",
    "stage-context",
    "sequence",
    "stage-arc",
    "epoch-arc",
    "setting-arc",
    "next-move"
  ];

  if (block.templateId && officialTemplates.includes(block.templateId)) {
    return 0.95; // High confidence in official templates
  }

  // Blocks with explicit tags and context score higher
  const tagCount = (block.tags ?? []).length;
  if (tagCount >= 2) return 0.8;
  if (tagCount === 1) return 0.6;

  // Untagged blocks default to moderate confidence
  return 0.5;
}

/**
 * Score a single narrative block against the current narrative context.
 *
 * @param block The narrative block to score
 * @param context Narrative context (mask, epochs, stages, etc.)
 * @param allBlocks All blocks in the narrative (for coherence scoring)
 * @param config Weighting configuration
 * @returns Detailed score breakdown
 *
 * @example
 * const score = scoreNarrativeBlock(block, {
 *   mask: analyticalMask,
 *   activeContexts: new Set(["technical", "analysis"]),
 *   activeTags: new Set(["architecture", "metrics"])
 * }, allBlocks);
 *
 * console.log(`Block: ${score.totalScore.toFixed(2)}`); // 0.85
 * console.log(score.breakdown); // { baseWeight: 0.3, recencyScore: 0.75, ... }
 */
export function scoreNarrativeBlock(
  block: NarrativeBlock,
  context: {
    mask?: Mask;
    activeContexts?: Set<string>;
    activeTags?: Set<string>;
    activeEpoch?: Epoch;
    activeStage?: Stage;
    createdAt?: string;
    contextArc?: string[];
  },
  allBlocks: NarrativeBlock[] = [],
  config: WeightingConfig = {}
): BlockScore {
  // Normalize configuration with defaults
  const baseWeightFactor = config.baseWeightFactor ?? 0.25;
  const recencyFactor = config.recencyFactor ?? 0.15;
  const relevanceFactor = config.relevanceFactor ?? 0.35;
  const coherenceFactor = config.coherenceFactor ?? 0.15;
  const confidenceFactor = config.confidenceFactor ?? 0.10;
  const recencyWindowDays = config.recencyWindowDays ?? 365;
  const priorityKeywords = new Set(
    (config.priorityKeywords ?? []).map((k) => k.toLowerCase())
  );

  // Calculate individual scores (0-1 range)
  const baseWeight = block.weight ? Math.min(1, block.weight / 5) : 0.5;
  const recencyScore = calculateRecencyScore(context.createdAt, recencyWindowDays);
  const relevanceScore = calculateRelevanceScore(
    block,
    context.mask,
    context.activeContexts ?? new Set(),
    context.activeTags ?? new Set(),
    priorityKeywords
  );
  const coherenceScore = calculateCoherenceScore(
    block,
    allBlocks,
    context.contextArc ?? []
  );
  const confidenceScore = calculateConfidenceScore(block, context.mask);

  // Weighted combination (factors should sum to ~1.0)
  const totalScore =
    baseWeight * baseWeightFactor +
    recencyScore * recencyFactor +
    relevanceScore * relevanceFactor +
    coherenceScore * coherenceFactor +
    confidenceScore * confidenceFactor;

  return {
    blockId: block.title,
    totalScore: Math.min(1, totalScore),
    contentRichness: baseWeight * baseWeightFactor,
    relevanceScore: relevanceScore * relevanceFactor,
    confidence: confidenceScore * confidenceFactor,
    breakdown: {
      baseWeight: baseWeight * baseWeightFactor,
      recencyScore: recencyScore * recencyFactor,
      relevanceScore: relevanceScore * relevanceFactor,
      coherenceScore: coherenceScore * coherenceFactor,
      confidenceScore: confidenceScore * confidenceFactor
    },
    factors: {
      isRecent: recencyScore > 0.7,
      hasRelevantTags: relevanceScore > 0.5,
      hasKeywordBoost: (block.tags ?? []).some((t) => priorityKeywords.has(t.toLowerCase())),
      tagCount: (block.tags ?? []).length
    }
  };
}

/**
 * Score and rank all narrative blocks in a set.
 * Useful for generating summaries or prioritizing which blocks to include in outputs.
 *
 * @param blocks Array of narrative blocks to score
 * @param context Narrative context
 * @param config Weighting configuration
 * @returns Blocks sorted by score (highest first), with score metadata
 *
 * @example
 * const ranked = rankNarrativeBlocks(blocks, {
 *   mask: myMask,
 *   activeContexts: new Set(["technical", "strategic"])
 * });
 *
 * // Take top 5 blocks for a summary
 * const summary = ranked.slice(0, 5).map(item => item.block);
 */
export function rankNarrativeBlocks(
  blocks: NarrativeBlock[],
  context: Parameters<typeof scoreNarrativeBlock>[1],
  config: WeightingConfig = {}
): Array<{ block: NarrativeBlock; score: BlockScore }> {
  const scores = blocks.map((block) =>
    scoreNarrativeBlock(block, context, blocks, config)
  );

  const ranked = blocks
    .map((block, idx) => {
      const score = scores[idx];
      if (!score) {
        throw new Error(`Missing score for block at index ${idx}`);
      }
      return { block, score };
    })
    .sort((a, b) => b.score.totalScore - a.score.totalScore);

  return ranked;
}

/**
 * Filter narrative blocks to top N most important ones.
 * Useful for generating abstracts or summaries.
 *
 * @param blocks All blocks in the narrative
 * @param topN How many blocks to select (default: 5)
 * @param context Narrative context
 * @param config Weighting configuration
 * @returns Top N blocks, sorted by importance
 *
 * @example
 * const abstract = selectTopBlocks(blocks, 3, context);
 * const summary = abstract.map(b => b.title + ': ' + b.body).join('\n\n');
 */
export function selectTopBlocks(
  blocks: NarrativeBlock[],
  topN: number = 5,
  context: Parameters<typeof scoreNarrativeBlock>[1],
  config: WeightingConfig = {}
): NarrativeBlock[] {
  const ranked = rankNarrativeBlocks(blocks, context, config);
  return ranked.slice(0, topN).map((item) => item.block);
}

/**
 * Generate a weighting report for debugging and analysis.
 * Shows why blocks ranked as they did and which factors contributed most.
 */
export function generateWeightingReport(
  blocks: NarrativeBlock[],
  context: Parameters<typeof scoreNarrativeBlock>[1],
  config: WeightingConfig = {}
): Array<{
  block: NarrativeBlock;
  score: BlockScore;
}> {
  const ranked = rankNarrativeBlocks(blocks, context, config);
  return ranked;
}
