import { z } from 'zod';
import { UUIDSchema, TimestampSchema } from './common';

/**
 * Messaging System
 * User-to-user real-time messaging with thread-based conversations
 */

export const MessageSchema = z.object({
  id: UUIDSchema,
  threadId: UUIDSchema,
  senderId: UUIDSchema,
  receiverId: UUIDSchema,
  content: z.string().max(5000),
  type: z.enum(['text', 'media', 'system']).default('text'),
  mediaUrl: z.string().url().optional(),
  mediaType: z.enum(['image', 'document', 'file']).optional(),
  isEdited: z.boolean().default(false),
  editedAt: TimestampSchema.optional(),
  reactions: z.record(z.array(UUIDSchema)).default({}),
  repliedToId: UUIDSchema.optional(),
  readBy: z.array(UUIDSchema).default([]),
  readAt: TimestampSchema.optional(),
  pinned: z.boolean().default(false),
  archivedAt: TimestampSchema.optional(),
  createdAt: TimestampSchema,
  updatedAt: TimestampSchema,
});

export type Message = z.infer<typeof MessageSchema>;

export const MessageThreadSchema = z.object({
  id: UUIDSchema,
  participantIds: z.array(UUIDSchema).min(2),
  subject: z.string().optional(),
  lastMessage: MessageSchema.optional(),
  unreadCount: z.record(z.number()).default({}),
  isArchived: z.boolean().default(false),
  isBlocked: z.boolean().default(false),
  blockedBy: UUIDSchema.optional(),
  createdAt: TimestampSchema,
  updatedAt: TimestampSchema,
  archivedAt: TimestampSchema.optional(),
});

export type MessageThread = z.infer<typeof MessageThreadSchema>;

/**
 * Notification System
 * Real-time notifications for user actions
 */

export const NotificationSchema = z.object({
  id: UUIDSchema,
  userId: UUIDSchema,
  type: z.enum([
    'message_received',
    'feedback_received',
    'mentorship_request',
    'connection_request',
    'profile_viewed',
    'achievement_earned',
    'mentor_accepted',
  ]),
  actor: z.object({
    id: UUIDSchema,
    name: z.string(),
    avatar: z.string().url().optional(),
  }),
  content: z.string(),
  actionUrl: z.string().optional(),
  read: z.boolean().default(false),
  readAt: TimestampSchema.optional(),
  createdAt: TimestampSchema,
  expiresAt: TimestampSchema,
});

export type Notification = z.infer<typeof NotificationSchema>;

/**
 * User Preferences
 * Control notification and messaging behavior
 */

export const UserMessagingPreferencesSchema = z.object({
  id: UUIDSchema,
  userId: UUIDSchema,
  allowMessagesFrom: z.enum(['anyone', 'connections_only', 'none']),
  allowMentorshipRequests: z.boolean().default(true),
  allowConnectionRequests: z.boolean().default(true),
  notifyOnMessage: z.boolean().default(true),
  notifyOnMentorship: z.boolean().default(true),
  notifyOnConnection: z.boolean().default(true),
  messagesBatchEmail: z.boolean().default(false),
  emailFrequency: z.enum(['instant', 'hourly', 'daily', 'weekly', 'never']),
  muteNotifications: z.boolean().default(false),
  blockedUsers: z.array(UUIDSchema).default([]),
  createdAt: TimestampSchema,
  updatedAt: TimestampSchema,
});

export type UserMessagingPreferences = z.infer<typeof UserMessagingPreferencesSchema>;

/**
 * Presence Tracking
 * Track user online/offline status
 */

export const PresenceStatusSchema = z.object({
  id: UUIDSchema,
  userId: UUIDSchema,
  status: z.enum(['online', 'away', 'offline', 'invisible']),
  lastActive: TimestampSchema,
  currentActivity: z.string().optional(),
  statusMessage: z.string().max(100).optional(),
});

export type PresenceStatus = z.infer<typeof PresenceStatusSchema>;

/**
 * Message Search & Indexing
 * Enable searching across messages
 */

export const MessageSearchIndexSchema = z.object({
  id: UUIDSchema,
  messageId: UUIDSchema,
  threadId: UUIDSchema,
  senderId: UUIDSchema,
  content: z.string(),
  tokens: z.array(z.string()),
  createdAt: TimestampSchema,
  expiresAt: TimestampSchema.optional(),
});

export type MessageSearchIndex = z.infer<typeof MessageSearchIndexSchema>;

/**
 * Message Attachment
 * Track attachments in messages
 */

export const MessageAttachmentSchema = z.object({
  id: UUIDSchema,
  messageId: UUIDSchema,
  filename: z.string(),
  mimeType: z.string(),
  size: z.number(),
  url: z.string().url(),
  uploadedAt: TimestampSchema,
  expiresAt: TimestampSchema,
});

export type MessageAttachment = z.infer<typeof MessageAttachmentSchema>;

/**
 * Typing Indicator
 * Show when users are typing
 */

export const TypingIndicatorSchema = z.object({
  threadId: UUIDSchema,
  userId: UUIDSchema,
  timestamp: TimestampSchema,
});

export type TypingIndicator = z.infer<typeof TypingIndicatorSchema>;

/**
 * Exports
 */

export const MessagingSchemas = {
  Message: MessageSchema,
  MessageThread: MessageThreadSchema,
  Notification: NotificationSchema,
  UserMessagingPreferences: UserMessagingPreferencesSchema,
  PresenceStatus: PresenceStatusSchema,
  MessageSearchIndex: MessageSearchIndexSchema,
  MessageAttachment: MessageAttachmentSchema,
  TypingIndicator: TypingIndicatorSchema,
};
