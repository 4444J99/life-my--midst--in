/**
 * Per-role tool definitions for agent executors.
 *
 * Each agent role gets a restricted set of shell commands. This ensures
 * the architect can't accidentally run tests (that's the tester's job),
 * the reviewer can only lint/typecheck, etc.
 *
 * Security: only allowlisted commands are executable; arbitrary shell is never permitted.
 */

import type { AgentRole } from './agents';

export interface RoleToolConfig {
  /** Shell commands this role is allowed to execute */
  commands: string[];
  /** Human description of what tools this role has access to */
  description: string;
}

/**
 * Restricted shell commands per agent role.
 *
 * Roles with no tool access (narrator, ingestor) get empty arrays,
 * meaning they operate in text-only mode.
 */
export const ROLE_TOOL_DEFINITIONS: Record<AgentRole, RoleToolConfig> = {
  architect: {
    commands: ['tsc', 'cat', 'ls', 'find', 'wc'],
    description: 'Read-only filesystem access + TypeScript compiler for architecture analysis',
  },

  implementer: {
    commands: ['tsc', 'eslint', 'prettier', 'cat', 'ls', 'find', 'mkdir', 'cp'],
    description:
      'TypeScript compiler, linter, formatter, and filesystem operations for code generation',
  },

  reviewer: {
    commands: ['tsc', 'eslint', 'cat', 'ls', 'find', 'wc', 'diff'],
    description: 'TypeScript compiler, linter, and diff tools for code review',
  },

  tester: {
    commands: ['vitest', 'pnpm', 'cat', 'ls', 'find'],
    description: 'Test runner (vitest), package manager, and filesystem for test execution',
  },

  maintainer: {
    commands: ['tsc', 'eslint', 'vitest', 'pnpm', 'cat', 'ls', 'find', 'wc'],
    description: 'Full development toolkit for maintenance tasks',
  },

  narrator: {
    commands: [],
    description: 'Text-only mode: generates narratives from profile data without tool access',
  },

  ingestor: {
    commands: [],
    description: 'Text-only mode: maps raw data to CV schema without tool access',
  },

  crawler: {
    commands: ['curl'],
    description: 'HTTP client for web crawling',
  },

  hunter: {
    commands: ['curl'],
    description: 'HTTP client for job search API calls',
  },

  catcher: {
    commands: ['cat', 'ls', 'find'],
    description: 'Read-only filesystem for webhook payload processing',
  },
};

/**
 * Get the tool commands for a given role.
 * Returns empty array for roles with no tool access.
 */
export function getToolCommandsForRole(role: AgentRole): string[] {
  return ROLE_TOOL_DEFINITIONS[role].commands;
}

/**
 * Check whether a role has tool access (non-empty command list).
 */
export function roleHasToolAccess(role: AgentRole): boolean {
  return ROLE_TOOL_DEFINITIONS[role].commands.length > 0;
}

/**
 * Get a merged set of all tool commands across all roles.
 * Useful for the global allowlist when all agents share a single ShellToolRunner.
 */
export function getAllToolCommands(): string[] {
  const commands = new Set<string>();
  for (const config of Object.values(ROLE_TOOL_DEFINITIONS)) {
    for (const cmd of config.commands) {
      commands.add(cmd);
    }
  }
  return [...commands].sort();
}
