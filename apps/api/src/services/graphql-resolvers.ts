/**
 * GraphQL Resolvers for the API gateway.
 * Implements query and mutation resolvers for unified data access.
 */

import type { Mask, Profile, NarrativeBlock, Epoch, Stage } from "@in-midst-my-life/schema";

export interface GraphQLContext {
  profileRepo?: any;
  maskRepo?: any;
  narrativeService?: any;
  epochRepo?: any;
  stageRepo?: any;
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
 * Root Query resolvers
 */
export const queryResolvers = {
  /**
   * Retrieve a profile by ID
   */
  profile: async (_: any, args: { id: string }, context: GraphQLContext): Promise<Profile | null> => {
    if (!context.profileRepo) return null;
    return context.profileRepo.get(args.id);
  },

  /**
   * List profiles with pagination
   */
  profiles: async (
    _: any,
    args: { offset?: number; limit?: number },
    context: GraphQLContext
  ): Promise<Profile[]> => {
    if (!context.profileRepo) return [];
    const offset = args.offset || 0;
    const limit = Math.min(args.limit || 20, 100);
    const result = await context.profileRepo.list(offset, limit);
    return result.data;
  },

  /**
   * Retrieve a mask by ID
   */
  mask: async (_: any, args: { id: string }, context: GraphQLContext): Promise<Mask | null> => {
    if (!context.maskRepo) return null;
    return context.maskRepo.get(args.id);
  },

  /**
   * List all masks with optional filtering
   */
  masks: async (
    _: any,
    args: { ontology?: string; offset?: number; limit?: number },
    context: GraphQLContext
  ): Promise<Mask[]> => {
    if (!context.maskRepo) return [];
    const offset = args.offset || 0;
    const limit = Math.min(args.limit || 100, 100);
    const result = await context.maskRepo.list(offset, limit, {
      ontology: args.ontology
    });
    return result.data;
  },

  /**
   * Select masks based on context and tags
   */
  selectMasks: async (
    _: any,
    args: { contexts: string[]; tags: string[] },
    context: GraphQLContext
  ): Promise<Mask[]> => {
    if (!context.maskRepo) return [];
    // Simplified: return masks whose activation contexts match
    const allMasks = await context.maskRepo.list(0, 100);
    const contextSet = new Set(args.contexts.map((c) => c.toLowerCase()));

    return allMasks.data
      .filter((mask: Mask) =>
        mask.activation_rules.contexts.some((ctx) =>
          contextSet.has(ctx.toLowerCase())
        )
      )
      .slice(0, 10);
  },

  /**
   * Get timeline for a profile
   */
  timeline: async (
    _: any,
    args: { profileId: string; limit?: number },
    context: GraphQLContext
  ): Promise<TimelineEntry[]> => {
    if (!context.profileRepo) return [];
    const profile = await context.profileRepo.get(args.profileId);
    if (!profile) return [];
    // In a real implementation, fetch timeline from database
    return [];
  },

  /**
   * Get timeline filtered by mask
   */
  timelineForMask: async (
    _: any,
    args: { profileId: string; maskId: string; limit?: number },
    context: GraphQLContext
  ): Promise<TimelineEntry[]> => {
    if (!context.profileRepo || !context.maskRepo) return [];
    const [profile, mask] = await Promise.all([
      context.profileRepo.get(args.profileId),
      context.maskRepo.get(args.maskId)
    ]);
    if (!profile || !mask) return [];
    // Filter timeline based on mask include/exclude tags
    return [];
  },

  /**
   * Generate narrative blocks for a profile
   */
  generateNarrative: async (
    _: any,
    args: {
      profileId: string;
      maskId?: string;
      contexts?: string[];
      tags?: string[];
    },
    context: GraphQLContext
  ): Promise<any> => {
    if (!context.profileRepo || !context.narrativeService) {
      return {
        id: "snapshot-error",
        profileId: args.profileId,
        status: "draft",
        blocks: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
    }

    const profile = await context.profileRepo.get(args.profileId);
    if (!profile) {
      return {
        id: "snapshot-notfound",
        profileId: args.profileId,
        status: "draft",
        blocks: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
    }

    // Generate narrative snapshot
    const snapshot = {
      id: `snapshot-${Date.now()}`,
      profileId: args.profileId,
      maskId: args.maskId,
      status: "draft" as const,
      blocks: [
        {
          title: "Generated Narrative",
          body: `Narrative for ${profile.displayName}`,
          tags: args.tags || []
        }
      ],
      meta: {
        contexts: args.contexts,
        tags: args.tags
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    return snapshot;
  },

  /**
   * Retrieve narrative snapshot by ID
   */
  narrativeSnapshot: async (
    _: any,
    args: { id: string },
    _context: GraphQLContext
  ): Promise<any | null> => {
    // In a real implementation, fetch from database
    return null;
  },

  /**
   * List narrative snapshots for a profile
   */
  narrativeSnapshots: async (
    _: any,
    args: { profileId: string; limit?: number },
    _context: GraphQLContext
  ): Promise<any[]> => {
    // In a real implementation, fetch from database
    return [];
  },

  /**
   * Retrieve an epoch by ID
   */
  epoch: async (
    _: any,
    args: { id: string },
    context: GraphQLContext
  ): Promise<Epoch | null> => {
    if (!context.epochRepo) return null;
    return context.epochRepo.get(args.id);
  },

  /**
   * List all epochs
   */
  epochs: async (
    _: any,
    args: { sortBy?: string },
    context: GraphQLContext
  ): Promise<Epoch[]> => {
    if (!context.epochRepo) return [];
    const epochs = await context.epochRepo.list();
    const sortField = args.sortBy || "order";
    return epochs.sort((a: any, b: any) => {
      const aVal = a[sortField];
      const bVal = b[sortField];
      if (typeof aVal === "string") {
        return aVal.localeCompare(bVal);
      }
      return (aVal || 0) - (bVal || 0);
    });
  },

  /**
   * Retrieve a stage by ID
   */
  stage: async (
    _: any,
    args: { id: string },
    context: GraphQLContext
  ): Promise<Stage | null> => {
    if (!context.stageRepo) return null;
    return context.stageRepo.get(args.id);
  },

  /**
   * List stages in an epoch
   */
  stagesInEpoch: async (
    _: any,
    args: { epochId: string },
    context: GraphQLContext
  ): Promise<Stage[]> => {
    if (!context.stageRepo) return [];
    const result = await context.stageRepo.list(args.epochId);
    return result.data;
  }
};

/**
 * Root Mutation resolvers
 */
export const mutationResolvers = {
  /**
   * Create a new profile
   */
  createProfile: async (
    _: any,
    args: { displayName: string; title?: string; summaryMarkdown?: string },
    context: GraphQLContext
  ): Promise<Profile> => {
    if (!context.profileRepo) {
      throw new Error("Profile repository not available");
    }

    const profile: Profile = {
      id: `profile-${Date.now()}`,
      displayName: args.displayName,
      title: args.title,
      summaryMarkdown: args.summaryMarkdown,
      visibility: { default: "everyone" },
      sectionOrder: [],
      agentSettings: { enabled: false }
    };

    return context.profileRepo.create(profile);
  },

  /**
   * Update an existing profile
   */
  updateProfile: async (
    _: any,
    args: { id: string; displayName?: string; title?: string; summaryMarkdown?: string },
    context: GraphQLContext
  ): Promise<Profile | null> => {
    if (!context.profileRepo) {
      throw new Error("Profile repository not available");
    }

    const updates: Partial<Profile> = {};
    if (args.displayName) updates.displayName = args.displayName;
    if (args.title) updates.title = args.title;
    if (args.summaryMarkdown) updates.summaryMarkdown = args.summaryMarkdown;

    return context.profileRepo.update(args.id, updates);
  },

  /**
   * Create a new mask
   */
  createMask: async (
    _: any,
    args: { name: string; ontology: string; functionalScope: string },
    context: GraphQLContext
  ): Promise<Mask> => {
    if (!context.maskRepo) {
      throw new Error("Mask repository not available");
    }

    const mask: Mask = {
      id: `mask-${Date.now()}`,
      name: args.name,
      ontology: args.ontology as "cognitive" | "expressive" | "operational",
      functional_scope: args.functionalScope,
      stylistic_parameters: {
        tone: "neutral",
        rhetorical_mode: "deductive",
        compression_ratio: 0.6
      },
      activation_rules: { contexts: [], triggers: [] },
      filters: {
        include_tags: [],
        exclude_tags: [],
        priority_weights: {}
      }
    };

    return context.maskRepo.create(mask);
  },

  /**
   * Update an existing mask
   */
  updateMask: async (
    _: any,
    args: { id: string; name?: string; functionalScope?: string },
    context: GraphQLContext
  ): Promise<Mask | null> => {
    if (!context.maskRepo) {
      throw new Error("Mask repository not available");
    }

    const updates: Partial<Mask> = {};
    if (args.name) updates.name = args.name;
    if (args.functionalScope) updates.functional_scope = args.functionalScope;

    return context.maskRepo.update(args.id, updates);
  },

  /**
   * Add a timeline entry
   */
  addTimelineEntry: async (
    _: any,
    args: {
      profileId: string;
      title: string;
      start: string;
      summary?: string;
      tags?: string[];
    },
    _context: GraphQLContext
  ): Promise<TimelineEntry> => {
    return {
      id: `entry-${Date.now()}`,
      title: args.title,
      summary: args.summary,
      start: args.start,
      tags: args.tags || []
    };
  },

  /**
   * Approve a narrative snapshot
   */
  approveNarrative: async (
    _: any,
    args: { id: string; approvedBy: string },
    _context: GraphQLContext
  ): Promise<any> => {
    return {
      id: args.id,
      status: "approved",
      approvedAt: new Date().toISOString(),
      approvedBy: args.approvedBy,
      updatedAt: new Date().toISOString()
    };
  },

  /**
   * Reject a narrative snapshot
   */
  rejectNarrative: async (
    _: any,
    args: { id: string; revisionNote?: string },
    _context: GraphQLContext
  ): Promise<any> => {
    return {
      id: args.id,
      status: "rejected",
      revisionNote: args.revisionNote,
      updatedAt: new Date().toISOString()
    };
  }
};

/**
 * Type resolvers for custom scalar and object types
 */
export const typeResolvers = {
  DateTime: {
    serialize: (value: Date | string) => {
      if (value instanceof Date) {
        return value.toISOString();
      }
      return value;
    },
    parseValue: (value: string) => {
      return new Date(value);
    },
    parseLiteral: (ast: any) => {
      if (ast.kind === "StringValue") {
        return new Date(ast.value);
      }
      return null;
    }
  },

  JSON: {
    serialize: (value: any) => value,
    parseValue: (value: any) => value,
    parseLiteral: (ast: any) => {
      if (ast.kind === "ObjectValue") {
        return Object.fromEntries(
          ast.fields.map((field: any) => [
            field.name.value,
            field.value.value
          ])
        );
      }
      return null;
    }
  }
};
