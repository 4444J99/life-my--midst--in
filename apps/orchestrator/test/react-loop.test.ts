import { describe, expect, it } from 'vitest';
import {
  extractThoughts,
  enrichResultWithReasoning,
  createRoleExecutorMap,
} from '../src/react-loop';
import type { AgentResult } from '../src/agents';

describe('extractThoughts', () => {
  it('extracts Thought: lines from LLM output', () => {
    const content = `Thought: I need to analyze the codebase structure.
Action: shell(ls)
Observation: package.json, src/
Thought: Found the source directory.`;
    const thoughts = extractThoughts(content);
    expect(thoughts).toHaveLength(2);
    expect(thoughts[0]).toBe('I need to analyze the codebase structure.');
    expect(thoughts[1]).toBe('Found the source directory.');
  });

  it('extracts Reasoning: variant', () => {
    const content = `Reasoning: The test suite needs updating.
Action: vitest run`;
    const thoughts = extractThoughts(content);
    expect(thoughts).toHaveLength(1);
    expect(thoughts[0]).toBe('The test suite needs updating.');
  });

  it('extracts Think: variant (case-insensitive)', () => {
    const content = `think: This is a thought.
Action: done`;
    const thoughts = extractThoughts(content);
    expect(thoughts).toHaveLength(1);
    expect(thoughts[0]).toBe('This is a thought.');
  });

  it('handles multi-line thoughts', () => {
    const content = `Thought: First I need to check
  the imports and see if
  everything is correct.
Action: tsc --noEmit`;
    const thoughts = extractThoughts(content);
    expect(thoughts).toHaveLength(1);
    expect(thoughts[0]).toContain('First I need to check');
    expect(thoughts[0]).toContain('the imports');
    expect(thoughts[0]).toContain('everything is correct.');
  });

  it('returns empty array for content without thoughts', () => {
    const content = 'Just a plain response with no structured reasoning.';
    expect(extractThoughts(content)).toEqual([]);
  });

  it('handles empty string', () => {
    expect(extractThoughts('')).toEqual([]);
  });
});

describe('enrichResultWithReasoning', () => {
  const baseResult: AgentResult = {
    taskId: 'test-1',
    status: 'completed',
    notes: 'Done.',
  };

  it('adds thoughts to result.llm', () => {
    const content = `Thought: Analyzing code quality.
Action: eslint .`;
    const enriched = enrichResultWithReasoning(baseResult, content);
    expect(enriched.llm?.['thoughts']).toEqual(['Analyzing code quality.']);
    expect(enriched.llm?.['thoughtCount']).toBe(1);
  });

  it('preserves existing llm metadata', () => {
    const resultWithLLM: AgentResult = {
      ...baseResult,
      llm: { provider: 'ollama', model: 'llama3.1:8b' },
    };
    const content = 'Thought: Quick check.\nAction: done';
    const enriched = enrichResultWithReasoning(resultWithLLM, content);
    expect(enriched.llm?.['provider']).toBe('ollama');
    expect(enriched.llm?.['thoughts']).toEqual(['Quick check.']);
  });

  it('returns original result when no content', () => {
    const enriched = enrichResultWithReasoning(baseResult);
    expect(enriched).toBe(baseResult);
  });

  it('returns original result when no thoughts found', () => {
    const enriched = enrichResultWithReasoning(baseResult, 'No structured thinking here.');
    expect(enriched).toBe(baseResult);
  });
});

describe('createRoleExecutorMap', () => {
  it('creates executors for all 10 roles', () => {
    // This will create LocalLLMExecutor instances with default config.
    // They won't connect to a real LLM in tests, but we can verify the map structure.
    const map = createRoleExecutorMap();
    const roles = Object.keys(map);
    expect(roles).toHaveLength(10);
    expect(roles).toContain('architect');
    expect(roles).toContain('narrator');
    expect(roles).toContain('catcher');
  });

  it('each executor has an invoke method', () => {
    const map = createRoleExecutorMap();
    for (const executor of Object.values(map)) {
      expect(executor).toBeDefined();
      expect(typeof executor.invoke).toBe('function');
    }
  });
});
