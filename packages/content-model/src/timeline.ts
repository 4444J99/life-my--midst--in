/* eslint-disable @typescript-eslint/no-unused-vars */
/**
 * Timeline Processing Module
 *
 * This module handles all timeline-related operations:
 * - Rendering and sorting timeline entries
 * - Enriching entries with stage/epoch/setting context
 * - Filtering entries by mask, tags, stages, epochs
 * - Formatting entries for display
 *
 * Timelines are the chronological backbone of the narrative system,
 * connecting experiences to stages, epochs, and settings.
 */

import { minimatch } from 'minimatch';
import type { Epoch, Mask, Stage, Setting } from '@in-midst-my-life/schema';
import type { TimelineEntry, TimelineRenderOptions, NarrativeViewConfig } from './types';
import {
  EPOCH_MASK_MODIFIERS,
  EPOCH_TAXONOMY,
  MASK_STAGE_AFFINITIES,
  SETTING_TAXONOMY,
  STAGE_SETTING_RELATIONS,
  STAGE_TAXONOMY,
} from './taxonomy';

// ─────────────────────────────────────────────────────────────────────────────
// RESOLVER FUNCTIONS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Resolves stages from options, view config, or falls back to default taxonomy.
 */
export function resolveStages(
  options?: TimelineRenderOptions,
  view?: NarrativeViewConfig,
): Stage[] {
  return options?.stages ?? view?.stages ?? STAGE_TAXONOMY;
}

/**
 * Resolves epochs from options, view config, or falls back to default taxonomy.
 */
export function resolveEpochs(
  options?: TimelineRenderOptions,
  view?: NarrativeViewConfig,
): Epoch[] {
  return options?.epochs ?? view?.epochs ?? EPOCH_TAXONOMY;
}

/**
 * Resolves settings from options, view config, or falls back to default taxonomy.
 */
export function resolveSettings(
  options?: TimelineRenderOptions,
  view?: NarrativeViewConfig,
): Setting[] {
  return options?.settings ?? view?.settings ?? SETTING_TAXONOMY;
}

// ─────────────────────────────────────────────────────────────────────────────
// MAP BUILDERS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Creates a lookup map of stages by ID.
 */
export function buildStageMap(stages: Stage[]): Map<string, Stage> {
  return new Map(stages.map((stage) => [stage.id, stage]));
}

/**
 * Creates a lookup map of epochs by ID.
 */
export function buildEpochMap(epochs: Epoch[]): Map<string, Epoch> {
  return new Map(epochs.map((epoch) => [epoch.id, epoch]));
}

/**
 * Creates a lookup map of settings by ID.
 */
export function buildSettingMap(settings: Setting[]): Map<string, Setting> {
  return new Map(settings.map((setting) => [setting.id, setting]));
}

/**
 * Creates a map from stage ID to epoch ID based on epoch.stages associations.
 */
export function buildStageEpochMap(epochs: Epoch[], stages: Stage[]): Map<string, string> {
  const map = new Map<string, string>();
  stages.forEach((stage) => {
    if (stage.epochId) map.set(stage.id, stage.epochId);
  });
  epochs.forEach((epoch) => {
    epoch.stages?.forEach((stage) => map.set(stage.id, epoch.id));
  });
  return map;
}

// ─────────────────────────────────────────────────────────────────────────────
// ARC BUILDER
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Extracts a unique, ordered arc of IDs from timeline entries.
 * Used to build stage/epoch/setting arcs for narrative context.
 *
 * @param entries - Timeline entries to extract arc from
 * @param key - Which ID field to extract (stageId, epochId, or settingId)
 * @returns Ordered array of unique IDs representing the arc
 */
export function buildArc(
  entries: TimelineEntry[],
  key: 'stageId' | 'epochId' | 'settingId',
): string[] {
  const arc: string[] = [];
  entries.forEach((entry) => {
    const value = entry[key];
    if (!value) return;
    if (arc[arc.length - 1] === value) return;
    if (!arc.includes(value)) arc.push(value);
  });
  return arc;
}

// ─────────────────────────────────────────────────────────────────────────────
// SCORING FUNCTIONS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Calculates a recency weight based on how recent an entry is.
 * Returns 1.0 for today, 0.0 for entries older than 3 years.
 *
 * @param date - ISO date string
 * @returns Weight between 0 and 1
 */
export function recencyWeight(date: string | undefined): number {
  if (!date) return 0;
  const parsed = Date.parse(date);
  if (!Number.isFinite(parsed)) return 0;
  const days = Math.abs(Date.now() - parsed) / (1000 * 60 * 60 * 24);
  const capped = Math.min(days, 365 * 3); // three-year window
  return Math.max(0, 1 - capped / (365 * 3));
}

/**
 * Infers the most likely stage for an entry based on tag overlap.
 *
 * @param entry - Timeline entry to analyze
 * @param stages - Available stages to match against
 * @returns The best-matching stage and its overlap score
 */
export function inferStageForEntry(
  entry: TimelineEntry,
  stages: Stage[],
): { stage?: Stage; score: number } {
  const tags = new Set((entry.tags ?? []).map((t) => t.toLowerCase()));
  let match: Stage | undefined;
  let score = 0;

  for (const stage of stages) {
    const stageTags = (stage.tags ?? []).map((t) => t.toLowerCase());
    const overlap = stageTags.filter((t) => tags.has(t)).length;
    if (overlap > score) {
      score = overlap;
      match = stage;
    }
  }

  return { stage: match, score };
}

/**
 * Returns the mask-stage affinity score (0-1) for a given mask and stage.
 */
export function maskStageAffinity(mask: Mask | undefined, stageId?: string): number {
  if (!mask || !stageId) return 0;
  return MASK_STAGE_AFFINITIES[mask.id]?.[stageId] ?? 0;
}

/**
 * Calculates a mask's relevance score for a specific timeline entry.
 * Considers include/exclude tags and priority weights.
 *
 * @param entry - Timeline entry to score
 * @param mask - Mask to evaluate against
 * @returns Relevance score (0 if excluded, positive otherwise)
 */
export function maskWeightForEntry(
  entry: TimelineEntry,
  mask: Mask | undefined,
  _stageId?: string,
): number {
  if (!mask) return 0;
  const tags = new Set((entry.tags ?? []).map((t) => t.toLowerCase()));
  const includes = new Set(mask.filters.include_tags.map((t) => t.toLowerCase()));
  const excludes = new Set(mask.filters.exclude_tags.map((t) => t.toLowerCase()));
  if ([...tags].some((t) => excludes.has(t))) return 0;
  const includeScore = [...tags].filter((t) => includes.has(t)).length;
  const priorityScore = Object.entries(mask.filters.priority_weights ?? {}).reduce(
    (acc, [tag, weight]) => {
      return acc + (tags.has(tag.toLowerCase()) ? weight : 0);
    },
    0,
  );
  return includeScore + priorityScore;
}

// ─────────────────────────────────────────────────────────────────────────────
// ENRICHMENT
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Enriches a timeline entry with inferred stage, epoch, setting, and weight.
 * This adds contextual metadata to make entries more useful for narrative generation.
 *
 * @param entry - The raw timeline entry
 * @param mask - Active mask for scoring
 * @param options - Rendering options with taxonomy overrides
 * @returns Enriched entry with stageId, epochId, settingId, and weight
 */
export function enrichTimelineEntry(
  entry: TimelineEntry,
  mask: Mask | undefined,
  options: TimelineRenderOptions,
): TimelineEntry {
  const stages = resolveStages(options);
  const epochs = resolveEpochs(options);
  const stageEpochMap = buildStageEpochMap(epochs, stages);
  const { stage, score } = inferStageForEntry(entry, stages);
  const stageId = entry.stageId ?? stage?.id;
  const maskScore = maskWeightForEntry(entry, mask, stageId);
  const recency = recencyWeight(entry.start);
  const tagScore =
    options.tagFilter && options.tagFilter.length > 0
      ? (entry.tags ?? []).filter((t) => options.tagFilter!.includes(t)).length
      : 0;
  const settingId = entry.settingId ?? (stageId ? STAGE_SETTING_RELATIONS[stageId] : undefined);
  const epochId = entry.epochId ?? (stageId ? stageEpochMap.get(stageId) : undefined);
  const epochBoost = epochId && mask ? (EPOCH_MASK_MODIFIERS[epochId]?.[mask.id] ?? 0) : 0;
  const stageAffinity = maskStageAffinity(mask, stageId);

  return {
    ...entry,
    stageId,
    settingId,
    epochId,
    weight: recency + score + maskScore + tagScore + epochBoost + stageAffinity,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// FORMATTING
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Formats a stage for display, including its setting if available.
 */
export function formatStage(stage: Stage, settingMap: Map<string, Setting>): string {
  const settingId = STAGE_SETTING_RELATIONS[stage.id];
  const settingLabel = settingId ? settingMap.get(settingId)?.title : undefined;
  const settingSuffix = settingLabel ? ` (${settingLabel})` : '';
  return `• ${stage.title}${stage.summary ? ` — ${stage.summary}` : ''}${settingSuffix}`;
}

/**
 * Formats an epoch for display, including all its stages.
 */
export function formatEpoch(epoch: Epoch, settingMap: Map<string, Setting>): string {
  const stageLines = (epoch.stages ?? []).map((stage) => formatStage(stage, settingMap));
  const header = `Epoch: ${epoch.name}`;
  return [header, ...stageLines].join('\n');
}

/**
 * Formats a single timeline entry for display.
 * Includes stage, setting, epoch, and date information.
 */
export function formatTimelineEntry(
  entry: TimelineEntry,
  stageMap: Map<string, Stage>,
  settingMap: Map<string, Setting>,
  epochMap: Map<string, Epoch>,
): string {
  const end = entry.end ? ` – ${entry.end}` : '';
  const stageLabel = entry.stageId ? (stageMap.get(entry.stageId)?.title ?? '') : '';
  const stageSuffix = stageLabel ? ` [${stageLabel}]` : '';
  const settingLabel = entry.settingId ? (settingMap.get(entry.settingId)?.title ?? '') : '';
  const settingSuffix = settingLabel ? ` @ ${settingLabel}` : '';
  const epochLabel = entry.epochId ? (epochMap.get(entry.epochId)?.name ?? '') : '';
  const epochSuffix = epochLabel ? ` · ${epochLabel}` : '';
  return `${entry.title}${stageSuffix}${settingSuffix}${epochSuffix} (${entry.start}${end})${
    entry.summary ? `: ${entry.summary}` : ''
  }`;
}

/**
 * Formats multiple timeline entries into a single string.
 */
export function formatTimeline(
  entries: TimelineEntry[],
  stageMap: Map<string, Stage>,
  settingMap: Map<string, Setting>,
  epochMap: Map<string, Epoch>,
): string {
  return entries
    .map((entry) => formatTimelineEntry(entry, stageMap, settingMap, epochMap))
    .join('\n');
}

/**
 * Builds an evidence line from a timeline entry for LLM context.
 */
export function buildEvidenceLine(entry: TimelineEntry): string {
  const parts = [
    entry.title,
    entry.summary,
    entry.tags?.length ? `tags: ${entry.tags.join(', ')}` : undefined,
    entry.stageId ? `stage: ${entry.stageId}` : undefined,
    entry.epochId ? `epoch: ${entry.epochId}` : undefined,
  ].filter(Boolean);
  return parts.join(' | ');
}

// ─────────────────────────────────────────────────────────────────────────────
// RENDERING
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Orders timeline entries by weight (if present) then by date.
 *
 * @param entries - Timeline entries to sort
 * @param order - Sort order: "asc" for oldest first, "desc" for newest first
 * @returns Sorted copy of entries
 */
export function renderTimeline(
  entries: TimelineEntry[],
  order: 'asc' | 'desc' = 'desc',
): TimelineEntry[] {
  const normalizeDate = (value?: string): number => {
    if (!value) return order === 'asc' ? Number.POSITIVE_INFINITY : Number.NEGATIVE_INFINITY;
    const parsed = Date.parse(value);
    return Number.isFinite(parsed)
      ? parsed
      : order === 'asc'
        ? Number.POSITIVE_INFINITY
        : Number.NEGATIVE_INFINITY;
  };

  return [...entries].sort((a, b) => {
    if (a.weight !== undefined && b.weight !== undefined && a.weight !== b.weight) {
      return order === 'asc' ? a.weight - b.weight : b.weight - a.weight;
    }
    const aDate = normalizeDate(a.start);
    const bDate = normalizeDate(b.start);
    return order === 'asc' ? aDate - bDate : bDate - aDate;
  });
}

/**
 * Renders timeline entries filtered and sorted by mask context.
 * Applies include/exclude filters for tags, stages, epochs, and settings.
 *
 * @param entries - Raw timeline entries
 * @param mask - Active mask for filtering
 * @param options - Filtering and rendering options
 * @returns Filtered, enriched, and sorted timeline entries
 */
export function renderTimelineForMask(
  entries: TimelineEntry[],
  mask: Mask | undefined,
  options: TimelineRenderOptions = {},
): TimelineEntry[] {
  const order = options.order ?? 'desc';
  const tagPatterns = options.tagFilter?.map((t) => t.toLowerCase()) ?? [];
  const includeTagPatterns = mask?.filters.include_tags?.map((t) => t.toLowerCase()) ?? [];
  const excludeTagPatterns = mask?.filters.exclude_tags?.map((t) => t.toLowerCase()) ?? [];
  const includeStages = new Set(options.includeStages ?? []);
  const excludeStages = new Set(options.excludeStages ?? []);
  const includeEpochs = new Set(options.includeEpochs ?? []);
  const excludeEpochs = new Set(options.excludeEpochs ?? []);
  const includeSettings = new Set(options.includeSettings ?? []);
  const excludeSettings = new Set(options.excludeSettings ?? []);

  const enriched = entries
    .map((entry) => enrichTimelineEntry(entry, mask, options))
    .filter((entry) => {
      const entryTags = (entry.tags ?? []).map((t) => t.toLowerCase());
      const hasExplicitStage = Boolean(entry.stageId);
      if (
        excludeTagPatterns.length &&
        entryTags.some((t) => excludeTagPatterns.some((p) => minimatch(t, p)))
      )
        return false;
      if (
        !hasExplicitStage &&
        includeTagPatterns.length &&
        !entryTags.some((t) => includeTagPatterns.some((p) => minimatch(t, p)))
      )
        return false;
      if (
        !hasExplicitStage &&
        tagPatterns.length &&
        !entryTags.some((t) => tagPatterns.some((p) => minimatch(t, p)))
      )
        return false;
      if (includeStages.size && (!entry.stageId || !includeStages.has(entry.stageId))) return false;
      if (excludeStages.size && entry.stageId && excludeStages.has(entry.stageId)) return false;
      if (includeEpochs.size && (!entry.epochId || !includeEpochs.has(entry.epochId))) return false;
      if (excludeEpochs.size && entry.epochId && excludeEpochs.has(entry.epochId)) return false;
      if (includeSettings.size && (!entry.settingId || !includeSettings.has(entry.settingId)))
        return false;
      if (excludeSettings.size && entry.settingId && excludeSettings.has(entry.settingId))
        return false;
      return true;
    });

  const sorted = renderTimeline(enriched, order);
  return options.limit ? sorted.slice(0, options.limit) : sorted;
}
