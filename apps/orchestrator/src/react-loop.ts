/**
 * ReAct (Reason-Act-Observe) Executor
 *
 * Wraps LocalLLMExecutor with:
 *   1. Per-role tool restrictions via ROLE_TOOL_DEFINITIONS
 *   2. Thought/reasoning extraction from LLM responses
 *   3. Structured observation logging for each tool call cycle
 *   4. Configurable max iterations with graceful termination
 *
 * The underlying `invokeStructured()` already implements the iterative
 * LLM → tool call → result → re-prompt loop. This wrapper adds the
 * semantic "Thought/Action/Observation" framing and role-specific tooling.
 */

import type { AgentExecutor, AgentResult, AgentRole } from './agents';
import { LocalLLMExecutor, type LocalLLMExecutorOptions } from './llm';
import { loadLLMConfig, loadToolingConfig, type LocalLLMConfig } from './config';
import { ShellToolRunner } from './tools';
import { getToolCommandsForRole, roleHasToolAccess } from './tool-definitions';

export interface ReActExecutorOptions {
  /** Override LLM config (useful for testing) */
  llmConfig?: Partial<LocalLLMConfig>;
  /** Max tool call iterations (default: 5) */
  maxIterations?: number;
  /** Default CWD for shell commands */
  cwd?: string;
  /** Allowed CWD roots for shell commands */
  allowedCwdRoots?: string[];
}

/**
 * Create a role-specific agent executor with restricted tool access.
 *
 * Roles without tool access (narrator, ingestor) get a text-only executor.
 * Roles with tool access get a ShellToolRunner limited to their allowed commands.
 */
export function createRoleExecutor(
  role: AgentRole,
  options: ReActExecutorOptions = {},
): AgentExecutor {
  const llmConfig = { ...loadLLMConfig(), ...(options.llmConfig ?? {}) };
  const toolingConfig = loadToolingConfig();

  const hasTools = roleHasToolAccess(role);
  const roleCommands = getToolCommandsForRole(role);

  // Build executor options
  const executorOptions: LocalLLMExecutorOptions = {
    maxToolIterations: options.maxIterations ?? 5,
  };

  if (hasTools && roleCommands.length > 0) {
    // Create role-specific tool runner with restricted commands
    executorOptions.toolRunner = new ShellToolRunner({
      allowedCommands: roleCommands,
      defaultCwd: options.cwd ?? toolingConfig.cwd,
      allowedCwdRoots: options.allowedCwdRoots ?? toolingConfig.allowedRoots,
    });
    executorOptions.responseFormat = 'structured-json';
  } else {
    // Text-only mode for roles without tool access
    executorOptions.responseFormat = 'text';
  }

  return new LocalLLMExecutor(llmConfig, executorOptions);
}

/**
 * Create a map of role-specific executors for all agent roles.
 *
 * This is designed to be passed to `RoutedAgentExecutor` so each role
 * gets its own executor with appropriate tool restrictions.
 */
export function createRoleExecutorMap(
  options: ReActExecutorOptions = {},
): Partial<Record<AgentRole, AgentExecutor>> {
  const roles: AgentRole[] = [
    'architect',
    'implementer',
    'reviewer',
    'tester',
    'maintainer',
    'narrator',
    'ingestor',
    'crawler',
    'hunter',
    'catcher',
  ];

  const map: Partial<Record<AgentRole, AgentExecutor>> = {};
  for (const role of roles) {
    map[role] = createRoleExecutor(role, options);
  }
  return map;
}

/**
 * Extract "Thought:" sections from LLM output.
 *
 * Many LLMs trained with ReAct prompting will emit structured reasoning
 * in a "Thought: ..." format before taking actions. This extracts those
 * for logging/debugging.
 */
export function extractThoughts(content: string): string[] {
  const thoughts: string[] = [];
  const lines = content.split('\n');
  let currentThought = '';

  for (const line of lines) {
    const thoughtMatch = line.match(/^(?:Thought|Reasoning|Think):\s*(.*)/i);
    if (thoughtMatch?.[1]) {
      if (currentThought) thoughts.push(currentThought.trim());
      currentThought = thoughtMatch[1];
    } else if (currentThought && line.match(/^(?:Action|Observation|Tool|```)/i)) {
      thoughts.push(currentThought.trim());
      currentThought = '';
    } else if (currentThought) {
      currentThought += ' ' + line;
    }
  }

  if (currentThought) thoughts.push(currentThought.trim());
  return thoughts.filter(Boolean);
}

/**
 * Wrap an AgentResult with extracted reasoning metadata.
 */
export function enrichResultWithReasoning(result: AgentResult, content?: string): AgentResult {
  if (!content) return result;

  const thoughts = extractThoughts(content);
  if (thoughts.length === 0) return result;

  return {
    ...result,
    llm: {
      ...(result.llm ?? {}),
      thoughts,
      thoughtCount: thoughts.length,
    },
  };
}
