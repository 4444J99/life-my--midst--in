import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { MessageSchema, MessageThreadSchema, NotificationSchema } from '@in-midst-my-life/schema/messaging';

// Request schemas
const SendMessageSchema = z.object({
  receiverId: z.string().uuid(),
  content: z.string().min(1).max(5000),
  type: z.enum(['text', 'media']).default('text'),
  replyToId: z.string().uuid().optional(),
});

const CreateThreadSchema = z.object({
  participantIds: z.array(z.string().uuid()).min(2),
  subject: z.string().max(200).optional(),
});

const GetThreadMessagesSchema = z.object({
  threadId: z.string().uuid(),
  limit: z.number().min(1).max(100).default(50),
  offset: z.number().min(0).default(0),
});

type SendMessageRequest = z.infer<typeof SendMessageSchema>;
type CreateThreadRequest = z.infer<typeof CreateThreadSchema>;

// Mock storage
const threads = new Map<string, any>();
const messages = new Map<string, any>();

export async function messagingRoutes(fastify: FastifyInstance) {
  /**
   * Send a message
   * POST /messages
   */
  fastify.post<{ Body: SendMessageRequest }>(
    '/messages',
    {
      schema: {
        description: 'Send a message to another user',
        tags: ['Messaging'],
        body: {
          type: 'object',
          required: ['receiverId', 'content'],
          properties: {
            receiverId: { type: 'string', format: 'uuid' },
            content: { type: 'string', minLength: 1, maxLength: 5000 },
            type: { type: 'string', enum: ['text', 'media'] },
            replyToId: { type: 'string', format: 'uuid' },
          },
        },
        response: {
          201: {
            description: 'Message sent',
            type: 'object',
            properties: {
              id: { type: 'string' },
              threadId: { type: 'string' },
              senderId: { type: 'string' },
              receiverId: { type: 'string' },
              content: { type: 'string' },
              createdAt: { type: 'string', format: 'date-time' },
            },
          },
        },
      },
    },
    async (request, reply) => {
      try {
        const sendMessageRequest = SendMessageSchema.parse(request.body);
        const senderId = request.user?.id || 'user-id'; // In production, from auth

        // Create or get thread
        let threadId = Array.from(threads.values()).find(
          (t) =>
            t.participantIds.includes(senderId) &&
            t.participantIds.includes(sendMessageRequest.receiverId)
        )?.id;

        if (!threadId) {
          threadId = crypto.randomUUID();
          threads.set(threadId, {
            id: threadId,
            participantIds: [senderId, sendMessageRequest.receiverId],
            createdAt: new Date(),
          });
        }

        // Create message
        const messageId = crypto.randomUUID();
        const message = {
          id: messageId,
          threadId,
          senderId,
          receiverId: sendMessageRequest.receiverId,
          content: sendMessageRequest.content,
          type: sendMessageRequest.type,
          repliedToId: sendMessageRequest.replyToId,
          readBy: [],
          createdAt: new Date(),
          updatedAt: new Date(),
        };

        messages.set(messageId, message);

        // Emit real-time event (would use WebSocket in production)
        fastify.log.info({
          msg: 'Message sent',
          messageId,
          senderId,
          receiverId: sendMessageRequest.receiverId,
        });

        reply.code(201).send({
          id: messageId,
          threadId,
          senderId,
          receiverId: sendMessageRequest.receiverId,
          content: sendMessageRequest.content,
          createdAt: message.createdAt,
        });
      } catch (error) {
        if (error instanceof z.ZodError) {
          reply.code(400).send({
            error: 'Invalid message',
            details: error.errors,
          });
        } else {
          fastify.log.error(error);
          reply.code(500).send({
            error: 'Failed to send message',
          });
        }
      }
    }
  );

  /**
   * Get user's message threads
   * GET /messages/threads
   */
  fastify.get(
    '/messages/threads',
    {
      schema: {
        description: 'Get all message threads for current user',
        tags: ['Messaging'],
        querystring: {
          type: 'object',
          properties: {
            limit: { type: 'integer', default: 50 },
            offset: { type: 'integer', default: 0 },
          },
        },
        response: {
          200: {
            description: 'List of threads',
            type: 'object',
            properties: {
              threads: { type: 'array' },
              total: { type: 'integer' },
            },
          },
        },
      },
    },
    async (request, reply) => {
      const userId = request.user?.id || 'user-id';
      const { limit = 50, offset = 0 } = request.query as { limit?: number; offset?: number };

      const userThreads = Array.from(threads.values())
        .filter((t) => t.participantIds.includes(userId))
        .sort((a, b) => new Date(b.updatedAt || b.createdAt).getTime() - new Date(a.updatedAt || a.createdAt).getTime())
        .slice(offset, offset + limit);

      const total = Array.from(threads.values()).filter((t) => t.participantIds.includes(userId)).length;

      reply.send({
        threads: userThreads,
        total,
        limit,
        offset,
      });
    }
  );

  /**
   * Get messages in a thread
   * GET /messages/threads/:threadId
   */
  fastify.get<{ Params: { threadId: string } }>(
    '/messages/threads/:threadId',
    {
      schema: {
        description: 'Get messages in a thread',
        tags: ['Messaging'],
        params: {
          type: 'object',
          required: ['threadId'],
          properties: {
            threadId: { type: 'string', format: 'uuid' },
          },
        },
        querystring: {
          type: 'object',
          properties: {
            limit: { type: 'integer', default: 50 },
            offset: { type: 'integer', default: 0 },
          },
        },
        response: {
          200: {
            description: 'List of messages in thread',
            type: 'object',
            properties: {
              messages: { type: 'array' },
              thread: { type: 'object' },
            },
          },
        },
      },
    },
    async (request, reply) => {
      const { threadId } = request.params;
      const { limit = 50, offset = 0 } = request.query as { limit?: number; offset?: number };
      const userId = request.user?.id || 'user-id';

      const thread = threads.get(threadId);
      if (!thread) {
        return reply.code(404).send({
          error: 'Thread not found',
        });
      }

      if (!thread.participantIds.includes(userId)) {
        return reply.code(403).send({
          error: 'Not a participant in this thread',
        });
      }

      const threadMessages = Array.from(messages.values())
        .filter((m) => m.threadId === threadId)
        .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
        .slice(offset, offset + limit);

      // Mark messages as read
      threadMessages.forEach((msg) => {
        if (!msg.readBy.includes(userId)) {
          msg.readBy.push(userId);
          msg.readAt = new Date();
        }
      });

      reply.send({
        thread,
        messages: threadMessages,
        total: Array.from(messages.values()).filter((m) => m.threadId === threadId).length,
        limit,
        offset,
      });
    }
  );

  /**
   * Create a new message thread
   * POST /messages/threads
   */
  fastify.post<{ Body: CreateThreadRequest }>(
    '/messages/threads',
    {
      schema: {
        description: 'Create a new message thread',
        tags: ['Messaging'],
        body: {
          type: 'object',
          required: ['participantIds'],
          properties: {
            participantIds: { type: 'array', items: { type: 'string', format: 'uuid' } },
            subject: { type: 'string', maxLength: 200 },
          },
        },
        response: {
          201: {
            description: 'Thread created',
            type: 'object',
          },
        },
      },
    },
    async (request, reply) => {
      try {
        const createThreadRequest = CreateThreadSchema.parse(request.body);
        const userId = request.user?.id || 'user-id';

        if (!createThreadRequest.participantIds.includes(userId)) {
          createThreadRequest.participantIds.push(userId);
        }

        const threadId = crypto.randomUUID();
        const thread = {
          id: threadId,
          participantIds: createThreadRequest.participantIds,
          subject: createThreadRequest.subject,
          createdAt: new Date(),
          updatedAt: new Date(),
        };

        threads.set(threadId, thread);

        reply.code(201).send(thread);
      } catch (error) {
        if (error instanceof z.ZodError) {
          reply.code(400).send({
            error: 'Invalid thread data',
            details: error.errors,
          });
        } else {
          fastify.log.error(error);
          reply.code(500).send({
            error: 'Failed to create thread',
          });
        }
      }
    }
  );

  /**
   * Get user notifications
   * GET /notifications
   */
  fastify.get(
    '/notifications',
    {
      schema: {
        description: 'Get user notifications',
        tags: ['Messaging'],
        querystring: {
          type: 'object',
          properties: {
            unreadOnly: { type: 'boolean', default: false },
            limit: { type: 'integer', default: 50 },
          },
        },
        response: {
          200: {
            description: 'List of notifications',
            type: 'object',
            properties: {
              notifications: { type: 'array' },
              unreadCount: { type: 'integer' },
            },
          },
        },
      },
    },
    async (request, reply) => {
      const userId = request.user?.id || 'user-id';
      const { unreadOnly = false, limit = 50 } = request.query as { unreadOnly?: boolean; limit?: number };

      // Mock notifications
      const userNotifications = [
        {
          id: crypto.randomUUID(),
          userId,
          type: 'message_received',
          actor: { id: 'user-2', name: 'Alice Chen', avatar: null },
          content: 'sent you a message',
          actionUrl: '/messages/thread/1',
          read: false,
          createdAt: new Date(),
        },
        {
          id: crypto.randomUUID(),
          userId,
          type: 'mentorship_request',
          actor: { id: 'user-3', name: 'Bob Smith', avatar: null },
          content: 'requested to be your mentee',
          actionUrl: '/mentorship/requests',
          read: false,
          createdAt: new Date(Date.now() - 3600000),
        },
      ].filter((n) => !unreadOnly || !n.read);

      const unreadCount = userNotifications.filter((n) => !n.read).length;

      reply.send({
        notifications: userNotifications.slice(0, limit),
        unreadCount,
        total: userNotifications.length,
      });
    }
  );

  /**
   * Mark notification as read
   * PATCH /notifications/:id
   */
  fastify.patch<{ Params: { id: string } }>(
    '/notifications/:id',
    {
      schema: {
        description: 'Mark notification as read',
        tags: ['Messaging'],
        params: {
          type: 'object',
          required: ['id'],
          properties: {
            id: { type: 'string', format: 'uuid' },
          },
        },
      },
    },
    async (request, reply) => {
      const { id } = request.params;
      const userId = request.user?.id || 'user-id';

      // Mock implementation
      fastify.log.info({
        msg: 'Notification marked as read',
        notificationId: id,
        userId,
      });

      reply.send({
        id,
        read: true,
        readAt: new Date(),
      });
    }
  );
}
