import type { Mask } from "@in-midst-my-life/schema";
import type { NarrativeBlock } from "@in-midst-my-life/schema";

/**
 * Service for CV/résumé narrative generation.
 * Transforms timeline entries and mask context into narrative blocks.
 */

export interface TimelineEntry {
  id: string;
  title: string;
  summary?: string;
  start: string;
  end?: string;
  tags?: string[];
  stageId?: string;
  epochId?: string;
  settingId?: string;
}

export interface NarrativeGenerationRequest {
  maskId?: string;
  mask?: Mask;
  contexts: string[];
  tags: string[];
  timeline: TimelineEntry[];
  limit?: number;
  includeMeta?: boolean;
}

export interface NarrativeGenerationResponse {
  blocks: NarrativeBlock[];
  meta?: {
    maskId?: string;
    mask?: { id: string; name: string; ontology: string };
    contexts: string[];
    tags: string[];
    timelineCount: number;
    generatedAt: string;
  };
}

/**
 * Generates narrative blocks from timeline entries and mask context.
 * 
 * This implementation provides:
 * - Professional summary from timeline entries
 * - Tag-focused sections highlighting key competencies
 * - Mask-specific framing and context
 * - Weighted block ordering
 * 
 * @param request - Generation request with timeline and mask context
 * @returns Narrative blocks ready for CV/résumé rendering
 */
export function generateNarrativeBlocks(request: NarrativeGenerationRequest): NarrativeBlock[] {
  const { mask, contexts, tags, timeline, limit = 10 } = request;
  const narrativeBlocks: NarrativeBlock[] = [];

  // Block 1: Professional Summary
  if (timeline.length > 0) {
    narrativeBlocks.push({
      title: "Professional Summary",
      body: timeline
        .slice(0, 3)
        .map((entry) => `• **${entry.title}** (${entry.start}): ${entry.summary || "Professional contribution"}`)
        .join("\n"),
      tags: tags.length > 0 ? tags : ["summary"]
    });
  }

  // Block 2-N: Tag-focused sections
  if (tags.length > 0) {
    const entriesByTag = new Map<string, TimelineEntry[]>();
    timeline.forEach((entry) => {
      (entry.tags || []).forEach((tag) => {
        if (tags.includes(tag)) {
          if (!entriesByTag.has(tag)) entriesByTag.set(tag, []);
          entriesByTag.get(tag)!.push(entry);
        }
      });
    });

    let blockIndex = 1;
    for (const [tag, entries] of entriesByTag) {
      if (narrativeBlocks.length >= limit) break;
      if (blockIndex >= limit - 1) break;

      narrativeBlocks.push({
        title: `${tag.charAt(0).toUpperCase() + tag.slice(1)} Expertise`,
        body: entries
          .slice(0, 2)
          .map((e) => `• **${e.title}** – ${e.summary || "Key contribution"}`)
          .join("\n"),
        tags: [tag]
      });
      blockIndex++;
    }
  }

  // Block N: Context-based highlighting (if no tags focused)
  if (tags.length === 0 && contexts.length > 0 && narrativeBlocks.length < limit) {
    const contextEntries = timeline.filter((entry) =>
      (entry.tags || []).some((t) => contexts.includes(t))
    );

    if (contextEntries.length > 0) {
      narrativeBlocks.push({
        title: "Context-Relevant Work",
        body: contextEntries
          .slice(0, 3)
          .map((e) => `• **${e.title}** – ${e.summary || "Relevant experience"}`)
          .join("\n"),
        tags: contexts
      });
    }
  }

  // Block N: Mask perspective framing
  if (mask && narrativeBlocks.length < limit) {
    narrativeBlocks.push({
      title: `${mask.name} Perspective`,
      body:
        `Filtered through the **${mask.name}** lens (${mask.ontology}): ` +
        `${mask.functional_scope}. ` +
        `Key activation contexts: ${mask.activation_rules.contexts.join(", ")}. ` +
        `Priority tags: ${Object.keys(mask.filters.priority_weights || {}).join(", ")}`,
      tags: [mask.id]
    });
  }

  // Ensure we don't exceed limit
  return narrativeBlocks.slice(0, limit);
}

/**
 * Formats timeline entries for narrative inclusion.
 * Handles date formatting, tag display, and summary highlighting.
 */
export function formatTimelineEntryForNarrative(entry: TimelineEntry): string {
  const dateRange = entry.end ? `${entry.start} – ${entry.end}` : `${entry.start} – Present`;
  const tagDisplay =
    entry.tags && entry.tags.length > 0 ? ` [${entry.tags.join(", ")}]` : "";
  const summary = entry.summary ? `: ${entry.summary}` : "";

  return `**${entry.title}** (${dateRange})${tagDisplay}${summary}`;
}

/**
 * Scores a timeline entry's relevance to given tags.
 * Higher scores = more relevant entries appear first.
 */
export function scoreTimelineEntryRelevance(entry: TimelineEntry, priorityTags: string[]): number {
  if (priorityTags.length === 0) return 0;

  const entryTags = new Set((entry.tags || []).map((t) => t.toLowerCase()));
  const prioritySet = new Set(priorityTags.map((t) => t.toLowerCase()));

  let score = 0;

  // Exact tag matches
  [...entryTags].forEach((tag) => {
    if (prioritySet.has(tag)) score += 2;
  });

  // Partial tag matches
  [...entryTags].forEach((tag) => {
    [...prioritySet].forEach((priority) => {
      if (tag.includes(priority) || priority.includes(tag)) score += 1;
    });
  });

  // Recency boost (assuming ISO date format)
  if (entry.start) {
    const entryDate = new Date(entry.start).getTime();
    const now = Date.now();
    const ageInMonths = (now - entryDate) / (1000 * 60 * 60 * 24 * 30);
    const recencyScore = Math.max(0, 1 - ageInMonths / 36); // 3-year decay
    score += recencyScore * 2;
  }

  return score;
}

/**
 * Groups timeline entries by specified field (stageId, epochId, tag, etc).
 * Useful for organizing narrative sections.
 */
export function groupTimelineEntries(
  entries: TimelineEntry[],
  groupBy: "tag" | "stageId" | "epochId"
): Map<string, TimelineEntry[]> {
  const groups = new Map<string, TimelineEntry[]>();

  entries.forEach((entry) => {
    let keys: string[] = [];

    if (groupBy === "tag") {
      keys = entry.tags || [];
    } else if (groupBy === "stageId") {
      if (entry.stageId) keys = [entry.stageId];
    } else if (groupBy === "epochId") {
      if (entry.epochId) keys = [entry.epochId];
    }

    keys.forEach((key) => {
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(entry);
    });
  });

  return groups;
}
