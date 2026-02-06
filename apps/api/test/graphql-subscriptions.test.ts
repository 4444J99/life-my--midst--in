/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access */
import { describe, it, expect } from 'vitest';
import { buildSchema, subscribe, parse } from 'graphql';
import { graphqlSchema } from '../src/services/graphql-schema';
import {
  queryResolvers,
  mutationResolvers,
  subscriptionResolvers,
  type GraphQLContext,
} from '../src/services/graphql-resolvers';
import { InMemoryPubSub } from '../src/services/pubsub';

/**
 * Helper to set up a subscription using graphql's subscribe() function.
 * This tests the resolvers directly without needing WebSocket transport.
 */
async function setupSubscription(query: string, variables: Record<string, unknown> = {}) {
  const schema = buildSchema(graphqlSchema);
  const pubsub = new InMemoryPubSub();

  const rootValue = {
    ...queryResolvers,
    ...mutationResolvers,
    ...subscriptionResolvers,
  };

  const context: GraphQLContext = { pubsub };

  const result = await subscribe({
    schema,
    document: parse(query),
    rootValue,
    contextValue: context,
    variableValues: variables,
  });

  return { result, pubsub, context };
}

describe('GraphQL Subscriptions', () => {
  it('profileUpdated: receives events when published', async () => {
    const { result, pubsub } = await setupSubscription(`
      subscription {
        profileUpdated(profileId: "p1") {
          id
          displayName
        }
      }
    `);

    // result should be an AsyncIterable
    expect(Symbol.asyncIterator in (result as object)).toBe(true);
    const iter = (result as AsyncIterable<unknown>)[Symbol.asyncIterator]();

    // Publish a profile update
    const { profileUpdatedTopic } = await import('../src/services/pubsub');
    await pubsub.publish(profileUpdatedTopic('p1'), {
      id: 'p1',
      displayName: 'Updated Name',
    });

    const next = await iter.next();
    expect(next.done).toBe(false);
    expect(next.value).toEqual({
      data: {
        profileUpdated: {
          id: 'p1',
          displayName: 'Updated Name',
        },
      },
    });

    await iter.return!();
  });

  it('narrativeGenerated: receives events when published', async () => {
    const { result, pubsub } = await setupSubscription(`
      subscription {
        narrativeGenerated(profileId: "p1") {
          id
          profileId
          status
        }
      }
    `);

    const iter = (result as AsyncIterable<unknown>)[Symbol.asyncIterator]();

    const { narrativeGeneratedTopic } = await import('../src/services/pubsub');
    await pubsub.publish(narrativeGeneratedTopic('p1'), {
      id: 'n1',
      profileId: 'p1',
      status: 'draft',
      blocks: [],
      createdAt: '2024-01-01',
      updatedAt: '2024-01-01',
    });

    const next = await iter.next();
    expect(next.done).toBe(false);
    expect(next.value).toEqual({
      data: {
        narrativeGenerated: {
          id: 'n1',
          profileId: 'p1',
          status: 'draft',
        },
      },
    });

    await iter.return!();
  });

  it('isolates subscriptions across profiles', async () => {
    const { result, pubsub } = await setupSubscription(`
      subscription {
        profileUpdated(profileId: "p1") {
          id
        }
      }
    `);

    const iter = (result as AsyncIterable<unknown>)[Symbol.asyncIterator]();

    // Publish to a DIFFERENT profile
    const { profileUpdatedTopic } = await import('../src/services/pubsub');
    await pubsub.publish(profileUpdatedTopic('p2'), { id: 'p2' });

    // Should not receive this — verify with a timeout race
    const timeout = new Promise<'timeout'>((r) => setTimeout(() => r('timeout'), 50));
    const race = await Promise.race([iter.next(), timeout]);
    expect(race).toBe('timeout');

    await iter.return!();
  });

  it('returns error when PubSub is not available', async () => {
    const schema = buildSchema(graphqlSchema);
    const rootValue = { ...queryResolvers, ...mutationResolvers, ...subscriptionResolvers };
    const context: GraphQLContext = {}; // no pubsub

    // subscribe() may throw or return errors depending on graphql-js version
    try {
      const result = await subscribe({
        schema,
        document: parse(`
          subscription {
            profileUpdated(profileId: "p1") { id }
          }
        `),
        rootValue,
        contextValue: context,
      });

      // If it returns (rather than throws), it should contain errors
      expect('errors' in (result as object)).toBe(true);
      const errors = (result as { errors: Array<{ message: string }> }).errors;
      expect(errors[0]!.message).toContain('PubSub not available');
    } catch (err) {
      // If it throws directly, the error should mention PubSub
      expect((err as Error).message).toContain('PubSub not available');
    }
  });
});
