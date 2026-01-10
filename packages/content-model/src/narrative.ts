import type { Epoch, Mask, Stage, Personality, Setting } from "@in-midst-my-life/schema";
import { generateNarrativeBlock } from "./llm-provider";
import type {
  MaskedProfile,
  NarrativeBlock,
  NarrativeMeta,
  NarrativeOutput,
  NarrativeViewConfig,
  TimelineEntry,
  TimelineRenderOptions,
  Template,
  WeightedMask
} from "./types";

export const PERSONALITY_TAXONOMY: Personality[] = [
  { id: "convergent", label: "Convergent", orientation: "Narrowing, selecting, filtering." },
  { id: "divergent", label: "Divergent", orientation: "Expanding and proliferating possibilities." },
  { id: "reflective", label: "Reflective", orientation: "Deliberation and meta-cognition." },
  { id: "assertive", label: "Assertive", orientation: "Decisive action and high agency." },
  { id: "adaptive", label: "Adaptive", orientation: "Real-time morphing and situational intelligence." },
  { id: "investigative", label: "Investigative", orientation: "Probing, evidence-seeking, validation." },
  { id: "constructive", label: "Constructive", orientation: "Building, assembling, iterating." },
  { id: "disruptive", label: "Disruptive", orientation: "Challenging structures and norms." },
  { id: "harmonic", label: "Harmonic", orientation: "Balancing opposing forces and viewpoints." }
];

export const MASK_PERSONALITY_RELATIONS: Record<string, string> = {
  analyst: "investigative",
  synthesist: "divergent",
  observer: "reflective",
  strategist: "assertive",
  speculator: "adaptive",
  interpreter: "constructive",
  artisan: "constructive",
  architect: "assertive",
  narrator: "harmonic",
  provoker: "disruptive",
  mediator: "harmonic",
  executor: "assertive",
  steward: "reflective",
  integrator: "adaptive",
  custodian: "harmonic",
  calibrator: "convergent"
};

export const SETTING_TAXONOMY: Setting[] = [
  { id: "setting/research", title: "Research Lab", summary: "Exploration, inquiry, and synthesis.", tags: ["research", "analysis"] },
  { id: "setting/studio", title: "Studio", summary: "Ideation, design, and composition.", tags: ["design", "ideation"] },
  { id: "setting/production", title: "Production Floor", summary: "Execution, delivery, and build.", tags: ["delivery", "build"] },
  { id: "setting/lab", title: "Calibration Lab", summary: "Testing, refinement, verification.", tags: ["testing", "quality"] },
  { id: "setting/public", title: "Public Stage", summary: "Publishing, presentation, transmission.", tags: ["communication", "presentation"] },
  { id: "setting/retreat", title: "Reflection Space", summary: "Retrospective analysis and synthesis.", tags: ["reflection", "retrospective"] },
  { id: "setting/arena", title: "Negotiation Table", summary: "Alignment, negotiation, and stakeholder work.", tags: ["alignment", "collaboration"] },
  { id: "setting/archive", title: "Archive", summary: "Documentation, preservation, record-keeping.", tags: ["documentation", "records"] }
];

export const STAGE_SETTING_RELATIONS: Record<string, string> = {
  "stage/inquiry": "setting/research",
  "stage/design": "setting/studio",
  "stage/construction": "setting/production",
  "stage/calibration": "setting/lab",
  "stage/transmission": "setting/public",
  "stage/reflection": "setting/retreat",
  "stage/negotiation": "setting/arena",
  "stage/archival": "setting/archive"
};

export const MASK_STAGE_AFFINITIES: Record<string, Record<string, number>> = {
  analyst: { "stage/inquiry": 1, "stage/calibration": 0.75, "stage/archival": 0.5 },
  synthesist: { "stage/design": 1, "stage/reflection": 0.75, "stage/inquiry": 0.5 },
  observer: { "stage/reflection": 1, "stage/inquiry": 0.75, "stage/archival": 0.5 },
  strategist: { "stage/design": 1, "stage/negotiation": 0.75, "stage/transmission": 0.5 },
  speculator: { "stage/inquiry": 0.75, "stage/design": 0.5, "stage/reflection": 0.5 },
  interpreter: { "stage/transmission": 1, "stage/negotiation": 0.75 },
  artisan: { "stage/construction": 1, "stage/design": 0.75 },
  architect: { "stage/design": 1, "stage/construction": 0.75, "stage/calibration": 0.5 },
  narrator: { "stage/transmission": 1, "stage/reflection": 0.75 },
  provoker: { "stage/negotiation": 0.75, "stage/design": 0.5, "stage/construction": 0.5 },
  mediator: { "stage/negotiation": 1, "stage/reflection": 0.5 },
  executor: { "stage/construction": 1, "stage/transmission": 0.5 },
  steward: { "stage/archival": 1, "stage/calibration": 0.75 },
  integrator: { "stage/construction": 0.75, "stage/negotiation": 0.5, "stage/transmission": 0.5 },
  custodian: { "stage/archival": 1, "stage/calibration": 0.5 },
  calibrator: { "stage/calibration": 1, "stage/inquiry": 0.5 }
};

export const EPOCH_MASK_MODIFIERS: Record<string, Record<string, number>> = {
  initiation: { observer: 1, analyst: 0.75, artisan: 0.5, synthesist: 0.5 },
  expansion: { strategist: 1, integrator: 0.75, mediator: 0.5, executor: 0.5 },
  consolidation: { steward: 0.75, custodian: 0.5, calibrator: 0.5, architect: 0.5 },
  divergence: { speculator: 1, provoker: 0.75, synthesist: 0.5 },
  mastery: { architect: 1, calibrator: 0.75, custodian: 0.5, narrator: 0.5 },
  reinvention: { speculator: 0.75, narrator: 0.5, artisan: 0.5, strategist: 0.5 },
  transmission: { narrator: 1, interpreter: 0.75, mediator: 0.5 },
  legacy: { custodian: 1, steward: 0.75, narrator: 0.5 }
};

export const MASK_TAXONOMY: Mask[] = [
  {
    id: "analyst",
    name: "Analyst",
    ontology: "cognitive",
    functional_scope: "precision reasoning, decomposition, structure",
    stylistic_parameters: { tone: "neutral", rhetorical_mode: "deductive", compression_ratio: 0.55 },
    activation_rules: { contexts: ["analysis", "research", "validation"], triggers: ["metric", "benchmark"] },
    filters: { include_tags: ["analysis", "metrics", "impact"], exclude_tags: ["speculation"], priority_weights: { impact: 2, metrics: 2 } }
  },
  {
    id: "synthesist",
    name: "Synthesist",
    ontology: "cognitive",
    functional_scope: "pattern merging and integrative creativity",
    stylistic_parameters: { tone: "expansive", rhetorical_mode: "comparative", compression_ratio: 0.65 },
    activation_rules: { contexts: ["strategy", "research", "exploration"], triggers: ["pattern", "signal"] },
    filters: { include_tags: ["research", "vision", "integration"], exclude_tags: ["narrow"], priority_weights: { vision: 2 } }
  },
  {
    id: "observer",
    name: "Observer",
    ontology: "cognitive",
    functional_scope: "detached perception and data intake",
    stylistic_parameters: { tone: "measured", rhetorical_mode: "expository", compression_ratio: 0.6 },
    activation_rules: { contexts: ["audit", "discovery"], triggers: ["anomaly", "trend"] },
    filters: { include_tags: ["observability", "research"], exclude_tags: [], priority_weights: { reliability: 1 } }
  },
  {
    id: "strategist",
    name: "Strategist",
    ontology: "cognitive",
    functional_scope: "long-horizon planning and prioritization",
    stylistic_parameters: { tone: "persuasive", rhetorical_mode: "comparative", compression_ratio: 0.65 },
    activation_rules: { contexts: ["roadmap", "product", "portfolio"], triggers: ["tradeoff", "priority"] },
    filters: { include_tags: ["roadmap", "vision"], exclude_tags: [], priority_weights: { vision: 2, priority: 2 } }
  },
  {
    id: "speculator",
    name: "Speculator",
    ontology: "cognitive",
    functional_scope: "scenario projection and hypothesis generation",
    stylistic_parameters: { tone: "exploratory", rhetorical_mode: "hypothetical", compression_ratio: 0.7 },
    activation_rules: { contexts: ["futures", "exploration"], triggers: ["what-if", "risk"] },
    filters: { include_tags: ["hypothesis", "risk"], exclude_tags: ["certainty"], priority_weights: { risk: 1 } }
  },
  {
    id: "interpreter",
    name: "Interpreter",
    ontology: "expressive",
    functional_scope: "translation across media and audiences",
    stylistic_parameters: { tone: "clarifying", rhetorical_mode: "dialogic", compression_ratio: 0.6 },
    activation_rules: { contexts: ["communication", "handoff"], triggers: ["bridge", "translate"] },
    filters: { include_tags: ["communication", "documentation"], exclude_tags: [], priority_weights: { clarity: 2 } }
  },
  {
    id: "artisan",
    name: "Artisan",
    ontology: "expressive",
    functional_scope: "craft-level creation and refinement",
    stylistic_parameters: { tone: "precise", rhetorical_mode: "narrative", compression_ratio: 0.55 },
    activation_rules: { contexts: ["craft", "build"], triggers: ["prototype", "artifact"] },
    filters: { include_tags: ["craft", "artifact"], exclude_tags: [], priority_weights: { quality: 2 } }
  },
  {
    id: "architect",
    name: "Architect",
    ontology: "expressive",
    functional_scope: "systems design and conceptual framing",
    stylistic_parameters: { tone: "assertive", rhetorical_mode: "structured", compression_ratio: 0.6 },
    activation_rules: { contexts: ["design", "systems", "architecture"], triggers: ["blueprint", "diagram"] },
    filters: { include_tags: ["design", "system"], exclude_tags: ["ad-hoc"], priority_weights: { reliability: 3, scalability: 3 } }
  },
  {
    id: "narrator",
    name: "Narrator",
    ontology: "expressive",
    functional_scope: "story-first framing with outcomes and emotion",
    stylistic_parameters: { tone: "warm", rhetorical_mode: "story", compression_ratio: 0.7 },
    activation_rules: { contexts: ["story", "case-study"], triggers: ["impact", "user-story"] },
    filters: { include_tags: ["impact", "user"], exclude_tags: [], priority_weights: { impact: 2 } }
  },
  {
    id: "provoker",
    name: "Provoker",
    ontology: "expressive",
    functional_scope: "disruption and tension-generation",
    stylistic_parameters: { tone: "direct", rhetorical_mode: "critical", compression_ratio: 0.5 },
    activation_rules: { contexts: ["innovation", "retrospective"], triggers: ["anti-pattern", "contrarian"] },
    filters: { include_tags: ["experiment", "innovation"], exclude_tags: ["status-quo"], priority_weights: { innovation: 2 } }
  },
  {
    id: "mediator",
    name: "Mediator",
    ontology: "expressive",
    functional_scope: "alignment and stakeholder framing",
    stylistic_parameters: { tone: "empathetic", rhetorical_mode: "dialogic", compression_ratio: 0.6 },
    activation_rules: { contexts: ["alignment", "collaboration"], triggers: ["consensus", "handoff"] },
    filters: { include_tags: ["stakeholder", "collaboration"], exclude_tags: [], priority_weights: { collaboration: 2 } }
  },
  {
    id: "executor",
    name: "Executor",
    ontology: "operational",
    functional_scope: "action, throughput, closure",
    stylistic_parameters: { tone: "decisive", rhetorical_mode: "procedural", compression_ratio: 0.5 },
    activation_rules: { contexts: ["delivery", "launch"], triggers: ["deadline", "rollout"] },
    filters: { include_tags: ["delivery", "release"], exclude_tags: ["blocked"], priority_weights: { delivery: 2, reliability: 1 } }
  },
  {
    id: "steward",
    name: "Steward",
    ontology: "operational",
    functional_scope: "maintenance, governance, oversight",
    stylistic_parameters: { tone: "measured", rhetorical_mode: "forensic", compression_ratio: 0.5 },
    activation_rules: { contexts: ["maintenance", "governance"], triggers: ["runbook", "audit"] },
    filters: { include_tags: ["reliability", "observability"], exclude_tags: [], priority_weights: { reliability: 3 } }
  },
  {
    id: "integrator",
    name: "Integrator",
    ontology: "operational",
    functional_scope: "cross-team assembly and interoperability",
    stylistic_parameters: { tone: "technical", rhetorical_mode: "expository", compression_ratio: 0.55 },
    activation_rules: { contexts: ["integration", "platform"], triggers: ["contract", "interface"] },
    filters: { include_tags: ["integration", "api"], exclude_tags: ["silo"], priority_weights: { integration: 2, api: 1 } }
  },
  {
    id: "custodian",
    name: "Custodian",
    ontology: "operational",
    functional_scope: "record-keeping, curation, historical fidelity",
    stylistic_parameters: { tone: "measured", rhetorical_mode: "forensic", compression_ratio: 0.5 },
    activation_rules: { contexts: ["operations", "compliance"], triggers: ["audit", "incident"] },
    filters: { include_tags: ["reliability", "governance"], exclude_tags: [], priority_weights: { reliability: 3 } }
  },
  {
    id: "calibrator",
    name: "Calibrator",
    ontology: "operational",
    functional_scope: "evaluation, metrics, standards alignment",
    stylistic_parameters: { tone: "precise", rhetorical_mode: "evaluative", compression_ratio: 0.5 },
    activation_rules: { contexts: ["quality", "testing"], triggers: ["benchmark", "defect"] },
    filters: { include_tags: ["quality", "testing"], exclude_tags: ["speculative"], priority_weights: { quality: 3 } }
  }
];

export const STAGE_TAXONOMY: Stage[] = [
  { id: "stage/inquiry", title: "Inquiry", summary: "Research, exploration, question formation", tags: ["research", "exploration"], order: 1 },
  { id: "stage/design", title: "Design", summary: "Ideation, architectural thinking, structuring", tags: ["design", "architecture"], order: 2 },
  { id: "stage/construction", title: "Construction", summary: "Production and implementation", tags: ["build", "delivery"], order: 3 },
  { id: "stage/calibration", title: "Calibration", summary: "Testing, refinement, verification", tags: ["testing", "quality"], order: 4 },
  { id: "stage/transmission", title: "Transmission", summary: "Publishing and presentation", tags: ["communication", "docs"], order: 5 },
  { id: "stage/reflection", title: "Reflection", summary: "Retrospective analysis, synthesis", tags: ["retro", "synthesis"], order: 6 },
  { id: "stage/negotiation", title: "Negotiation", summary: "Alignment and stakeholder engagement", tags: ["stakeholder", "collaboration"], order: 7 },
  { id: "stage/archival", title: "Archival", summary: "Documentation and record-setting", tags: ["documentation", "records"], order: 8 }
];

function pickStages(stageIds: string[]): Stage[] {
  const byId = new Map(STAGE_TAXONOMY.map((stage) => [stage.id, stage]));
  return stageIds.map((id, idx) => ({ ...byId.get(id)!, order: idx + 1 }));
}

export const EPOCH_TAXONOMY: Epoch[] = [
  {
    id: "initiation",
    name: "Initiation",
    order: 1,
    summary: "Entry and foundational skill building",
    stages: pickStages(["stage/inquiry", "stage/design"])
  },
  {
    id: "expansion",
    name: "Expansion",
    order: 2,
    summary: "Diversification and scope scaling",
    stages: pickStages(["stage/construction", "stage/negotiation"])
  },
  {
    id: "consolidation",
    name: "Consolidation",
    order: 3,
    summary: "Integration and coherence building",
    stages: pickStages(["stage/calibration", "stage/reflection"])
  },
  {
    id: "divergence",
    name: "Divergence",
    order: 4,
    summary: "Branching experimentation and exploration",
    stages: pickStages(["stage/inquiry", "stage/construction"])
  },
  {
    id: "mastery",
    name: "Mastery",
    order: 5,
    summary: "System-level thinking and innovation",
    stages: pickStages(["stage/design", "stage/transmission"])
  },
  {
    id: "reinvention",
    name: "Reinvention",
    order: 6,
    summary: "Reboot and reframing for new arcs",
    stages: pickStages(["stage/inquiry", "stage/construction"])
  },
  {
    id: "transmission",
    name: "Transmission",
    order: 7,
    summary: "Teaching, sharing, and institutionalizing knowledge",
    stages: pickStages(["stage/transmission", "stage/archival"])
  },
  {
    id: "legacy",
    name: "Legacy",
    order: 8,
    summary: "Long-term impact and codification",
    stages: pickStages(["stage/archival", "stage/reflection"])
  }
];

const resolveStages = (options?: TimelineRenderOptions, view?: NarrativeViewConfig): Stage[] =>
  options?.stages ?? view?.stages ?? STAGE_TAXONOMY;

const resolveEpochs = (options?: TimelineRenderOptions, view?: NarrativeViewConfig): Epoch[] =>
  options?.epochs ?? view?.epochs ?? EPOCH_TAXONOMY;

const resolveSettings = (options?: TimelineRenderOptions, view?: NarrativeViewConfig): Setting[] =>
  options?.settings ?? view?.settings ?? SETTING_TAXONOMY;

const buildStageMap = (stages: Stage[]) => new Map(stages.map((stage) => [stage.id, stage]));
const buildEpochMap = (epochs: Epoch[]) => new Map(epochs.map((epoch) => [epoch.id, epoch]));
const buildSettingMap = (settings: Setting[]) => new Map(settings.map((setting) => [setting.id, setting]));

const buildStageEpochMap = (epochs: Epoch[], stages: Stage[]) => {
  const map = new Map<string, string>();
  stages.forEach((stage) => {
    if (stage.epochId) map.set(stage.id, stage.epochId);
  });
  epochs.forEach((epoch) => {
    epoch.stages?.forEach((stage) => map.set(stage.id, epoch.id));
  });
  return map;
};

const buildArc = (entries: TimelineEntry[], key: "stageId" | "epochId" | "settingId") => {
  const arc: string[] = [];
  entries.forEach((entry) => {
    const value = entry[key];
    if (!value) return;
    if (arc[arc.length - 1] === value) return;
    if (!arc.includes(value)) arc.push(value);
  });
  return arc;
};

const BASE_TEMPLATES: Template[] = [
  {
    id: "summary",
    title: "Summary",
    body: "{{summary}}",
    minScore: 0,
    weight: 3
  },
  {
    id: "mask-angle",
    title: "Mask Focus",
    body: "This narrative emphasizes {{mask}} across {{contexts}} with tags {{tags}}.",
    minScore: 1,
    weight: 2
  },
  {
    id: "timeline",
    title: "Recent Highlights",
    body: "{{timeline}}",
    minScore: 0,
    weight: 2
  }
];

const MASK_TEMPLATES: Template[] = [
  {
    id: "mask-voice",
    title: "Voice & Emphasis",
    body: "Using the {{mask}} lens to emphasize {{contexts}} with priority on {{tags}}.",
    minScore: 1,
    weight: 2
  },
  {
    id: "mask-personality",
    title: "Mask Personality",
    body: "Personality signal: {{maskPersonality}}. {{maskPersonalitySummary}}",
    minScore: 1,
    weight: 2
  },
  {
    id: "evidence",
    title: "Evidence Trail",
    body: "Key evidence aligned to {{mask}}: {{timeline}}",
    minScore: 2,
    weight: 2
  }
];

const EPOCH_TEMPLATES: Template[] = [
  {
    id: "epoch-arc",
    title: "Career Arc",
    body: "Currently in {{currentEpoch}} with focus on {{currentStage}}; next move: {{nextStage}}.",
    minScore: 1,
    weight: 2
  },
  {
    id: "setting-context",
    title: "Setting Context",
    body: "Current setting: {{currentSetting}} ({{currentStage}} / {{currentEpoch}}).",
    minScore: 1,
    weight: 2
  }
];

const TIMELINE_TEMPLATES: Template[] = [
  {
    id: "timeline-dense",
    title: "Recent Milestones",
    body: "{{timeline}}",
    minScore: 0,
    weight: 1
  }
];

const SPEC_TEMPLATES: Template[] = [
  {
    id: "identity-mode",
    title: "Identity Mode",
    body: "Operating in the {{mask}} mode ({{maskPersonality}}) across {{contexts}}.",
    minScore: 1,
    weight: 3
  },
  {
    id: "stage-context",
    title: "Stage Context",
    body: "Stage: {{currentStage}} within {{currentEpoch}}; focus: {{timelineTheme}}.",
    minScore: 1,
    weight: 3
  },
  {
    id: "sequence",
    title: "Timeline Sequence",
    body: "Sequence highlights: {{timelineSequence}}",
    minScore: 0,
    weight: 2
  },
  {
    id: "stage-arc",
    title: "Stage Arc",
    body: "{{stageArc}}",
    minScore: 1,
    weight: 2
  },
  {
    id: "epoch-arc",
    title: "Epoch Arc",
    body: "{{epochArc}}",
    minScore: 1,
    weight: 2
  },
  {
    id: "setting-arc",
    title: "Setting Arc",
    body: "{{settingArc}}",
    minScore: 1,
    weight: 1
  },
  {
    id: "next-move",
    title: "Next Move",
    body: "Next milestone: {{nextStage}} with emphasis on {{tags}}.",
    minScore: 1,
    weight: 2
  },
  {
    id: "mask-triggers",
    title: "Triggers & Signals",
    body: "Signals activating this mask: {{contexts}}; priority tags: {{tags}}.",
    minScore: 1,
    weight: 1
  }
];

const TEMPLATE_BANK: Template[] = [...BASE_TEMPLATES, ...MASK_TEMPLATES, ...EPOCH_TEMPLATES, ...TIMELINE_TEMPLATES, ...SPEC_TEMPLATES];

const resolvePersonality = (maskId: string | undefined, personalities?: Personality[]): Personality | undefined => {
  if (!maskId) return undefined;
  const personalityId = MASK_PERSONALITY_RELATIONS[maskId];
  const source = personalities ?? PERSONALITY_TAXONOMY;
  return source.find((entry) => entry.id === personalityId);
};

const resolveSetting = (settingId: string | undefined, settings?: Setting[]): Setting | undefined => {
  if (!settingId) return undefined;
  const source = settings ?? SETTING_TAXONOMY;
  return source.find((entry) => entry.id === settingId);
};

const resolveSettingForStage = (stageId: string | undefined, settings?: Setting[]): Setting | undefined => {
  if (!stageId) return undefined;
  const settingId = STAGE_SETTING_RELATIONS[stageId];
  return resolveSetting(settingId, settings);
};

const buildEvidenceLine = (entry: TimelineEntry) => {
  const parts = [
    entry.title,
    entry.summary,
    entry.tags?.length ? `tags: ${entry.tags.join(", ")}` : undefined,
    entry.stageId ? `stage: ${entry.stageId}` : undefined,
    entry.epochId ? `epoch: ${entry.epochId}` : undefined
  ].filter(Boolean);
  return parts.join(" | ");
};

const epochMaskModifier = (maskId: string, epochIds: string[]): number => {
  if (!epochIds.length) return 0;
  return epochIds.reduce((acc, id) => acc + (EPOCH_MASK_MODIFIERS[id]?.[maskId] ?? 0), 0);
};

function recencyWeight(date: string | undefined): number {
  if (!date) return 0;
  const parsed = Date.parse(date);
  if (!Number.isFinite(parsed)) return 0;
  const days = Math.abs(Date.now() - parsed) / (1000 * 60 * 60 * 24);
  const capped = Math.min(days, 365 * 3); // three-year window
  return Math.max(0, 1 - capped / (365 * 3));
}

function inferStageForEntry(entry: TimelineEntry, stages: Stage[]): { stage?: Stage; score: number } {
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

function maskStageAffinity(mask: Mask | undefined, stageId?: string): number {
  if (!mask || !stageId) return 0;
  return MASK_STAGE_AFFINITIES[mask.id]?.[stageId] ?? 0;
}

function maskWeightForEntry(entry: TimelineEntry, mask: Mask | undefined, _stageId?: string): number {
  if (!mask) return 0;
  const tags = new Set((entry.tags ?? []).map((t) => t.toLowerCase()));
  const includes = new Set(mask.filters.include_tags.map((t) => t.toLowerCase()));
  const excludes = new Set(mask.filters.exclude_tags.map((t) => t.toLowerCase()));
  if ([...tags].some((t) => excludes.has(t))) return 0;
  const includeScore = [...tags].filter((t) => includes.has(t)).length;
  const priorityScore = Object.entries(mask.filters.priority_weights ?? {}).reduce((acc, [tag, weight]) => {
    return acc + (tags.has(tag.toLowerCase()) ? weight : 0);
  }, 0);
  return includeScore + priorityScore;
}

function enrichTimelineEntry(entry: TimelineEntry, mask: Mask | undefined, options: TimelineRenderOptions): TimelineEntry {
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
    weight: recency + score + maskScore + tagScore + epochBoost + stageAffinity
  };
}

/**
 * Applies a mask to a profile and returns an annotated view with optional highlights.
 * This is intentionally lightweight; deeper filtering happens in downstream renderers.
 */
export function applyMask(config: {
  profile: NarrativeViewConfig["profile"];
  mask?: Mask;
  highlights?: string[];
}): MaskedProfile {
  return {
    profile: config.profile,
    mask: config.mask,
    highlights: config.highlights ?? []
  };
}

/**
 * Builds a simple narrative block list from a masked profile.
 * Later phases can replace this with richer block generation per SPEC-002/SPEC-003.
 */
export function buildNarrative(view: NarrativeViewConfig): NarrativeBlock[] {
  const title = view.mask ? `${view.profile.displayName} (${view.mask.name})` : view.profile.displayName;
  const summary =
    view.summary ??
    view.profile.summaryMarkdown ??
    "Narrative pending implementation of content pipeline.";

  return [
    {
      title,
      body: summary,
      tags: view.tags ?? view.mask?.filters.include_tags ?? [],
      templateId: "profile-summary",
      weight: 3
    }
  ];
}

/**
 * Orders timeline entries by start date (desc default) and returns stable copies.
 */
export function renderTimeline(
  entries: TimelineEntry[],
  order: "asc" | "desc" = "desc"
): TimelineEntry[] {
  const normalizeDate = (value?: string): number => {
    if (!value) return order === "asc" ? Number.POSITIVE_INFINITY : Number.NEGATIVE_INFINITY;
    const parsed = Date.parse(value);
    return Number.isFinite(parsed) ? parsed : order === "asc" ? Number.POSITIVE_INFINITY : Number.NEGATIVE_INFINITY;
  };

  return [...entries].sort((a, b) => {
    if (a.weight !== undefined && b.weight !== undefined && a.weight !== b.weight) {
      return order === "asc" ? a.weight - b.weight : b.weight - a.weight;
    }
    const aDate = normalizeDate(a.start);
    const bDate = normalizeDate(b.start);
    return order === "asc" ? aDate - bDate : bDate - aDate;
  });
}

/**
 * Filters timeline entries by mask include/exclude tags, ordering, and optional limit.
 */
export function renderTimelineForMask(
  entries: TimelineEntry[],
  mask: Mask | undefined,
  options: TimelineRenderOptions = {}
): TimelineEntry[] {
  const order = options.order ?? "desc";
  const tags = new Set(options.tagFilter?.map((t) => t.toLowerCase()) ?? []);
  const includeTags = new Set(mask?.filters.include_tags?.map((t) => t.toLowerCase()) ?? []);
  const excludeTags = new Set(mask?.filters.exclude_tags?.map((t) => t.toLowerCase()) ?? []);
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
      if (excludeTags.size && entryTags.some((t) => excludeTags.has(t))) return false;
      if (!hasExplicitStage && includeTags.size && !entryTags.some((t) => includeTags.has(t))) return false;
      if (!hasExplicitStage && tags.size && !entryTags.some((t) => tags.has(t))) return false;
      if (includeStages.size && (!entry.stageId || !includeStages.has(entry.stageId))) return false;
      if (excludeStages.size && entry.stageId && excludeStages.has(entry.stageId)) return false;
      if (includeEpochs.size && (!entry.epochId || !includeEpochs.has(entry.epochId))) return false;
      if (excludeEpochs.size && entry.epochId && excludeEpochs.has(entry.epochId)) return false;
      if (includeSettings.size && (!entry.settingId || !includeSettings.has(entry.settingId))) return false;
      if (excludeSettings.size && entry.settingId && excludeSettings.has(entry.settingId)) return false;
      return true;
    });

  const sorted = renderTimeline(enriched, order);
  return options.limit ? sorted.slice(0, options.limit) : sorted;
}

/**
 * Builds a richer narrative block combining mask, summary, and timeline callouts.
 */
export function buildNarrativeWithTimeline(view: NarrativeViewConfig): NarrativeBlock[] {
  const blocks = buildNarrative(view);
  const stages = resolveStages(undefined, view);
  const settings = resolveSettings(undefined, view);
  const epochs = resolveEpochs(undefined, view);
  const stageMap = buildStageMap(stages);
  const settingMap = buildSettingMap(settings);
  const epochMap = buildEpochMap(epochs);
  const timeline = view.timeline
    ? renderTimelineForMask(view.timeline, view.mask, { order: "desc", limit: 5, stages, epochs, settings })
    : [];

  if (timeline.length > 0) {
    blocks.push({
      title: "Recent Highlights",
      body: timeline
        .map((entry) => `• ${formatTimelineEntry(entry, stageMap, settingMap, epochMap)}`)
        .join("\n"),
      tags: view.mask?.filters.include_tags ?? view.tags,
      templateId: "timeline",
      weight: 2
    });
  }

  return blocks;
}

function formatStage(stage: Stage, settingMap: Map<string, Setting>) {
  const settingId = STAGE_SETTING_RELATIONS[stage.id];
  const settingLabel = settingId ? settingMap.get(settingId)?.title : undefined;
  const settingSuffix = settingLabel ? ` (${settingLabel})` : "";
  return `• ${stage.title}${stage.summary ? ` — ${stage.summary}` : ""}${settingSuffix}`;
}

function formatEpoch(epoch: Epoch, settingMap: Map<string, Setting>) {
  const stageLines = (epoch.stages ?? []).map((stage) => formatStage(stage, settingMap));
  const header = `Epoch: ${epoch.name}`;
  return [header, ...stageLines].join("\n");
}

function formatTimelineEntry(
  entry: TimelineEntry,
  stageMap: Map<string, Stage>,
  settingMap: Map<string, Setting>,
  epochMap: Map<string, Epoch>
) {
  const end = entry.end ? ` – ${entry.end}` : "";
  const stageLabel = entry.stageId ? stageMap.get(entry.stageId)?.title ?? "" : "";
  const stageSuffix = stageLabel ? ` [${stageLabel}]` : "";
  const settingLabel = entry.settingId ? settingMap.get(entry.settingId)?.title ?? "" : "";
  const settingSuffix = settingLabel ? ` @ ${settingLabel}` : "";
  const epochLabel = entry.epochId ? epochMap.get(entry.epochId)?.name ?? "" : "";
  const epochSuffix = epochLabel ? ` · ${epochLabel}` : "";
  return `${entry.title}${stageSuffix}${settingSuffix}${epochSuffix} (${entry.start}${end})${
    entry.summary ? `: ${entry.summary}` : ""
  }`;
}

/**
 * Builds narrative blocks that include epoch/stage context and mask scoring info.
 */
export function buildNarrativeWithEpochs(view: NarrativeViewConfig): NarrativeBlock[] {
  const blocks = buildNarrativeWithTimeline(view);

  if (view.epochs && view.epochs.length > 0) {
    const sorted = [...view.epochs].sort((a, b) => a.order - b.order);
    const settings = resolveSettings(undefined, view);
    const settingMap = buildSettingMap(settings);
    blocks.push({
      title: "Epochs & Stages",
      body: sorted.map((epoch) => formatEpoch(epoch, settingMap)).join("\n\n"),
      tags: ["epochs"],
      templateId: "epochs-stages",
      weight: 2
    });
  }

  if (view.availableMasks && view.availableMasks.length > 0) {
    const selected = selectMasksForView(view);
    blocks.push({
      title: "Suggested Masks",
      body:
        selected
          .slice(0, 3)
          .map((m) => `• ${m.name} (${m.functional_scope})`)
          .join("\n") || "No masks matched this context.",
      templateId: "suggested-masks",
      weight: 1
    });
  }

  return blocks;
}

function interpolate(template: string, vars: Record<string, string>) {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key) => vars[key] ?? "");
}

function maskWeight(
  mask: Mask,
  view: NarrativeViewConfig,
  options?: { activeEpochIds?: string[]; stageIds?: string[] }
): number {
  const contexts = new Set((view.contexts ?? []).map((c) => c.toLowerCase()));
  const tags = new Set((view.tags ?? []).map((t) => t.toLowerCase()));
  let score = 0;

  mask.activation_rules.contexts.forEach((c) => {
    if (contexts.has(c.toLowerCase())) score += 2;
  });
  mask.activation_rules.triggers.forEach((t) => {
    if (contexts.has(t.toLowerCase())) score += 1;
  });
  mask.filters.include_tags.forEach((t) => {
    if (tags.has(t.toLowerCase())) score += 2;
  });
  mask.filters.exclude_tags.forEach((t) => {
    if (tags.has(t.toLowerCase())) score -= 1;
  });
  Object.entries(mask.filters.priority_weights ?? {}).forEach(([tag, weight]) => {
    if (tags.has(tag.toLowerCase())) score += weight;
  });
  const stageAffinity = (options?.stageIds ?? []).reduce((acc, stageId) => {
    return acc + (MASK_STAGE_AFFINITIES[mask.id]?.[stageId] ?? 0);
  }, 0);
  const epochBoost = epochMaskModifier(mask.id, options?.activeEpochIds ?? []);
  return score + stageAffinity + epochBoost;
}

function stageWeight(stage: Stage, view: NarrativeViewConfig): number {
  const tags = new Set((view.tags ?? []).map((t) => t.toLowerCase()));
  const stageTags = (stage.tags ?? []).map((t) => t.toLowerCase());
  return stageTags.filter((t) => tags.has(t)).length;
}

function formatTimeline(
  entries: TimelineEntry[],
  stageMap: Map<string, Stage>,
  settingMap: Map<string, Setting>,
  epochMap: Map<string, Epoch>
) {
  return entries.map((entry) => formatTimelineEntry(entry, stageMap, settingMap, epochMap)).join("\n");
}

async function buildNarrativePlan(view: NarrativeViewConfig): Promise<NarrativeOutput> {
  const stages = resolveStages(undefined, view);
  const epochs = resolveEpochs(undefined, view);
  const settings = resolveSettings(undefined, view);
  const stageMap = buildStageMap(stages);
  const epochMap = buildEpochMap(epochs);
  const settingMap = buildSettingMap(settings);
  const sortedEpochs = epochs.slice().sort((a, b) => a.order - b.order);

  const timelineAll = view.timeline
    ? renderTimelineForMask(view.timeline, undefined, { order: "desc", stages, epochs, settings })
    : [];
  const stageArcIds = buildArc(timelineAll, "stageId");
  const epochArcIds = buildArc(timelineAll, "epochId");
  const settingArcIds = buildArc(timelineAll, "settingId");
  const hasExplicitEpochs = Boolean(view.epochs && view.epochs.length > 0);
  const activeEpochIds =
    epochArcIds.length > 0
      ? epochArcIds
      : hasExplicitEpochs && sortedEpochs[0]
        ? [sortedEpochs[0].id]
        : [];

  const selectedMasks: WeightedMask[] = (view.availableMasks ?? [])
    .map((mask) => ({ mask, score: maskWeight(mask, view, { activeEpochIds, stageIds: stageArcIds }) }))
    .filter((m) => m.score > 0)
    .sort((a, b) => b.score - a.score);

  const chosenMask = view.mask ?? selectedMasks[0]?.mask;
  const timelineForMask = view.timeline
    ? renderTimelineForMask(view.timeline, chosenMask, { order: "desc", stages, epochs, settings })
    : [];
  const timelineHighlights = timelineForMask.slice(0, 5);
  const sequenceTimeline = timelineForMask;

  const currentEntry = timelineForMask[0];
  const currentStage = currentEntry?.stageId ? stageMap.get(currentEntry.stageId) : undefined;
  const currentEpoch = currentEntry?.epochId ? epochMap.get(currentEntry.epochId) : undefined;
  const resolvedEpoch = currentEpoch ?? sortedEpochs[0];
  const stagesForEpoch = (epochId?: string) => {
    if (!epochId) return [];
    const byEpoch = stages.filter((stage) => stage.epochId === epochId);
    if (byEpoch.length > 0) return byEpoch;
    const epoch = epochMap.get(epochId);
    return epoch?.stages ?? [];
  };
  const epochStages = resolvedEpoch ? stagesForEpoch(resolvedEpoch.id) : [];
  const sortedStages = epochStages.slice().sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  const resolvedStage = currentStage ?? sortedStages[0];
  const nextStage = resolvedStage
    ? sortedStages.find((stage) => (stage.order ?? 0) > (resolvedStage.order ?? 0))
    : undefined;
  const personality = resolvePersonality(chosenMask?.id, view.personalities);
  const currentSetting = resolveSettingForStage(resolvedStage?.id, settings);

  const stageArcLabel =
    stageArcIds.length > 0
      ? stageArcIds.map((id) => stageMap.get(id)?.title ?? id).join(" → ")
      : "No stage arc yet.";
  const epochArcLabel =
    epochArcIds.length > 0
      ? epochArcIds.map((id) => epochMap.get(id)?.name ?? id).join(" → ")
      : "No epoch arc yet.";
  const settingArcLabel =
    settingArcIds.length > 0
      ? settingArcIds.map((id) => settingMap.get(id)?.title ?? id).join(" → ")
      : "No setting arc yet.";

  const timelineStageId = timelineForMask.find((entry) => entry.stageId)?.stageId;
  const timelineTopStage = timelineStageId ? stageMap.get(timelineStageId) : undefined;

  const templateVars = {
    summary:
      view.summary ?? view.profile.summaryMarkdown ?? "Narrative pending implementation of content pipeline.",
    mask: chosenMask ? chosenMask.name : "general",
    contexts: (view.contexts ?? []).join(", "),
    tags: (view.tags ?? []).join(", "),
    timeline:
      timelineHighlights.length > 0
        ? formatTimeline(timelineHighlights, stageMap, settingMap, epochMap)
        : "No recent highlights.",
    currentEpoch: resolvedEpoch?.name ?? "Current",
    currentStage: resolvedStage?.title ?? "Execution",
    nextStage: nextStage?.title ?? "Next milestone",
    maskPersonality: personality?.label ?? "Adaptive",
    maskPersonalitySummary: personality?.orientation ?? personality?.summary ?? "",
    currentSetting: currentSetting?.title ?? "Default",
    timelineSequence:
      sequenceTimeline.length > 1
        ? sequenceTimeline.map((entry) => entry.title).join(" → ")
        : sequenceTimeline.map((entry) => entry.title).join(", ") || "No recent highlights.",
    timelineTheme: timelineTopStage?.summary ?? resolvedStage?.summary ?? "Execution cadence",
    stageArc: stageArcLabel,
    epochArc: epochArcLabel,
    settingArc: settingArcLabel
  };

  const baseline = buildNarrativeWithEpochs({ ...view, mask: chosenMask, stages, epochs, settings });
  const existingTemplateIds = new Set(baseline.map((block) => block.templateId).filter(Boolean));
  const topScore = selectedMasks[0]?.score ?? 1;
  const weightedTemplates = TEMPLATE_BANK.filter((tpl) => (tpl.minScore ?? 0) <= topScore).sort(
    (a, b) => (b.weight ?? 1) - (a.weight ?? 1)
  );

  // We map sequentially or use Promise.all to handle async generation
  for (const tpl of weightedTemplates) {
    if (existingTemplateIds.has(tpl.id)) continue;
    
    // For key templates, use the LLM provider
    let body = interpolate(tpl.body, templateVars);
    if (["mask-voice", "evidence", "summary"].includes(tpl.id)) {
      const modelMaxTokens = Number(process.env["LLM_CONTEXT_WINDOW"] ?? process.env["LOCAL_LLM_MAX_TOKENS"] ?? 4096);
      body = await generateNarrativeBlock({
        mask: chosenMask ? chosenMask.name : "General",
        personality: personality?.label ?? "Neutral",
        tone: chosenMask?.stylistic_parameters.tone ?? "Professional",
        focusTags: view.tags ?? [],
        recentEvents: timelineHighlights.map(buildEvidenceLine)
      }, tpl.id, { orchestratorUrl: view.orchestratorUrl, modelMaxTokens });
    }

    baseline.push({
      title: tpl.title,
      body,
      tags: view.tags,
      templateId: tpl.id,
      weight: tpl.weight ?? 1
    });
  }

  if (resolvedEpoch && sortedStages.length > 0) {
    const topStage = sortedStages
      .slice()
      .sort((a, b) => stageWeight(b, view) - stageWeight(a, view))[0];
    if (topStage) {
      baseline.push({
        title: "Stage Spotlight",
        body: formatStage(topStage, settingMap),
        templateId: "stage-spotlight",
        weight: 2
      });
    }
  }

  const byStage = timelineForMask.reduce<Record<string, number>>((acc, entry) => {
    if (!entry.stageId) return acc;
    acc[entry.stageId] = (acc[entry.stageId] ?? 0) + 1;
    return acc;
  }, {});
  const byEpoch = timelineForMask.reduce<Record<string, number>>((acc, entry) => {
    if (!entry.epochId) return acc;
    acc[entry.epochId] = (acc[entry.epochId] ?? 0) + 1;
    return acc;
  }, {});

  const meta: NarrativeMeta = {
    mask: chosenMask,
    personality,
    epoch: resolvedEpoch,
    stage: resolvedStage,
    setting: currentSetting,
    relations: {
      maskPersonalityId: chosenMask ? MASK_PERSONALITY_RELATIONS[chosenMask.id] : undefined,
      stageSettingId: resolvedStage ? STAGE_SETTING_RELATIONS[resolvedStage.id] : undefined,
      epochMaskModifiers: resolvedEpoch ? EPOCH_MASK_MODIFIERS[resolvedEpoch.id] : undefined,
      maskStageAffinities: chosenMask ? MASK_STAGE_AFFINITIES[chosenMask.id] : undefined
    },
    timeline: {
      total: timelineForMask.length,
      byStage,
      byEpoch,
      stageArc: stageArcIds,
      epochArc: epochArcIds
    }
  };

  return { blocks: baseline, meta };
}

/**
 * Builds narrative blocks using template/weighting with masks, contexts, tags, epochs.
 */
export async function buildWeightedNarrative(view: NarrativeViewConfig): Promise<NarrativeBlock[]> {
  return (await buildNarrativePlan(view)).blocks;
}

export async function buildNarrativeOutput(view: NarrativeViewConfig): Promise<NarrativeOutput> {
  return buildNarrativePlan(view);
}

/**
 * Scores a mask against view contexts and tags using simple overlap counts.
 */
export function scoreMaskForView(mask: Mask, view: NarrativeViewConfig): number {
  const contexts = new Set((view.contexts ?? []).map((c) => c.toLowerCase()));
  const tags = new Set((view.tags ?? []).map((t) => t.toLowerCase()));
  const includes = new Set((mask.filters.include_tags ?? []).map((t) => t.toLowerCase()));
  const excludes = new Set((mask.filters.exclude_tags ?? []).map((t) => t.toLowerCase()));

  // Penalize if required tags excluded.
  if ([...tags].some((t) => excludes.has(t))) return 0;

  const contextScore = mask.activation_rules.contexts.filter((c) => contexts.has(c.toLowerCase()))
    .length;
  const triggerScore = mask.activation_rules.triggers.filter((t) => contexts.has(t.toLowerCase()))
    .length;
  const tagScore = [...tags].filter((t) => includes.has(t)).length;
  return contextScore + triggerScore + tagScore;
}

/**
 * Selects top masks for a view, sorted by score then name.
 */
export function selectMasksForView(view: NarrativeViewConfig): Mask[] {
  const masks = view.availableMasks ?? (view.mask ? [view.mask] : []);
  const scored = masks
    .map((mask) => ({ mask, score: scoreMaskForView(mask, view) }))
    .filter((entry) => entry.score > 0)
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return a.mask.name.localeCompare(b.mask.name);
    });
  return scored.map((entry) => entry.mask);
}
