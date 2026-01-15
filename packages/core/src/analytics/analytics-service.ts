/**
 * Analytics Service Implementation
 * 
 * Handles event tracking, user identification, and analytics aggregation.
 * Supports multiple backends: Segment, Mixpanel, custom storage.
 */

import { v4 as uuid } from 'uuid';
import type { AnalyticsEvent, AnalyticsService } from './events';

// ═════════════════════════════════════════════════════════════════════════
// ANALYTICS SERVICE IMPLEMENTATION
// ═════════════════════════════════════════════════════════════════════════

export class DefaultAnalyticsService implements AnalyticsService {
  private sessionId: string = uuid();
  private eventBuffer: AnalyticsEvent[] = [];
  private flushInterval: NodeJS.Timer | null = null;
  private batchSize = 50;
  private flushDelayMs = 30000; // 30 seconds

  constructor(
    private environment: 'development' | 'staging' | 'production' = 'production',
    private endpoint?: string,
    private apiKey?: string
  ) {
    // Start auto-flush timer
    this.startAutoFlush();
  }

  /**
   * Track a single event
   */
  async trackEvent(event: Omit<AnalyticsEvent, 'eventId' | 'timestamp' | 'environment'>): Promise<void> {
    const fullEvent = {
      ...event,
      eventId: uuid(),
      timestamp: new Date(),
      environment: this.environment,
      sessionId: this.sessionId,
    } as any;

    this.eventBuffer.push(fullEvent);

    // Flush if buffer is full
    if (this.eventBuffer.length >= this.batchSize) {
      await this.flush();
    }
  }

  /**
   * Track multiple events
   */
  async trackEvents(events: Omit<AnalyticsEvent, 'eventId' | 'timestamp' | 'environment'>[]): Promise<void> {
    for (const event of events) {
      await this.trackEvent(event);
    }
  }

  /**
   * Identify a user with properties
   */
  async identify(userId: string, properties: Record<string, any>): Promise<void> {
    const event: any = {
      name: 'user_profile_identified' as any,
      category: 'user',
      userId,
      metadata: {
        properties,
      },
    };

    await this.trackEvent(event);
  }

  /**
   * Create a new session
   */
  createSession(userId: string, metadata?: Record<string, any>): string {
    this.sessionId = uuid();

    // Track session creation
    this.trackEvent({
      name: 'session_started' as any,
      category: 'engagement',
      userId,
      metadata: {
        ...metadata,
      },
    } as any).catch((err) => {
      console.error('Failed to track session creation:', err);
    });

    return this.sessionId;
  }

  /**
   * Get user analytics
   */
  async getUserAnalytics(userId: string, from: Date, to: Date): Promise<any> {
    // Implementation depends on backend
    // For now, return mock data
    return {
      userId,
      period: { from, to },
      totalEvents: 0,
      eventsByCategory: {},
      engagement: {
        sessionsCount: 0,
        averageSessionDuration: 0,
        lastActive: null,
      },
      hunterActivity: {
        jobsSearched: 0,
        jobsAnalyzed: 0,
        applicationsSubmitted: 0,
      },
    };
  }

  /**
   * Get system-wide analytics
   */
  async getSystemAnalytics(from: Date, to: Date): Promise<any> {
    return {
      period: { from, to },
      totalUsers: 0,
      activeUsers: 0,
      newSignups: 0,
      eventVolume: 0,
      eventsByCategory: {},
      topFeatures: [],
      errorRate: 0,
      performanceMetrics: {
        avgPageLoadTime: 0,
        avgApiResponseTime: 0,
      },
    };
  }

  /**
   * Flush buffered events to backend
   */
  private async flush(): Promise<void> {
    if (this.eventBuffer.length === 0) {
      return;
    }

    const eventsToFlush = [...this.eventBuffer];
    this.eventBuffer = [];

    try {
      if (this.endpoint && this.apiKey) {
        // Send to analytics backend
        await fetch(this.endpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${this.apiKey}`,
          },
          body: JSON.stringify({
            events: eventsToFlush,
            timestamp: new Date(),
          }),
        });
      } else {
        // Log locally in development
        if (this.environment === 'development') {
          console.debug('[Analytics]', `Flushed ${eventsToFlush.length} events`);
        }
      }
    } catch (error) {
      console.error('Failed to flush analytics events:', error);
      // Re-add events to buffer for retry
      this.eventBuffer = [...eventsToFlush, ...this.eventBuffer];
    }
  }

  /**
   * Start auto-flush timer
   */
  private startAutoFlush(): void {
    this.flushInterval = setInterval(() => {
      this.flush().catch((err) => {
        console.error('Auto-flush failed:', err);
      });
    }, this.flushDelayMs);
  }

  /**
   * Stop auto-flush and flush remaining events
   */
  async shutdown(): Promise<void> {
    if (this.flushInterval) {
      clearInterval(this.flushInterval as unknown as number);
    }
    await this.flush();
  }
}

// ═════════════════════════════════════════════════════════════════════════
// MOCK ANALYTICS SERVICE (for development/testing)
// ═════════════════════════════════════════════════════════════════════════

export class MockAnalyticsService implements AnalyticsService {
  private events: AnalyticsEvent[] = [];
  private sessionId: string = uuid();

  async trackEvent(event: Omit<AnalyticsEvent, 'eventId' | 'timestamp' | 'environment'>): Promise<void> {
    const fullEvent = {
      ...event,
      eventId: uuid(),
      timestamp: new Date(),
      environment: 'development',
      sessionId: this.sessionId,
    } as AnalyticsEvent;

    this.events.push(fullEvent);
    console.log('[Mock Analytics] Event tracked:', fullEvent);
  }

  async trackEvents(events: Omit<AnalyticsEvent, 'eventId' | 'timestamp' | 'environment'>[]): Promise<void> {
    for (const event of events) {
      await this.trackEvent(event);
    }
  }

  async identify(userId: string, properties: Record<string, any>): Promise<void> {
    console.log('[Mock Analytics] User identified:', { userId, properties });
  }

  createSession(userId: string, metadata?: Record<string, any>): string {
    this.sessionId = uuid();
    console.log('[Mock Analytics] Session created:', { userId, sessionId: this.sessionId, metadata });
    return this.sessionId;
  }

  async getUserAnalytics(userId: string, from: Date, to: Date): Promise<any> {
    return {
      userId,
      period: { from, to },
      events: this.events.filter((e) => e.userId === userId),
    };
  }

  async getSystemAnalytics(from: Date, to: Date): Promise<any> {
    return {
      period: { from, to },
      totalEvents: this.events.length,
      events: this.events,
    };
  }

  getRecordedEvents(): AnalyticsEvent[] {
    return [...this.events];
  }

  clearEvents(): void {
    this.events = [];
  }
}

// ═════════════════════════════════════════════════════════════════════════
// ANALYTICS CONTEXT & PROVIDER
// ═════════════════════════════════════════════════════════════════════════

let globalAnalyticsService: AnalyticsService | null = null;

/**
 * Initialize global analytics service
 */
export function initializeAnalytics(
  service: AnalyticsService
): void {
  globalAnalyticsService = service;
}

/**
 * Get global analytics service
 */
export function getAnalyticsService(): AnalyticsService {
  if (!globalAnalyticsService) {
    // Default to mock if not initialized
    globalAnalyticsService = new MockAnalyticsService();
  }
  return globalAnalyticsService;
}

/**
 * Create analytics service based on environment
 */
export function createAnalyticsService(
  environment: 'development' | 'staging' | 'production'
): AnalyticsService {
  if (environment === 'development') {
    return new MockAnalyticsService();
  }

  const endpoint = process.env['ANALYTICS_ENDPOINT'];
  const apiKey = process.env['ANALYTICS_API_KEY']; // allow-secret

  return new DefaultAnalyticsService(environment, endpoint, apiKey);
}

// ═════════════════════════════════════════════════════════════════════════
// CONVENIENCE FUNCTIONS
// ═════════════════════════════════════════════════════════════════════════

/**
 * Track event (convenience wrapper)
 */
export async function trackEvent(
  event: Omit<AnalyticsEvent, 'eventId' | 'timestamp' | 'environment'>
): Promise<void> {
  return getAnalyticsService().trackEvent(event);
}

/**
 * Track multiple events
 */
export async function trackEvents(
  events: Omit<AnalyticsEvent, 'eventId' | 'timestamp' | 'environment'>[]
): Promise<void> {
  return getAnalyticsService().trackEvents(events);
}

/**
 * Identify user
 */
export async function identifyUser(
  userId: string,
  properties: Record<string, any>
): Promise<void> {
  return getAnalyticsService().identify(userId, properties);
}
