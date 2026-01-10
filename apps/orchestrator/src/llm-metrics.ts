export interface LLMMetricsSnapshot {
  requests: number;
  successes: number;
  failures: number;
  latencySumMs: number;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  toolCalls: number;
  buckets: number[];
  bucketCounts: number[];
}

const BUCKETS = [50, 100, 250, 500, 1000, 2000, 5000, 10000];
const bucketCounts = new Array<number>(BUCKETS.length).fill(0);

let requests = 0;
let successes = 0;
let failures = 0;
let latencySumMs = 0;
let promptTokens = 0;
let completionTokens = 0;
let totalTokens = 0;
let toolCalls = 0;

export const recordLLMResult = (
  durationMs: number,
  ok: boolean,
  usage?: { promptTokens?: number; completionTokens?: number; totalTokens?: number; toolCalls?: number }
) => {
  requests += 1;
  if (ok) successes += 1;
  else failures += 1;
  latencySumMs += durationMs;
  if (usage?.promptTokens) promptTokens += usage.promptTokens;
  if (usage?.completionTokens) completionTokens += usage.completionTokens;
  if (usage?.totalTokens) totalTokens += usage.totalTokens;
  if (usage?.toolCalls) toolCalls += usage.toolCalls;
  BUCKETS.forEach((bucket, idx) => {
    if (durationMs <= bucket) {
      const current = bucketCounts[idx] ?? 0;
      bucketCounts[idx] = current + 1;
    }
  });
};

export const getLLMMetricsSnapshot = (): LLMMetricsSnapshot => ({
  requests,
  successes,
  failures,
  latencySumMs,
  promptTokens,
  completionTokens,
  totalTokens,
  toolCalls,
  buckets: [...BUCKETS],
  bucketCounts: [...bucketCounts]
});
