import { describe, expect, it } from 'vitest';
import {
  ROLE_TOOL_DEFINITIONS,
  getToolCommandsForRole,
  roleHasToolAccess,
  getAllToolCommands,
} from '../src/tool-definitions';

describe('ROLE_TOOL_DEFINITIONS', () => {
  it('defines tools for all 10 agent roles', () => {
    const roles = Object.keys(ROLE_TOOL_DEFINITIONS);
    expect(roles).toHaveLength(10);
    expect(roles).toContain('architect');
    expect(roles).toContain('implementer');
    expect(roles).toContain('narrator');
    expect(roles).toContain('ingestor');
    expect(roles).toContain('crawler');
    expect(roles).toContain('hunter');
    expect(roles).toContain('catcher');
  });

  it('gives narrator and ingestor empty command lists (text-only)', () => {
    expect(ROLE_TOOL_DEFINITIONS.narrator.commands).toEqual([]);
    expect(ROLE_TOOL_DEFINITIONS.ingestor.commands).toEqual([]);
  });

  it('gives implementer write-capable commands', () => {
    const cmds = ROLE_TOOL_DEFINITIONS.implementer.commands;
    expect(cmds).toContain('tsc');
    expect(cmds).toContain('eslint');
    expect(cmds).toContain('prettier');
    expect(cmds).toContain('mkdir');
  });

  it('restricts reviewer to read-only + lint tools', () => {
    const cmds = ROLE_TOOL_DEFINITIONS.reviewer.commands;
    expect(cmds).toContain('tsc');
    expect(cmds).toContain('diff');
    expect(cmds).not.toContain('mkdir');
    expect(cmds).not.toContain('cp');
  });

  it('gives crawler and hunter only curl', () => {
    expect(ROLE_TOOL_DEFINITIONS.crawler.commands).toEqual(['curl']);
    expect(ROLE_TOOL_DEFINITIONS.hunter.commands).toEqual(['curl']);
  });

  it('includes a description for every role', () => {
    for (const config of Object.values(ROLE_TOOL_DEFINITIONS)) {
      expect(config.description).toBeTruthy();
      expect(typeof config.description).toBe('string');
    }
  });
});

describe('getToolCommandsForRole', () => {
  it('returns commands array for architect', () => {
    const cmds = getToolCommandsForRole('architect');
    expect(cmds).toContain('tsc');
    expect(cmds).toContain('cat');
  });

  it('returns empty array for narrator', () => {
    expect(getToolCommandsForRole('narrator')).toEqual([]);
  });
});

describe('roleHasToolAccess', () => {
  it('returns true for roles with commands', () => {
    expect(roleHasToolAccess('architect')).toBe(true);
    expect(roleHasToolAccess('implementer')).toBe(true);
    expect(roleHasToolAccess('tester')).toBe(true);
    expect(roleHasToolAccess('crawler')).toBe(true);
  });

  it('returns false for text-only roles', () => {
    expect(roleHasToolAccess('narrator')).toBe(false);
    expect(roleHasToolAccess('ingestor')).toBe(false);
  });
});

describe('getAllToolCommands', () => {
  it('returns a deduplicated sorted list', () => {
    const all = getAllToolCommands();
    expect(all).toEqual([...new Set(all)].sort());
  });

  it('includes commands from multiple roles', () => {
    const all = getAllToolCommands();
    expect(all).toContain('tsc');
    expect(all).toContain('curl');
    expect(all).toContain('vitest');
    expect(all).toContain('diff');
  });

  it('does not include empty strings', () => {
    const all = getAllToolCommands();
    expect(all.every((cmd) => cmd.length > 0)).toBe(true);
  });
});
