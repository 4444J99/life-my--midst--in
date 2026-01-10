import type { Epoch, Mask, Profile, Stage, Personality, Setting } from "@in-midst-my-life/schema";

export interface TimelineEntry {
  id: string;
  title: string;
  summary?: string;
  start: string;
  end?: string;
  tags?: string[];
  /**
   * Optionally bind to a stage/epoch so renderers can thread timelines into arcs.
   */
  stageId?: string;
  epochId?: string;
  /**
   * Optional setting context derived from stage taxonomy.
   */
  settingId?: string;
  /**
   * Internal scoring for timeline rendering.
   */
  weight?: number;
}

export interface NarrativeBlock {
  title: string;
  body: string;
  tags?: string[];
  templateId?: string;
  weight?: number;
}

export interface NarrativeViewConfig {
  profile: Profile;
  mask?: Mask;
  availableMasks?: Mask[];
  highlights?: string[];
  timeline?: TimelineEntry[];
  summary?: string;
  tags?: string[];
  contexts?: string[];
  epochs?: Epoch[];
  stages?: Stage[];
  personalities?: Personality[];
  settings?: Setting[];
  orchestratorUrl?: string;
}

export interface Template {
  id: string;
  title: string;
  body: string;
  minScore?: number;
  weight?: number;
}

export interface WeightedMask {
  mask: Mask;
  score: number;
}

export interface MaskedProfile {
  profile: Profile;
  mask?: Mask;
  highlights: string[];
}

export interface TimelineRenderOptions {
  order?: "asc" | "desc";
  limit?: number;
  tagFilter?: string[];
  includeStages?: string[];
  excludeStages?: string[];
  includeEpochs?: string[];
  excludeEpochs?: string[];
  includeSettings?: string[];
  excludeSettings?: string[];
  epochs?: Epoch[];
  stages?: Stage[];
  settings?: Setting[];
}

export interface NarrativeMeta {
  mask?: Mask;
  personality?: Personality;
  epoch?: Epoch;
  stage?: Stage;
  setting?: Setting;
  relations?: {
    maskPersonalityId?: string;
    stageSettingId?: string;
    epochMaskModifiers?: Record<string, number>;
    maskStageAffinities?: Record<string, number>;
  };
  timeline?: {
    total: number;
    byStage: Record<string, number>;
    byEpoch: Record<string, number>;
    stageArc: string[];
    epochArc: string[];
  };
}

export interface NarrativeOutput {
  blocks: NarrativeBlock[];
  meta: NarrativeMeta;
}
