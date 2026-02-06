import { describe, it, expect } from 'vitest';
import {
  InMemoryPubSub,
  profileUpdatedTopic,
  narrativeGeneratedTopic,
} from '../src/services/pubsub';

describe('InMemoryPubSub', () => {
  it('delivers published messages to subscriber', async () => {
    const pubsub = new InMemoryPubSub();
    const topic = 'test:topic';
    const iter = pubsub.subscribe(topic)[Symbol.asyncIterator]();

    await pubsub.publish(topic, { id: '1' });

    const result = await iter.next();
    expect(result.done).toBe(false);
    expect(result.value).toEqual({ id: '1' });

    await iter.return!();
  });

  it('delivers to multiple subscribers independently', async () => {
    const pubsub = new InMemoryPubSub();
    const topic = 'test:multi';
    const iter1 = pubsub.subscribe(topic)[Symbol.asyncIterator]();
    const iter2 = pubsub.subscribe(topic)[Symbol.asyncIterator]();

    await pubsub.publish(topic, { msg: 'hello' });

    const [r1, r2] = await Promise.all([iter1.next(), iter2.next()]);
    expect(r1.value).toEqual({ msg: 'hello' });
    expect(r2.value).toEqual({ msg: 'hello' });

    await iter1.return!();
    await iter2.return!();
  });

  it('isolates messages across topics', async () => {
    const pubsub = new InMemoryPubSub();
    const iterA = pubsub.subscribe('topicA')[Symbol.asyncIterator]();
    const iterB = pubsub.subscribe('topicB')[Symbol.asyncIterator]();

    await pubsub.publish('topicA', 'payload-a');

    // iterA should get the message
    const resultA = await iterA.next();
    expect(resultA.value).toBe('payload-a');

    // iterB should not receive anything — use a timeout to verify
    const timeout = new Promise<'timeout'>((r) => setTimeout(() => r('timeout'), 50));
    const raceResult = await Promise.race([iterB.next(), timeout]);
    expect(raceResult).toBe('timeout');

    await iterA.return!();
    await iterB.return!();
  });

  it('cleans up listener on return()', async () => {
    const pubsub = new InMemoryPubSub();
    const topic = 'test:cleanup';
    const iter = pubsub.subscribe(topic)[Symbol.asyncIterator]();

    await iter.return!();

    // Publishing after unsubscribe should not cause issues
    await pubsub.publish(topic, 'orphan');

    const result = await iter.next();
    expect(result.done).toBe(true);
  });

  it('preserves queue ordering', async () => {
    const pubsub = new InMemoryPubSub();
    const topic = 'test:order';
    const iter = pubsub.subscribe(topic)[Symbol.asyncIterator]();

    // Publish multiple before consuming
    await pubsub.publish(topic, 1);
    await pubsub.publish(topic, 2);
    await pubsub.publish(topic, 3);

    const r1 = await iter.next();
    const r2 = await iter.next();
    const r3 = await iter.next();

    expect(r1.value).toBe(1);
    expect(r2.value).toBe(2);
    expect(r3.value).toBe(3);

    await iter.return!();
  });

  it('waits for messages when queue is empty', async () => {
    const pubsub = new InMemoryPubSub();
    const topic = 'test:wait';
    const iter = pubsub.subscribe(topic)[Symbol.asyncIterator]();

    // Start waiting before publishing
    const promise = iter.next();
    await pubsub.publish(topic, 'delayed');

    const result = await promise;
    expect(result.value).toBe('delayed');

    await iter.return!();
  });
});

describe('topic helpers', () => {
  it('generates profileUpdated topic', () => {
    expect(profileUpdatedTopic('p1')).toBe('profile:p1:updated');
  });

  it('generates narrativeGenerated topic', () => {
    expect(narrativeGeneratedTopic('p1')).toBe('narrative:p1:generated');
  });
});
