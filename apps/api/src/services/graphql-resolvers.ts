/**
 * GraphQL Resolvers for the API gateway.
 * Implements query and mutation resolvers for unified data access.
 */

import type { Mask, Profile, Epoch, Stage } from '@in-midst-my-life/schema';
import type { ProfileRepo } from '../repositories/profiles';
import type { MaskRepo, EpochRepo, StageRepo } from '../repositories/masks';

export interface GraphQLContext {
  profileRepo?: ProfileRepo;
  maskRepo?: MaskRepo;
  epochRepo?: EpochRepo;
  stageRepo?: StageRepo;
}

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

interface NarrativeSnapshot {
  id: string;
  profileId: string;
  maskId?: string;
  status: 'draft' | 'approved' | 'rejected';
  blocks: { title: string; body: string; tags: string[] }[];
  meta?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
  approvedAt?: string;
  approvedBy?: string;
  revisionNote?: string;
}

/**
 * Root Query resolvers
 *
 * Note: graphql's `buildSchema` + root resolvers pattern passes (args, context)
 * as the first two parameters — there is no separate `parent` argument.
 */
export const queryResolvers = {
  profile: async (args: { id: string }, context: GraphQLContext): Promise<Profile | null> => {
    if (!context.profileRepo) return null;
    return (await context.profileRepo.find(args.id)) ?? null;
  },

  profiles: async (
    args: { offset?: number; limit?: number },
    context: GraphQLContext,
  ): Promise<Profile[]> => {
    if (!context.profileRepo) return [];
    const offset = args.offset || 0;
    const limit = Math.min(args.limit || 20, 100);
    const result = await context.profileRepo.list(offset, limit);
    return result.data;
  },

  mask: async (args: { id: string }, context: GraphQLContext): Promise<Mask | null> => {
    if (!context.maskRepo) return null;
    return (await context.maskRepo.get(args.id)) ?? null;
  },

  masks: async (
    args: { ontology?: string; offset?: number; limit?: number },
    context: GraphQLContext,
  ): Promise<Mask[]> => {
    if (!context.maskRepo) return [];
    const offset = args.offset || 0;
    const limit = Math.min(args.limit || 100, 100);
    const result = await context.maskRepo.list(offset, limit, {
      ontology: args.ontology,
    });
    return result.data;
  },

  selectMasks: async (
    args: { contexts: string[]; tags: string[] },
    context: GraphQLContext,
  ): Promise<Mask[]> => {
    if (!context.maskRepo) return [];
    const allMasks = await context.maskRepo.list(0, 100);
    const contextSet = new Set(args.contexts.map((c) => c.toLowerCase()));

    return allMasks.data
      .filter((mask: Mask) =>
        mask.activation_rules.contexts.some((ctx) => contextSet.has(ctx.toLowerCase())),
      )
      .slice(0, 10);
  },

  timeline: async (
    args: { profileId: string; limit?: number },
    context: GraphQLContext,
  ): Promise<TimelineEntry[]> => {
    if (!context.profileRepo) return [];
    const profile = await context.profileRepo.find(args.profileId);
    if (!profile) return [];
    return [];
  },

  timelineForMask: async (
    args: { profileId: string; maskId: string; limit?: number },
    context: GraphQLContext,
  ): Promise<TimelineEntry[]> => {
    if (!context.profileRepo || !context.maskRepo) return [];
    const [profile, mask] = await Promise.all([
      context.profileRepo.find(args.profileId),
      context.maskRepo.get(args.maskId),
    ]);
    if (!profile || !mask) return [];
    return [];
  },

  generateNarrative: async (
    args: {
      profileId: string;
      maskId?: string;
      contexts?: string[];
      tags?: string[];
    },
    context: GraphQLContext,
  ): Promise<NarrativeSnapshot> => {
    if (!context.profileRepo) {
      return {
        id: 'snapshot-error',
        profileId: args.profileId,
        status: 'draft',
        blocks: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
    }

    const profile = await context.profileRepo.find(args.profileId);
    if (!profile) {
      return {
        id: 'snapshot-notfound',
        profileId: args.profileId,
        status: 'draft',
        blocks: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
    }

    return {
      id: `snapshot-${Date.now()}`,
      profileId: args.profileId,
      maskId: args.maskId,
      status: 'draft',
      blocks: [
        {
          title: 'Generated Narrative',
          body: `Narrative for ${profile.displayName}`,
          tags: args.tags || [],
        },
      ],
      meta: {
        contexts: args.contexts,
        tags: args.tags,
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  },

  narrativeSnapshot: (): Promise<NarrativeSnapshot | null> => {
    return Promise.resolve(null);
  },

  narrativeSnapshots: (): Promise<NarrativeSnapshot[]> => {
    return Promise.resolve([]);
  },

  epoch: async (args: { id: string }, context: GraphQLContext): Promise<Epoch | null> => {
    if (!context.epochRepo) return null;
    return (await context.epochRepo.get(args.id)) ?? null;
  },

  epochs: async (args: { sortBy?: string }, context: GraphQLContext): Promise<Epoch[]> => {
    if (!context.epochRepo) return [];
    const epochs = await context.epochRepo.list();
    const sortField = args.sortBy || 'order';
    return [...epochs].sort((a, b) => {
      const aVal = (a as Record<string, unknown>)[sortField];
      const bVal = (b as Record<string, unknown>)[sortField];
      if (typeof aVal === 'string' && typeof bVal === 'string') {
        return aVal.localeCompare(bVal);
      }
      return (Number(aVal) || 0) - (Number(bVal) || 0);
    });
  },

  stage: async (args: { id: string }, context: GraphQLContext): Promise<Stage | null> => {
    if (!context.stageRepo) return null;
    return (await context.stageRepo.get(args.id)) ?? null;
  },

  stagesInEpoch: async (args: { epochId: string }, context: GraphQLContext): Promise<Stage[]> => {
    if (!context.stageRepo) return [];
    const result = await context.stageRepo.list(args.epochId);
    return result.data;
  },
};

/**
 * Root Mutation resolvers
 */
export const mutationResolvers = {
  createProfile: async (
    args: { displayName: string; title?: string; summaryMarkdown?: string },
    context: GraphQLContext,
  ): Promise<Profile> => {
    if (!context.profileRepo) {
      throw new Error('Profile repository not available');
    }

    const profile = {
      id: `profile-${Date.now()}`,
      displayName: args.displayName,
      title: args.title,
      summaryMarkdown: args.summaryMarkdown,
      visibility: { default: 'everyone' as const },
      sectionOrder: [] as string[],
      agentSettings: { enabled: false },
    };

    return context.profileRepo.add(profile as unknown as Profile);
  },

  updateProfile: async (
    args: { id: string; displayName?: string; title?: string; summaryMarkdown?: string },
    context: GraphQLContext,
  ): Promise<Profile | null> => {
    if (!context.profileRepo) {
      throw new Error('Profile repository not available');
    }

    const updates: Partial<Profile> = {};
    if (args.displayName) updates.displayName = args.displayName;
    if (args.title) updates.title = args.title;
    if (args.summaryMarkdown) updates.summaryMarkdown = args.summaryMarkdown;

    return (await context.profileRepo.update(args.id, updates)) ?? null;
  },

  createMask: async (
    args: { name: string; ontology: string; functionalScope: string },
    context: GraphQLContext,
  ): Promise<Mask> => {
    if (!context.maskRepo) {
      throw new Error('Mask repository not available');
    }

    const mask: Mask = {
      id: `mask-${Date.now()}`,
      name: args.name,
      ontology: args.ontology as 'cognitive' | 'expressive' | 'operational',
      functional_scope: args.functionalScope,
      stylistic_parameters: {
        tone: 'neutral',
        rhetorical_mode: 'deductive',
        compression_ratio: 0.6,
      },
      activation_rules: { contexts: [], triggers: [] },
      filters: {
        include_tags: [],
        exclude_tags: [],
        priority_weights: {},
      },
    };

    return context.maskRepo.create(mask);
  },

  updateMask: async (
    args: { id: string; name?: string; functionalScope?: string },
    context: GraphQLContext,
  ): Promise<Mask | null> => {
    if (!context.maskRepo) {
      throw new Error('Mask repository not available');
    }

    const updates: Partial<Mask> = {};
    if (args.name) updates.name = args.name;
    if (args.functionalScope) updates.functional_scope = args.functionalScope;

    return (await context.maskRepo.update(args.id, updates)) ?? null;
  },

  addTimelineEntry: (args: {
    profileId: string;
    title: string;
    start: string;
    summary?: string;
    tags?: string[];
  }): Promise<TimelineEntry> => {
    return Promise.resolve({
      id: `entry-${Date.now()}`,
      title: args.title,
      summary: args.summary,
      start: args.start,
      tags: args.tags || [],
    });
  },

  approveNarrative: (args: { id: string; approvedBy: string }): Promise<NarrativeSnapshot> => {
    return Promise.resolve({
      id: args.id,
      profileId: '',
      status: 'approved' as const,
      blocks: [],
      approvedAt: new Date().toISOString(),
      approvedBy: args.approvedBy,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
  },

  rejectNarrative: (args: { id: string; revisionNote?: string }): Promise<NarrativeSnapshot> => {
    return Promise.resolve({
      id: args.id,
      profileId: '',
      status: 'rejected' as const,
      blocks: [],
      revisionNote: args.revisionNote,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
  },
};
