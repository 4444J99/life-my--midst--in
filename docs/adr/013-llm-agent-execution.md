# ADR 013: LLM Agent Execution Strategy

**Status:** Accepted
**Date:** 2026-02-07
**Deciders:** Core Team

## Context

The orchestrator defines 10 agent roles (architect, implementer, reviewer, tester, maintainer, narrator, ingestor, crawler, hunter, catcher). Until now, all roles used `StubExecutor` — a mock that returns canned responses after a 20ms delay. The agent framework infrastructure (role definitions, `RoutedAgentExecutor`, task routing, worker loop) was fully wired, but no real LLM inference occurred.

We needed to:

- Replace `StubExecutor` with actual LLM-backed execution per role
- Restrict each role's tool access (shell commands) to its domain
- Maintain graceful degradation when the LLM is unavailable
- Preserve the existing `StubExecutor` path for testing and CI

## Decision

### Per-Role Tool Definitions

Each agent role gets a restricted set of shell commands via `ROLE_TOOL_DEFINITIONS`:

| Role | Commands | Rationale |
|------|----------|-----------|
| architect | tsc, cat, ls, find, wc | Read-only analysis |
| implementer | tsc, eslint, prettier, cat, ls, find, mkdir, cp | Code generation with write access |
| reviewer | tsc, eslint, cat, ls, find, wc, diff | Review tools, no write access |
| tester | vitest, pnpm, cat, ls, find | Test execution |
| maintainer | tsc, eslint, vitest, pnpm, cat, ls, find, wc | Full dev toolkit |
| narrator | _(none)_ | Text-only mode |
| ingestor | _(none)_ | Text-only mode |
| crawler | curl | HTTP client only |
| hunter | curl | HTTP client only |
| catcher | cat, ls, find | Read-only filesystem |

### ReAct Executor Wrapper

`createRoleExecutor(role)` creates a `LocalLLMExecutor` configured with:
- A `ShellToolRunner` restricted to that role's allowed commands (or no runner for text-only roles)
- `structured-json` response format for tool-using roles, `text` for text-only
- Configurable max iterations (default 5) for the tool call loop

The existing `invokeStructured()` method in `LocalLLMExecutor` already implements the full Reason → Act → Observe loop (LLM generates tool calls → runner executes → results fed back → re-prompt), so the wrapper is a thin configuration layer rather than a new execution engine.

### Graceful Degradation

`createLLMAgents()` checks `isLocalLLMEnabled()` before creating real executors:
- **LLM available**: Each role gets its own `LocalLLMExecutor` with restricted tools
- **LLM unavailable**: Falls back to `StubExecutor` for all roles

This ensures the orchestrator always boots, even without Ollama running.

### Thought Extraction

`extractThoughts()` parses `Thought:`, `Reasoning:`, and `Think:` prefixes from LLM output for logging/debugging. `enrichResultWithReasoning()` attaches extracted thoughts to `AgentResult.llm` metadata.

## Alternatives Considered

1. **Single shared executor for all roles**: Simpler but violates least-privilege — the implementer shouldn't run `vitest`, and the tester shouldn't run `prettier`.

2. **External tool server (MCP-style)**: More flexible but adds deployment complexity. The shell-based approach works well for the current command set and can be migrated later.

3. **Custom ReAct loop implementation**: Unnecessary since `invokeStructured()` already does this. Adding a second loop would create redundancy and divergent behavior.

## Consequences

- Each agent role now has enforceable tool boundaries at the command level
- The orchestrator can perform real work when Ollama is available
- CI and tests continue to use `StubExecutor` without requiring LLM infrastructure
- Per-role model overrides (via `LOCAL_LLM_MODEL_<ROLE>` env vars) work with the new executors
- Future roles can be added by extending `ROLE_TOOL_DEFINITIONS`
