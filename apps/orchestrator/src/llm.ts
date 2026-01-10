import { AgentResponseSchema, type AgentResponse, z } from "@in-midst-my-life/schema";
import type { AgentExecutor, AgentResult, AgentTask } from "./agents";
import { loadAgentConfig, loadLLMConfig, loadToolingConfig, type LocalLLMConfig } from "./config";
import { recordLLMResult } from "./llm-metrics";
import { buildPromptMessages, type ChatMessage } from "./prompts";
import { ShellToolRunner, type ToolCall, type ToolResult, type ToolRunner } from "./tools";

interface LLMUsage {
  promptTokens?: number;
  completionTokens?: number;
  totalTokens?: number;
}

interface LLMResponse {
  content: string;
  usage?: LLMUsage;
}

const truncate = (value: string, limit = 1200) => (value.length > limit ? `${value.slice(0, limit)}...` : value);

const isHostAllowed = (baseUrl: string, allowedHosts: string[]) => {
  try {
    const url = new URL(baseUrl);
    return allowedHosts.includes(url.hostname);
  } catch {
    return false;
  }
};

const isProviderAllowed = (config: LocalLLMConfig) => config.allowedProviders.includes(config.provider);

const isHostAllowedForConfig = (config: LocalLLMConfig) =>
  config.allowHosted || isHostAllowed(config.baseUrl, config.allowedHosts);

const assertConfigAllowed = (config: LocalLLMConfig) => {
  if (!isProviderAllowed(config)) {
    throw new Error(`llm_provider_not_allowed:${config.provider}`);
  }
  if (!isHostAllowedForConfig(config)) {
    throw new Error(`llm_host_not_allowed:${config.baseUrl}`);
  }
};

export function loadLocalLLMConfig(env: NodeJS.ProcessEnv = process.env): LocalLLMConfig {
  return loadLLMConfig(env);
}

const resolveModel = (task: AgentTask, config: LocalLLMConfig) =>
  config.roleModels?.[task.role] ?? config.model;

const fetchJson = async (url: string, options: RequestInit, timeoutMs: number) => {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, { ...options, signal: controller.signal });
    if (!response.ok) {
      throw new Error(`llm_http_${response.status}`);
    }
    return response.json() as Promise<any>;
  } catch (err) {
    if (err instanceof Error && err.name === "AbortError") {
      throw new Error("llm_timeout");
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }
};

const buildUsage = (promptTokens?: number, completionTokens?: number, totalTokens?: number): LLMUsage | undefined => {
  if (promptTokens === undefined && completionTokens === undefined && totalTokens === undefined) {
    return undefined;
  }
  const computedTotal =
    totalTokens ?? (promptTokens ?? 0) + (completionTokens ?? 0);
  return {
    promptTokens,
    completionTokens,
    totalTokens: computedTotal
  };
};

const callOllama = async (
  config: LocalLLMConfig,
  messages: ChatMessage[],
  model: string
): Promise<LLMResponse> => {
  const url = `${config.baseUrl}/api/chat`;
  const body = {
    model,
    messages,
    stream: false,
    options: {
      temperature: config.temperature
    }
  };
  const data = await fetchJson(
    url,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body)
    },
    config.timeoutMs
  );
  const content = data?.message?.content;
  if (!content) throw new Error("llm_empty_response");
  const promptTokens = typeof data?.prompt_eval_count === "number" ? data.prompt_eval_count : undefined;
  const completionTokens = typeof data?.eval_count === "number" ? data.eval_count : undefined;
  const usage = buildUsage(promptTokens, completionTokens, undefined);
  return {
    content: String(content),
    usage
  };
};

const callOpenAICompatible = async (
  config: LocalLLMConfig,
  messages: ChatMessage[],
  model: string
): Promise<LLMResponse> => {
  const base = config.baseUrl.endsWith("/v1") ? config.baseUrl : `${config.baseUrl}/v1`;
  const url = `${base}/chat/completions`;
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (config.apiKey) headers['Authorization'] = `Bearer ${config.apiKey}`;
  const body = {
    model,
    messages,
    temperature: config.temperature,
    max_tokens: config.maxTokens
  };
  const data = await fetchJson(
    url,
    {
      method: "POST",
      headers,
      body: JSON.stringify(body)
    },
    config.timeoutMs
  );
  const content = data?.choices?.[0]?.message?.content;
  if (!content) throw new Error("llm_empty_response");
  const promptTokens = typeof data?.usage?.prompt_tokens === "number" ? data.usage.prompt_tokens : undefined;
  const completionTokens = typeof data?.usage?.completion_tokens === "number" ? data.usage.completion_tokens : undefined;
  const totalTokens = typeof data?.usage?.total_tokens === "number" ? data.usage.total_tokens : undefined;
  return {
    content: String(content),
    usage: buildUsage(promptTokens, completionTokens, totalTokens)
  };
};

export async function runChatWithMessages(
  messages: ChatMessage[],
  config: LocalLLMConfig,
  model: string
): Promise<LLMResponse> {
  assertConfigAllowed(config);
  return config.provider === "openai"
    ? callOpenAICompatible(config, messages, model)
    : callOllama(config, messages, model);
}

export async function runChat(task: AgentTask, config: LocalLLMConfig): Promise<LLMResponse> {
  const messages = buildPromptMessages(task);
  const model = resolveModel(task, config);
  return runChatWithMessages(messages, config, model);
}

export async function embedText(text: string, config: LocalLLMConfig): Promise<number[]> {
  assertConfigAllowed(config);
  const url =
    config.provider === "openai"
      ? `${config.baseUrl.endsWith("/v1") ? config.baseUrl : `${config.baseUrl}/v1`}/embeddings`
      : `${config.baseUrl}/api/embeddings`;

  const body =
    config.provider === "openai"
      ? { model: config.model, input: text }
      : { model: config.model, prompt: text };

  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (config.apiKey) headers["Authorization"] = `Bearer ${config.apiKey}`;

  const data = await fetchJson(
    url,
    {
      method: "POST",
      headers,
      body: JSON.stringify(body)
    },
    config.timeoutMs
  );

  const embedding = config.provider === "openai" ? data?.data?.[0]?.embedding : data?.embedding;
  if (!embedding) throw new Error("llm_embedding_failed");
  return embedding as number[];
}

export async function embedTexts(texts: string[], config: LocalLLMConfig): Promise<number[][]> {
  // Simple sequential embedding for now. 
  // In prod, use batching if provider supports it.
  const results: number[][] = [];
  for (const text of texts) {
    results.push(await embedText(text, config));
  }
  return results;
}

const toolCallSchema = z.object({
  id: z.string().min(1),
  tool: z.literal("shell"),
  command: z.string().min(1),
  args: z.array(z.string()).optional(),
  cwd: z.string().optional()
});

const toolCallEnvelopeSchema = z.object({
  toolCalls: z.array(toolCallSchema).min(1)
});

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const extractJsonSnippet = (content: string): string | undefined => {
  const fenced = content.match(/```json\s*([\s\S]*?)```/i) ?? content.match(/```\s*([\s\S]*?)```/);
  if (fenced?.[1]) return fenced[1];
  const start = content.indexOf("{");
  const end = content.lastIndexOf("}");
  if (start !== -1 && end > start) {
    return content.slice(start, end + 1);
  }
  return undefined;
};

const parseJson = (content: string): unknown | undefined => {
  const candidate = extractJsonSnippet(content) ?? content;
  try {
    return JSON.parse(candidate.trim());
  } catch {
    return undefined;
  }
};

const parseAgentResponse = (content: string): AgentResponse | undefined => {
  const parsed = parseJson(content);
  if (!parsed) return undefined;
  const result = AgentResponseSchema.safeParse(parsed);
  return result.success ? result.data : undefined;
};

const parseToolCalls = (content: string): ToolCall[] | undefined => {
  const parsed = parseJson(content);
  if (!parsed || !isRecord(parsed)) return undefined;
  const payload = isRecord(parsed) && "tool_calls" in parsed && !("toolCalls" in parsed)
    ? { ...parsed, toolCalls: (parsed as Record<string, unknown>)['tool_calls'] }
    : parsed;
  const result = toolCallEnvelopeSchema.safeParse(payload);
  if (!result.success) return undefined;
  return result.data.toolCalls.map((call, index) => ({
    id: call.id || `tool-${index + 1}`,
    tool: call.tool,
    command: call.command,
    args: call.args,
    cwd: call.cwd
  }));
};

const formatToolResults = (results: ToolResult[]) =>
  `Tool results:\n${JSON.stringify(results, null, 2)}`;

export interface LocalLLMExecutorOptions {
  toolRunner?: ToolRunner;
  maxToolIterations?: number;
  responseFormat?: "text" | "structured-json";
}

export class LocalLLMExecutor implements AgentExecutor {
  private config: LocalLLMConfig;
  private toolRunner?: ToolRunner;
  private maxToolIterations: number;
  private responseFormat: "text" | "structured-json";

  constructor(config?: Partial<LocalLLMConfig>, options: LocalLLMExecutorOptions = {}) {
    this.config = { ...loadLocalLLMConfig(), ...(config ?? {}) };
    this.toolRunner = options.toolRunner;
    this.maxToolIterations = options.maxToolIterations ?? 3;
    this.responseFormat = options.responseFormat ?? (this.toolRunner ? "structured-json" : "text");
  }

  async invoke(task: AgentTask): Promise<AgentResult> {
    const startedAt = Date.now();
    try {
      const result =
        this.toolRunner || this.responseFormat === "structured-json"
          ? await this.invokeStructured(task)
          : await this.invokePlain(task);
      const durationMs = Date.now() - startedAt;
      recordLLMResult(durationMs, true, {
        promptTokens: result.llm?.['promptTokens'] as number | undefined,
        completionTokens: result.llm?.['completionTokens'] as number | undefined,
        totalTokens: result.llm?.['totalTokens'] as number | undefined,
        toolCalls: result.llm?.['toolCallsExecuted'] as number | undefined
      });
      result.llm = { ...(result.llm ?? {}), durationMs };
      return result;
    } catch (err) {
      const durationMs = Date.now() - startedAt;
      recordLLMResult(durationMs, false);
      if (this.config.errorMode === "throw") {
        throw err;
      }
      return {
        taskId: task.id,
        status: "failed",
        notes: `local_llm_error: ${String(err)}`,
        llm: {
          provider: this.config.provider,
          model: resolveModel(task, this.config),
          baseUrl: this.config.baseUrl,
          responseFormat: this.responseFormat,
          durationMs,
          error: String(err)
        }
      };
    }
  }

  private async invokePlain(task: AgentTask): Promise<AgentResult> {
    const response = await runChat(task, this.config);
    return {
      taskId: task.id,
      status: "completed",
      notes: truncate(response.content.trim()),
      llm: {
        provider: this.config.provider,
        model: resolveModel(task, this.config),
        baseUrl: this.config.baseUrl,
        responseFormat: this.responseFormat,
        toolCallsExecuted: 0,
        toolIterations: 0,
        promptTokens: response.usage?.promptTokens,
        completionTokens: response.usage?.completionTokens,
        totalTokens: response.usage?.totalTokens
      }
    };
  }

  private async invokeStructured(task: AgentTask): Promise<AgentResult> {
    const toolDefinitions = this.toolRunner?.listTools?.() ?? [];
    const shellTools = toolDefinitions.find((tool) => tool.tool === "shell");
    const promptOptions = {
      responseFormat: this.responseFormat,
      tooling: this.toolRunner
        ? {
            allowlist: shellTools?.commands
          }
        : undefined
    };
    const model = resolveModel(task, this.config);
    let messages = buildPromptMessages(task, promptOptions);
    let usageTotals: LLMUsage = {};
    const addUsage = (usage?: LLMUsage) => {
      if (!usage) return;
      usageTotals = {
        promptTokens: (usageTotals.promptTokens ?? 0) + (usage.promptTokens ?? 0),
        completionTokens: (usageTotals.completionTokens ?? 0) + (usage.completionTokens ?? 0),
        totalTokens: (usageTotals.totalTokens ?? 0) + (usage.totalTokens ?? 0)
      };
    };

    let response = await runChatWithMessages(messages, this.config, model);
    addUsage(response.usage);
    let content = response.content;
    let toolCallsExecuted = 0;
    let toolIterations = 0;

    if (this.toolRunner) {
      let remaining = this.maxToolIterations;
      while (remaining > 0) {
        const toolCalls = parseToolCalls(content);
        if (!toolCalls || toolCalls.length === 0) break;
        const results = await Promise.all(toolCalls.map((call) => this.toolRunner!.run(call)));
        toolCallsExecuted += toolCalls.length;
        toolIterations += 1;
        messages = [
          ...messages,
          { role: "assistant", content },
          { role: "user", content: formatToolResults(results) }
        ];
        remaining -= 1;
        response = await runChatWithMessages(messages, this.config, model);
        addUsage(response.usage);
        content = response.content;
      }
      if (remaining === 0 && parseToolCalls(content)) {
        throw new Error("tool_call_limit_exceeded");
      }
    } else if (parseToolCalls(content)) {
      throw new Error("tool_calls_not_supported");
    }

    if (this.responseFormat === "structured-json") {
      const structured = parseAgentResponse(content);
      if (!structured) {
        throw new Error("structured_response_parse_failed");
      }
      return {
        taskId: task.id,
        status: structured.status === "completed" ? "completed" : "failed",
        notes: truncate(structured.deliverable.summary, 1200),
        output: structured as unknown as Record<string, unknown>,
        llm: {
          provider: this.config.provider,
          model,
          baseUrl: this.config.baseUrl,
          responseFormat: this.responseFormat,
          toolCallsExecuted,
          toolIterations,
          promptTokens: usageTotals.promptTokens,
          completionTokens: usageTotals.completionTokens,
          totalTokens: usageTotals.totalTokens
        }
      };
    }

    return {
      taskId: task.id,
      status: "completed",
      notes: truncate(content.trim()),
      llm: {
        provider: this.config.provider,
        model,
        baseUrl: this.config.baseUrl,
        responseFormat: this.responseFormat,
        toolCallsExecuted,
        toolIterations,
        promptTokens: usageTotals.promptTokens,
        completionTokens: usageTotals.completionTokens,
        totalTokens: usageTotals.totalTokens
      }
    };
  }
}

export function isLocalLLMEnabled(env: NodeJS.ProcessEnv = process.env): boolean {
  const mode = loadAgentConfig(env).mode;
  if (mode !== "local" && mode !== "oss") return false;
  const config = loadLocalLLMConfig(env);
  return isProviderAllowed(config) && isHostAllowedForConfig(config);
}

export function resolveAgentExecutor(env: NodeJS.ProcessEnv = process.env): AgentExecutor | undefined {
  const agentConfig = loadAgentConfig(env);
  const mode = agentConfig.mode;
  if (mode === "stub" || mode === "none") return undefined;
  if (mode === "local" || mode === "oss") {
    const config = loadLocalLLMConfig(env);
    if (!isProviderAllowed(config)) {
      console.warn(
        `LLM provider ${config.provider} is blocked by policy '${config.policyName}'. Falling back to stub.`
      );
      return undefined;
    }
    if (!isHostAllowedForConfig(config)) {
      console.warn(
        `LLM base URL ${config.baseUrl} is blocked by policy '${config.policyName}'. ` +
          "Set ALLOW_HOSTED_LLM=true or LOCAL_LLM_ALLOWED_HOSTS to permit it."
      );
      return undefined;
    }
    const tooling = loadToolingConfig(env);
    const toolRunner =
      tooling.allowlist.length > 0
        ? new ShellToolRunner({
            allowedCommands: tooling.allowlist,
            defaultCwd: tooling.cwd,
            allowedCwdRoots: tooling.allowedRoots
          })
        : undefined;
    const responseFormat = toolRunner ? "structured-json" : agentConfig.responseFormat;
    return new LocalLLMExecutor(config, {
      toolRunner,
      maxToolIterations: tooling.maxIterations,
      responseFormat
    });
  }
  console.warn(`Unknown ORCH_AGENT_EXECUTOR=${mode}; falling back to stub.`);
  return undefined;
}

export async function checkLocalLLMHealth(env: NodeJS.ProcessEnv = process.env): Promise<boolean> {
  const config = loadLocalLLMConfig(env);
  if (!isProviderAllowed(config)) {
    return false;
  }
  if (!isHostAllowedForConfig(config)) {
    return false;
  }
  if (config.provider === "ollama") {
    try {
      const url = `${config.baseUrl}/api/tags`;
      await fetchJson(url, { method: "GET" }, Math.min(config.timeoutMs, 3000));
      return true;
    } catch {
      return false;
    }
  }
  try {
    const base = config.baseUrl.endsWith("/v1") ? config.baseUrl : `${config.baseUrl}/v1`;
    const url = `${base}/models`;
    const headers: Record<string, string> = {};
    if (config.apiKey) headers['Authorization'] = `Bearer ${config.apiKey}`;
    await fetchJson(url, { method: "GET", headers }, Math.min(config.timeoutMs, 3000));
    return true;
  } catch {
    return false;
  }
}
