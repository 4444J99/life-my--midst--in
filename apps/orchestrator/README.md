# Orchestrator Service

Multi-agent workflow coordination system.
- Tech: TypeScript, Node
- Agents: Architect, Implementer, Reviewer, Tester, Maintainer
- Integration: GitHub webhooks and CI
- API: `/tasks` CRUD + dispatch, `/tasks/:id/history`, `/tasks/:id/metadata`, `/runs` + `/runs/:id` + `/runs/:id/tasks`, Prometheus metrics at `/metrics`, readiness at `/ready`

See WORK-005-autonomous-code-growth.md for complete specification.

## Executors & LLM Wiring
Agents are thin wrappers around an `AgentExecutor` (`src/agents.ts`). Swap in real executors per role via `RoutedAgentExecutor`:

```ts
import { RoutedAgentExecutor, defaultAgents } from "./agents";
import { LocalLLMExecutor } from "./llm"; // local open-source model (Ollama/llama.cpp/vLLM)

const executor = new RoutedAgentExecutor(
  {
    implementer: new LocalLLMExecutor({ model: "llama3.1:8b" }),
    reviewer: new LocalLLMExecutor({ model: "mistral:7b" })
  },
  new LocalLLMExecutor()
);

export const agents = defaultAgents(executor);
```

Local OSS defaults (no hosted keys required):
```
ORCH_AGENT_EXECUTOR=local
LOCAL_LLM_API=ollama
LOCAL_LLM_URL=http://localhost:11434
LOCAL_LLM_MODEL=llama3.1:8b
```
Set `ORCH_AGENT_EXECUTOR=stub` to disable LLM calls (tests/offline). Use `LOCAL_LLM_API=openai` for OpenAI-compatible local servers; `LOCAL_LLM_API_KEY` is optional. Non-local URLs require `ALLOW_HOSTED_LLM=true` or `LOCAL_LLM_ALLOWED_HOSTS` to include the host. Policies: `ORCH_LLM_POLICY=oss` (default), `hosted`, or `locked`.
To retry LLM failures via worker backoff, set `LOCAL_LLM_ERROR_MODE=throw`. Enable readiness checks with `ORCH_CHECK_LLM=true`.
Use structured JSON responses with `ORCH_LLM_RESPONSE_FORMAT=structured-json` (expects `AgentResponseSchema`), or leave as `text` for free-form output.
Enable tool execution by setting `ORCH_TOOL_ALLOWLIST=rg,ls,cat` (optional `ORCH_TOOL_MAX_ITERATIONS`, `ORCH_TOOL_CWD`, `ORCH_TOOL_ALLOWED_ROOTS`).

Default to open-source, free-usage providers; add hosted providers later only if needed and gated behind env flags.

Wire queue/persistence via `ORCH_TASK_STORE=postgres` and `TASK_QUEUE=redis` (see `src/queue.ts`/`src/persistence.ts`). GitHub event parsing lives in `src/webhooks.ts`; provide `GITHUB_WEBHOOK_SECRET` and optionally `GITHUB_APP_ID` for signature validation.

Worker/scheduler toggles: set `ORCH_WORKER_ENABLED=true` (optional `ORCH_WORKER_POLL_INTERVAL_MS`, `ORCH_WORKER_MAX_RETRIES`, `ORCH_WORKER_BACKOFF_MS`) and `ORCH_SCHEDULER_ENABLED=true` (optional `ORCH_SCHEDULE_INTERVAL_MS`, `ORCH_SCHEDULE_ROLES`, `ORCH_SCHEDULE_DESCRIPTION`) to run background processing and periodic runs.
