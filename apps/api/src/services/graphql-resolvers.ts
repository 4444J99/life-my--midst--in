/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-argument */
/**
 * GraphQL Resolvers for the API gateway.
 * Implements query and mutation resolvers for unified data access.
 *
 * Timeline resolvers delegate to CvRepos.timelineEvents.
 * Narrative resolvers delegate to NarrativeRepo for persistence
 * and content-model for generation.
 */

import { randomUUID } from 'node:crypto';
import type {
  Mask,
  Profile,
  Epoch,
  Stage,
  NarrativeSnapshot,
  TimelineEvent,
} from '@in-midst-my-life/schema';
import type { ProfileRepo } from '../repositories/profiles';
import type { MaskRepo, EpochRepo, StageRepo } from '../repositories/masks';
import type { CvRepos } from '../repositories/cv';
import type { NarrativeRepo } from '../repositories/narratives';
import { renderTimeline, renderTimelineForMask } from '@in-midst-my-life/content-model';
import { hashPayload } from '@in-midst-my-life/core';
import type { PubSubEngine } from './pubsub';
import { profileUpdatedTopic, narrativeGeneratedTopic } from './pubsub';

export interface GraphQLContext {
  profileRepo?: ProfileRepo;
  maskRepo?: MaskRepo;
  epochRepo?: EpochRepo;
  stageRepo?: StageRepo;
  cvRepos?: CvRepos;
  narrativeRepo?: NarrativeRepo;
  pubsub?: PubSubEngine;
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

/**
 * Map a schema TimelineEvent to the GraphQL TimelineEntry shape.
 */
function toTimelineEntry(event: TimelineEvent): TimelineEntry {
  return {
    id: event.id,
    title: event.title,
    summary: event.descriptionMarkdown,
    start: event.startDate,
    end: event.endDate,
    tags: event.tags,
  };
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

    // Fetch timeline events from CV repos
    if (!context.cvRepos) return [];
    const limit = Math.min(args.limit || 50, 200);
    const result = await context.cvRepos.timelineEvents.list(args.profileId, 0, limit);
    const entries = result.data.map(toTimelineEntry);

    // Use content-model to sort/render
    return renderTimeline(entries, 'desc');
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

    // Fetch timeline events
    if (!context.cvRepos) return [];
    const limit = Math.min(args.limit || 50, 200);
    const result = await context.cvRepos.timelineEvents.list(args.profileId, 0, limit);
    const entries = result.data.map(toTimelineEntry);

    // Filter and weight through mask using content-model
    return renderTimelineForMask(entries, mask, { limit });
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
    const now = new Date().toISOString();

    if (!context.profileRepo) {
      return {
        id: randomUUID(),
        profileId: args.profileId,
        status: 'draft',
        blocks: [],
        createdAt: now,
        updatedAt: now,
      };
    }

    const profile = await context.profileRepo.find(args.profileId);
    if (!profile) {
      return {
        id: randomUUID(),
        profileId: args.profileId,
        status: 'draft',
        blocks: [],
        createdAt: now,
        updatedAt: now,
      };
    }

    // Build narrative blocks from profile data
    const blocks = [
      {
        title: 'Professional Summary',
        body: profile.summaryMarkdown || `Professional narrative for ${profile.displayName}`,
      },
    ];

    // If we have a mask, add mask context
    if (args.maskId && context.maskRepo) {
      const mask = await context.maskRepo.get(args.maskId);
      if (mask) {
        blocks.push({
          title: `${mask.name} Perspective`,
          body: `Narrative filtered through the ${mask.name} persona (${mask.ontology}): ${mask.functional_scope}`,
        });
      }
    }

    // Compute SHA256 checksum of the narrative content for integrity verification
    const snapshotPayload = {
      profileId: args.profileId,
      maskId: args.maskId ?? '',
      blocks: blocks.map((b) => ({ title: b.title, body: b.body })),
    };
    const checksum = await hashPayload(snapshotPayload as Record<string, unknown>);

    const snapshot: NarrativeSnapshot = {
      id: randomUUID(),
      profileId: args.profileId,
      maskId: args.maskId,
      status: 'draft',
      blocks,
      meta: {
        contexts: args.contexts,
        tags: args.tags,
        checksum,
      },
      createdAt: now,
      updatedAt: now,
    };

    // Persist if narrative repo is available
    if (context.narrativeRepo) {
      await context.narrativeRepo.create(snapshot);
    }

    void context.pubsub?.publish(narrativeGeneratedTopic(snapshot.profileId), snapshot);
    return snapshot;
  },

  narrativeSnapshot: async (
    args: { id: string },
    context: GraphQLContext,
  ): Promise<NarrativeSnapshot | null> => {
    if (!context.narrativeRepo) return null;
    return (await context.narrativeRepo.get(args.id)) ?? null;
  },

  narrativeSnapshots: async (
    args: { profileId: string; status?: string; maskId?: string },
    context: GraphQLContext,
  ): Promise<NarrativeSnapshot[]> => {
    if (!context.narrativeRepo) return [];
    return context.narrativeRepo.list(args.profileId, args.status, args.maskId);
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

    const created = await context.profileRepo.add(profile as unknown as Profile);
    void context.pubsub?.publish(profileUpdatedTopic(created.id), created);
    return created;
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

    const updated = (await context.profileRepo.update(args.id, updates)) ?? null;
    if (updated) {
      void context.pubsub?.publish(profileUpdatedTopic(updated.id), updated);
    }
    return updated;
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

  addTimelineEntry: async (
    args: {
      profileId: string;
      title: string;
      start: string;
      summary?: string;
      tags?: string[];
    },
    context: GraphQLContext,
  ): Promise<TimelineEntry> => {
    if (!context.cvRepos) {
      // Fallback: return unsaved entry
      return {
        id: randomUUID(),
        title: args.title,
        summary: args.summary,
        start: args.start,
        tags: args.tags || [],
      };
    }

    const event: TimelineEvent = {
      id: randomUUID(),
      profileId: args.profileId,
      entityKind: 'experience',
      title: args.title,
      startDate: args.start,
      descriptionMarkdown: args.summary,
      tags: args.tags || [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const created = await context.cvRepos.timelineEvents.create(event);
    return toTimelineEntry(created);
  },

  approveNarrative: async (
    args: { id: string; approvedBy: string },
    context: GraphQLContext,
  ): Promise<NarrativeSnapshot> => {
    if (!context.narrativeRepo) {
      // Fallback for when repo is not wired
      return {
        id: args.id,
        profileId: '',
        status: 'approved' as const,
        blocks: [],
        approvedAt: new Date().toISOString(),
        approvedBy: args.approvedBy,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
    }

    const existing = await context.narrativeRepo.get(args.id);
    if (!existing) {
      throw new Error(`Narrative snapshot ${args.id} not found`);
    }

    const now = new Date().toISOString();
    const updated = await context.narrativeRepo.update(args.id, {
      status: 'approved',
      approvedAt: now,
      approvedBy: args.approvedBy,
      updatedAt: now,
    });

    const result = updated ?? existing;
    void context.pubsub?.publish(narrativeGeneratedTopic(result.profileId), result);
    return result;
  },

  rejectNarrative: async (
    args: { id: string; revisionNote?: string },
    context: GraphQLContext,
  ): Promise<NarrativeSnapshot> => {
    if (!context.narrativeRepo) {
      return {
        id: args.id,
        profileId: '',
        status: 'rejected' as const,
        blocks: [],
        revisionNote: args.revisionNote,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
    }

    const existing = await context.narrativeRepo.get(args.id);
    if (!existing) {
      throw new Error(`Narrative snapshot ${args.id} not found`);
    }

    const now = new Date().toISOString();
    const updated = await context.narrativeRepo.update(args.id, {
      status: 'rejected',
      revisionNote: args.revisionNote,
      updatedAt: now,
    });

    const result = updated ?? existing;
    void context.pubsub?.publish(narrativeGeneratedTopic(result.profileId), result);
    return result;
  },
};

/**
 * Root Subscription resolvers
 *
 * With buildSchema + root resolvers, subscription fields work like
 * query/mutation: the root value field is called as (args, context)
 * and must return an AsyncIterable. Each yielded value is wrapped
 * with the field name key (e.g., { profileUpdated: <payload> }).
 */
export const subscriptionResolvers = {
  profileUpdated: (args: { profileId: string }, context: GraphQLContext) => {
    if (!context.pubsub) throw new Error('PubSub not available');
    const topic = profileUpdatedTopic(args.profileId);
    const source = context.pubsub.subscribe(topic);
    return mapAsyncIterator(source, (payload) => ({ profileUpdated: payload }));
  },

  narrativeGenerated: (args: { profileId: string }, context: GraphQLContext) => {
    if (!context.pubsub) throw new Error('PubSub not available');
    const topic = narrativeGeneratedTopic(args.profileId);
    const source = context.pubsub.subscribe(topic);
    return mapAsyncIterator(source, (payload) => ({ narrativeGenerated: payload }));
  },
};

/**
 * Map over an AsyncIterable, transforming each value.
 */
function mapAsyncIterator<T, R>(source: AsyncIterable<T>, fn: (value: T) => R): AsyncIterable<R> {
  return {
    [Symbol.asyncIterator]() {
      const iterator = source[Symbol.asyncIterator]();
      return {
        async next(): Promise<IteratorResult<R>> {
          const result = await iterator.next();
          if (result.done) return { value: undefined as R, done: true };
          return { value: fn(result.value), done: false };
        },
        async return(): Promise<IteratorResult<R>> {
          if (iterator.return) await iterator.return();
          return { value: undefined as R, done: true };
        },
        async throw(err?: unknown): Promise<IteratorResult<R>> {
          if (iterator.throw) return iterator.throw(err) as Promise<IteratorResult<R>>;
          throw err;
        },
      };
    },
  };
}
