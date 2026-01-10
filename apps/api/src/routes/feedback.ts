import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { FeedbackEventSchema } from '@in-midst-my-life/core/analytics/events';
import { getAnalyticsService } from '@in-midst-my-life/core/analytics/analytics-service';

// Request schema extends feedback event
const CreateFeedbackSchema = z.object({
  profileId: z.string().uuid(),
  userId: z.string().uuid(),
  category: z.enum(['bug', 'feature-request', 'improvement', 'other']),
  subject: z.string().min(1).max(100),
  description: z.string().min(1).max(1000),
  severity: z.enum(['low', 'medium', 'high']).optional(),
  affectedFeatures: z.array(z.string()).optional(),
  email: z.string().email().optional(),
  followUp: z.boolean().default(false),
  timestamp: z.string().datetime(),
});

type CreateFeedbackRequest = z.infer<typeof CreateFeedbackSchema>;

interface FeedbackRecord {
  id: string;
  profileId: string;
  userId: string;
  category: string;
  subject: string;
  description: string;
  severity: string | null;
  affectedFeatures: string[];
  email: string | null;
  followUp: boolean;
  status: 'new' | 'reviewed' | 'in-progress' | 'resolved';
  createdAt: Date;
  updatedAt: Date;
}

// Mock storage (in production, use database)
const feedbackStorage = new Map<string, FeedbackRecord>();

/**
 * Feedback Routes
 * POST /feedback - Submit feedback
 * GET /feedback/:id - Get feedback by ID
 * GET /feedback - List feedback (admin only)
 */
export async function feedbackRoutes(fastify: FastifyInstance) {
  // Submit feedback
  fastify.post<{ Body: CreateFeedbackRequest }>(
    '/feedback',
    {
      schema: {
        description: 'Submit user feedback',
        tags: ['Feedback'],
        body: {
          type: 'object',
          required: ['profileId', 'userId', 'category', 'subject', 'description', 'timestamp'],
          properties: {
            profileId: { type: 'string', format: 'uuid' },
            userId: { type: 'string', format: 'uuid' },
            category: { type: 'string', enum: ['bug', 'feature-request', 'improvement', 'other'] },
            subject: { type: 'string', minLength: 1, maxLength: 100 },
            description: { type: 'string', minLength: 1, maxLength: 1000 },
            severity: { type: 'string', enum: ['low', 'medium', 'high'] },
            affectedFeatures: { type: 'array', items: { type: 'string' } },
            email: { type: 'string', format: 'email' },
            followUp: { type: 'boolean' },
            timestamp: { type: 'string', format: 'date-time' },
          },
        },
        response: {
          201: {
            description: 'Feedback submitted successfully',
            type: 'object',
            properties: {
              id: { type: 'string' },
              message: { type: 'string' },
            },
          },
          400: {
            description: 'Invalid feedback submission',
            type: 'object',
            properties: {
              error: { type: 'string' },
            },
          },
        },
      },
    },
    async (request, reply) => {
      try {
        // Validate request
        const feedback = CreateFeedbackSchema.parse(request.body);

        // Create feedback record
        const feedbackId = crypto.randomUUID();
        const now = new Date();

        const record: FeedbackRecord = {
          id: feedbackId,
          profileId: feedback.profileId,
          userId: feedback.userId,
          category: feedback.category,
          subject: feedback.subject,
          description: feedback.description,
          severity: feedback.severity ?? null,
          affectedFeatures: feedback.affectedFeatures ?? [],
          email: feedback.email ?? null,
          followUp: feedback.followUp,
          status: 'new',
          createdAt: now,
          updatedAt: now,
        };

        // Store feedback
        feedbackStorage.set(feedbackId, record);

        // Track as analytics event
        const analytics = getAnalyticsService();
        await analytics.trackEvent({
          name: 'feedback_submitted',
          category: 'feedback',
          userId: feedback.userId,
          metadata: {
            feedbackCategory: feedback.category,
            hasEmail: !!feedback.email,
            severity: feedback.severity,
            featureCount: feedback.affectedFeatures?.length ?? 0,
          },
        });

        // Send confirmation
        reply.code(201).send({
          id: feedbackId,
          message: 'Feedback submitted successfully. Thank you for helping us improve!',
        });

        // Queue email notification if email provided (non-blocking)
        if (feedback.email && feedback.followUp) {
          // In production: queue email task
          fastify.log.info({
            msg: 'Feedback received with follow-up requested',
            feedbackId,
            email: feedback.email,
          });
        }
      } catch (error) {
        if (error instanceof z.ZodError) {
          reply.code(400).send({
            error: 'Invalid feedback submission',
            details: error.errors,
          });
        } else {
          fastify.log.error(error);
          reply.code(500).send({
            error: 'Failed to submit feedback',
          });
        }
      }
    }
  );

  // Get feedback by ID
  fastify.get<{ Params: { id: string } }>(
    '/feedback/:id',
    {
      schema: {
        description: 'Get feedback by ID',
        tags: ['Feedback'],
        params: {
          type: 'object',
          required: ['id'],
          properties: {
            id: { type: 'string', format: 'uuid' },
          },
        },
        response: {
          200: {
            description: 'Feedback record',
            type: 'object',
            properties: {
              id: { type: 'string' },
              profileId: { type: 'string' },
              userId: { type: 'string' },
              category: { type: 'string' },
              subject: { type: 'string' },
              description: { type: 'string' },
              severity: { type: ['string', 'null'] },
              affectedFeatures: { type: 'array', items: { type: 'string' } },
              status: { type: 'string' },
              createdAt: { type: 'string', format: 'date-time' },
              updatedAt: { type: 'string', format: 'date-time' },
            },
          },
          404: {
            description: 'Feedback not found',
          },
        },
      },
    },
    async (request, reply) => {
      const { id } = request.params;

      const feedback = feedbackStorage.get(id);
      if (!feedback) {
        return reply.code(404).send({
          error: 'Feedback not found',
        });
      }

      reply.send({
        ...feedback,
        email: null, // Don't expose email to non-owners
      });
    }
  );

  // List feedback (admin only - would require auth in production)
  fastify.get(
    '/feedback',
    {
      schema: {
        description: 'List all feedback (admin only)',
        tags: ['Feedback'],
        querystring: {
          type: 'object',
          properties: {
            category: { type: 'string', enum: ['bug', 'feature-request', 'improvement', 'other'] },
            status: { type: 'string', enum: ['new', 'reviewed', 'in-progress', 'resolved'] },
            limit: { type: 'integer', default: 50, maximum: 500 },
            offset: { type: 'integer', default: 0 },
          },
        },
        response: {
          200: {
            description: 'List of feedback records',
            type: 'object',
            properties: {
              items: { type: 'array' },
              total: { type: 'integer' },
              limit: { type: 'integer' },
              offset: { type: 'integer' },
            },
          },
        },
      },
    },
    async (request, reply) => {
      const { category, status, limit = 50, offset = 0 } = request.query as {
        category?: string;
        status?: string;
        limit?: number;
        offset?: number;
      };

      let items = Array.from(feedbackStorage.values());

      // Filter
      if (category) {
        items = items.filter((f) => f.category === category);
      }
      if (status) {
        items = items.filter((f) => f.status === status);
      }

      // Sort by date descending
      items.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

      const total = items.length;
      const paginatedItems = items.slice(offset, offset + limit);

      reply.send({
        items: paginatedItems.map((item) => ({
          ...item,
          email: null, // Don't expose emails in list
        })),
        total,
        limit,
        offset,
      });
    }
  );

  // Update feedback status (admin only)
  fastify.patch<{
    Params: { id: string };
    Body: { status: string };
  }>(
    '/feedback/:id/status',
    {
      schema: {
        description: 'Update feedback status (admin only)',
        tags: ['Feedback'],
        params: {
          type: 'object',
          required: ['id'],
          properties: {
            id: { type: 'string', format: 'uuid' },
          },
        },
        body: {
          type: 'object',
          required: ['status'],
          properties: {
            status: { type: 'string', enum: ['new', 'reviewed', 'in-progress', 'resolved'] },
          },
        },
      },
    },
    async (request, reply) => {
      const { id } = request.params;
      const { status } = request.body;

      const feedback = feedbackStorage.get(id);
      if (!feedback) {
        return reply.code(404).send({
          error: 'Feedback not found',
        });
      }

      feedback.status = status as FeedbackRecord['status'];
      feedback.updatedAt = new Date();

      reply.send({
        ...feedback,
        email: null,
      });
    }
  );
}
