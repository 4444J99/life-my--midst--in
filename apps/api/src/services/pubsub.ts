/**
 * PubSub Engine for GraphQL Subscriptions
 *
 * Lightweight EventEmitter-based PubSub that produces AsyncIterable objects
 * for GraphQL subscription resolvers. Each subscriber gets a buffered queue
 * with proper cleanup on unsubscribe.
 *
 * For multi-instance deployments, swap with a Redis-backed implementation
 * using the same PubSubEngine interface.
 */

import { EventEmitter } from 'node:events';

export interface PubSubEngine {
  publish(topic: string, payload: unknown): Promise<void>;
  subscribe(topic: string): AsyncIterable<unknown>;
}

/** Topic helper: profile update events */
export function profileUpdatedTopic(profileId: string): string {
  return `profile:${profileId}:updated`;
}

/** Topic helper: narrative generation events */
export function narrativeGeneratedTopic(profileId: string): string {
  return `narrative:${profileId}:generated`;
}

/** Topic helper: interview score update events (fired per answer) */
export function interviewScoreUpdatedTopic(sessionId: string): string {
  return `interview:${sessionId}:score`;
}

/** Topic helper: interview session completed events */
export function interviewCompletedTopic(sessionId: string): string {
  return `interview:${sessionId}:completed`;
}

export class InMemoryPubSub implements PubSubEngine {
  private emitter = new EventEmitter();

  constructor() {
    // Allow many concurrent subscribers without warnings
    this.emitter.setMaxListeners(0);
  }

  publish(topic: string, payload: unknown): Promise<void> {
    this.emitter.emit(topic, payload);
    return Promise.resolve();
  }

  subscribe(topic: string): AsyncIterable<unknown> {
    const emitter = this.emitter;

    return {
      [Symbol.asyncIterator]() {
        const queue: unknown[] = [];
        let resolve: ((value: IteratorResult<unknown>) => void) | null = null;
        let done = false;

        const listener = (payload: unknown) => {
          if (resolve) {
            const r = resolve;
            resolve = null;
            r({ value: payload, done: false });
          } else {
            queue.push(payload);
          }
        };

        emitter.on(topic, listener);

        return {
          next(): Promise<IteratorResult<unknown>> {
            if (done) return Promise.resolve({ value: undefined, done: true });

            if (queue.length > 0) {
              return Promise.resolve({ value: queue.shift(), done: false });
            }

            return new Promise<IteratorResult<unknown>>((r) => {
              resolve = r;
            });
          },

          return(): Promise<IteratorResult<unknown>> {
            done = true;
            emitter.removeListener(topic, listener);
            // Unblock any pending next() call
            if (resolve) {
              resolve({ value: undefined, done: true });
              resolve = null;
            }
            return Promise.resolve({ value: undefined, done: true });
          },

          throw(err?: unknown): Promise<IteratorResult<unknown>> {
            done = true;
            emitter.removeListener(topic, listener);
            return Promise.reject(err instanceof Error ? err : new Error(String(err)));
          },
        };
      },
    };
  }
}
