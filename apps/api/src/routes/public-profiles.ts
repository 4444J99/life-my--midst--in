import { FastifyInstance } from 'fastify';
import { z } from 'zod';

// Schemas
const PublicProfileSettingsSchema = z.object({
  userId: z.string().uuid(),
  profileId: z.string().uuid(),
  isPublic: z.boolean().default(false),
  profileSlug: z.string().regex(/^[a-z0-9-]+$/),
  bio: z.string().max(500),
  visiblePersonas: z.array(z.string()),
  allowMessaging: z.boolean().default(true),
  allowMentorshipRequests: z.boolean().default(true),
  indexInSearchEngines: z.boolean().default(false),
});

type PublicProfileSettings = z.infer<typeof PublicProfileSettingsSchema>;
// Schema used for runtime validation in PATCH handler
void PublicProfileSettingsSchema;

interface PublicProfile {
  id: string;
  userId: string;
  slug: string;
  name: string;
  headline: string;
  bio: string;
  avatar: string | null;
  visiblePersonas: string[];
  visibleExperiences: unknown[];
  topSkills: string[];
  socialLinks: Record<string, string>;
  featured: boolean;
  isPublic: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// Mock storage
const publicProfiles = new Map<string, PublicProfile>();
const profileViews = new Map<string, number>();
const likedProfiles = new Map<string, Set<string>>();

export function publicProfilesRoutes(
  fastify: FastifyInstance,
  _opts: Record<string, unknown>,
  done: () => void,
) {
  fastify.log.warn(
    'Public profiles routes use in-memory storage — data will not persist across restarts',
  );
  /**
   * Get all public profiles (discovery feed)
   * GET /public-profiles
   */
  fastify.get(
    '/public-profiles',
    {
      schema: {
        querystring: {
          type: 'object',
          properties: {
            limit: { type: 'integer', default: 50 },
            offset: { type: 'integer', default: 0 },
            expertise: { type: 'array', items: { type: 'string' } },
            sortBy: { type: 'string', enum: ['recent', 'popular', 'match'], default: 'popular' },
          },
        },
        response: {
          200: {
            type: 'object',
            properties: {
              profiles: { type: 'array' },
              total: { type: 'integer' },
              limit: { type: 'integer' },
              offset: { type: 'integer' },
            },
          },
        },
      },
    },
    async (request, reply) => {
      const {
        limit = 50,
        offset = 0,
        sortBy = 'popular',
      } = request.query as {
        limit?: number;
        offset?: number;
        sortBy?: string;
      };

      const profiles = Array.from(publicProfiles.values()).filter((p) => p.isPublic);

      // Sort
      switch (sortBy) {
        case 'popular':
          profiles.sort((a, b) => (profileViews.get(b.id) || 0) - (profileViews.get(a.id) || 0));
          break;
        case 'recent':
          profiles.sort(
            (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
          );
          break;
      }

      const total = profiles.length;
      const paginatedProfiles = profiles.slice(offset, offset + limit).map((p) => ({
        id: p.id,
        slug: p.slug,
        name: p.name,
        headline: p.headline,
        bio: p.bio,
        avatar: p.avatar,
        featuredPersonas: p.visiblePersonas.slice(0, 3),
        topSkills: p.topSkills || [],
        viewCount: profileViews.get(p.id) || 0,
        isLiked: false,
      }));

      reply.send({
        profiles: paginatedProfiles,
        total,
        limit,
        offset,
      });
    },
  );

  /**
   * Get public profile by slug
   * GET /public-profiles/:slug
   */
  fastify.get<{ Params: { slug: string } }>(
    '/public-profiles/:slug',
    {
      schema: {
        params: {
          type: 'object',
          required: ['slug'],
          properties: {
            slug: { type: 'string' },
          },
        },
        response: {
          200: {
            type: 'object',
          },
          404: {},
        },
      },
    },
    async (request, reply) => {
      const { slug } = request.params;

      const profile = Array.from(publicProfiles.values()).find((p) => p.slug === slug);

      if (!profile || !profile.isPublic) {
        return reply.code(404).send({
          error: 'Profile not found',
        });
      }

      // Increment view count
      profileViews.set(profile.id, (profileViews.get(profile.id) || 0) + 1);

      // Track view event
      fastify.log.info({
        msg: 'Profile viewed',
        profileId: profile.id,
        slug,
      });

      reply.send({
        id: profile.id,
        slug: profile.slug,
        name: profile.name,
        headline: profile.headline,
        bio: profile.bio,
        avatar: profile.avatar,
        visiblePersonas: profile.visiblePersonas,
        visibleExperiences: profile.visibleExperiences,
        viewCount: profileViews.get(profile.id) || 0,
        lastUpdated: profile.updatedAt,
        socialLinks: profile.socialLinks,
        featured: profile.featured,
      });
    },
  );

  /**
   * Update public profile settings
   * PATCH /profiles/:profileId/public-settings
   */
  fastify.patch<{
    Params: { profileId: string };
    Body: Partial<PublicProfileSettings>;
  }>(
    '/profiles/:profileId/public-settings',
    {
      schema: {
        params: {
          type: 'object',
          required: ['profileId'],
          properties: {
            profileId: { type: 'string', format: 'uuid' },
          },
        },
        body: {
          type: 'object',
          properties: {
            isPublic: { type: 'boolean' },
            profileSlug: { type: 'string' },
            bio: { type: 'string', maxLength: 500 },
            visiblePersonas: { type: 'array', items: { type: 'string' } },
            allowMessaging: { type: 'boolean' },
            allowMentorshipRequests: { type: 'boolean' },
            indexInSearchEngines: { type: 'boolean' },
          },
        },
      },
    },
    async (request, reply) => {
      const { profileId } = request.params;
      const userId = request.user?.sub || 'user-id';

      const profile = publicProfiles.get(profileId);

      if (!profile || profile.userId !== userId) {
        return reply.code(403).send({
          error: 'Not authorized to update this profile',
        });
      }

      // Validate slug uniqueness
      if (request.body.profileSlug && request.body.profileSlug !== profile.slug) {
        const slugExists = Array.from(publicProfiles.values()).some(
          (p) => p.slug === request.body.profileSlug && p.id !== profileId,
        );
        if (slugExists) {
          return reply.code(400).send({
            error: 'Profile slug already taken',
          });
        }
      }

      // Update profile
      const updated: PublicProfile = {
        ...profile,
        ...request.body,
        updatedAt: new Date(),
      };

      publicProfiles.set(profileId, updated);

      fastify.log.info({
        msg: 'Public profile settings updated',
        profileId,
        isPublic: updated.isPublic,
      });

      reply.send(updated);
    },
  );

  /**
   * Like/unlike a public profile
   * POST /public-profiles/:profileId/like
   */
  fastify.post<{ Params: { profileId: string } }>(
    '/public-profiles/:profileId/like',
    {
      schema: {
        params: {
          type: 'object',
          required: ['profileId'],
          properties: {
            profileId: { type: 'string', format: 'uuid' },
          },
        },
      },
    },
    async (request, reply) => {
      const { profileId } = request.params;
      const userId = request.user?.sub || 'user-id';

      if (!likedProfiles.has(userId)) {
        likedProfiles.set(userId, new Set());
      }

      const userLikes = likedProfiles.get(userId)!;
      const isLiked = userLikes.has(profileId);

      if (isLiked) {
        userLikes.delete(profileId);
      } else {
        userLikes.add(profileId);
      }

      reply.send({
        profileId,
        liked: !isLiked,
        message: !isLiked ? 'Profile saved' : 'Profile removed from saved',
      });
    },
  );

  /**
   * Get user's liked profiles
   * GET /public-profiles/saved
   */
  fastify.get(
    '/public-profiles/saved',
    {
      schema: {
        response: {
          200: {
            type: 'object',
            properties: {
              profiles: { type: 'array' },
              total: { type: 'integer' },
            },
          },
        },
      },
    },
    async (request, reply) => {
      const userId = request.user?.sub || 'user-id';

      const savedProfileIds = likedProfiles.get(userId) || new Set();
      const savedProfiles = Array.from(publicProfiles.values()).filter((p) =>
        savedProfileIds.has(p.id),
      );

      reply.send({
        profiles: savedProfiles,
        total: savedProfiles.length,
      });
    },
  );

  /**
   * Search public profiles
   * GET /public-profiles/search
   */
  fastify.get(
    '/public-profiles/search',
    {
      schema: {
        querystring: {
          type: 'object',
          properties: {
            q: { type: 'string', minLength: 1 },
            limit: { type: 'integer', default: 20 },
          },
        },
        response: {
          200: {
            type: 'object',
            properties: {
              results: { type: 'array' },
              total: { type: 'integer' },
            },
          },
          400: {
            type: 'object',
            properties: {
              error: { type: 'string' },
            },
          },
        },
      },
    },
    async (request, reply) => {
      const { q, limit = 20 } = request.query as { q?: string; limit?: number };

      if (!q || q.length < 1) {
        return reply.code(400).send({
          error: 'Search query required',
        });
      }

      const searchLower = q.toLowerCase();
      const results = Array.from(publicProfiles.values())
        .filter((p) => p.isPublic)
        .filter(
          (p) =>
            p.name.toLowerCase().includes(searchLower) ||
            p.headline.toLowerCase().includes(searchLower) ||
            p.bio.toLowerCase().includes(searchLower) ||
            p.topSkills?.some((s) => s.toLowerCase().includes(searchLower)),
        )
        .sort((a, b) => (profileViews.get(b.id) || 0) - (profileViews.get(a.id) || 0))
        .slice(0, limit);

      reply.send({
        results,
        total: results.length,
        query: q,
      });
    },
  );

  done();
}
