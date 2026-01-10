import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { z, AgentRegistrySchema, type AgentRegistry } from "@in-midst-my-life/schema";
import type { AgentRole } from "./agents";

export type NodeEnv = "development" | "test" | "production";
export type AgentExecutorMode = "local" | "oss" | "stub" | "none";
export type TaskQueueKind = "memory" | "redis";
export type TaskStoreKind = "memory" | "postgres";
export type LocalLLMProvider = "ollama" | "openai";
export type LLMErrorMode = "fail" | "throw";
export type LLMPolicyName = "oss" | "hosted" | "locked";
export type AgentResponseFormat = "text" | "structured-json";

export interface ServerConfig {
  host: string;
  port: number;
}

export interface TaskQueueConfig {
  kind: TaskQueueKind;
  url?: string;
  key: string;
}

export interface TaskStoreConfig {
  kind: TaskStoreKind;
  connectionString?: string;
}

export interface AgentExecutionConfig {
  mode: AgentExecutorMode;
  checkLLM: boolean;
  responseFormat: AgentResponseFormat;
}

export interface SchedulerConfig {
  enabled: boolean;
  intervalMs: number;
  roles: AgentRole[];
  description: string;
}

export interface WorkerConfig {
  enabled: boolean;
  pollIntervalMs: number;
  maxRetries: number;
  backoffMs: number;
}

export interface RateLimitConfig {
  enabled: boolean;
  max: number;
  windowMs: number;
  redisUrl?: string;
  keyPrefix: string;
}

export interface ToolingConfig {
  allowlist: string[];
  maxIterations: number;
  cwd?: string;
  allowedRoots?: string[];
}

export interface LocalLLMConfig {
  provider: LocalLLMProvider;
  baseUrl: string;
  model: string;
  temperature: number;
  timeoutMs: number;
  maxTokens: number;
  errorMode: LLMErrorMode;
  policyName: LLMPolicyName;
  allowHosted: boolean;
  allowedProviders: LocalLLMProvider[];
  apiKey?: string;
  roleModels?: Partial<Record<AgentRole, string>>;
  allowedHosts: string[];
}

export interface OrchestratorConfig {
  env: NodeEnv;
  server: ServerConfig;
  queue: TaskQueueConfig;
  store: TaskStoreConfig;
  agent: AgentExecutionConfig;
  llm: LocalLLMConfig;
  registry?: AgentRegistry;
  scheduler: SchedulerConfig;
  worker: WorkerConfig;
}

const DEFAULT_SERVER_HOST = "0.0.0.0";
const DEFAULT_SERVER_PORT = 4000;
const DEFAULT_QUEUE_KEY = "orchestrator:queue";
const DEFAULT_REDIS_URL = "redis://localhost:6379";
const DEFAULT_TOOL_MAX_ITERATIONS = 3;
const DEFAULT_SCHEDULE_INTERVAL_MS = 60_000;
const DEFAULT_WORKER_POLL_INTERVAL_MS = 500;
const DEFAULT_WORKER_MAX_RETRIES = 3;
const DEFAULT_WORKER_BACKOFF_MS = 2000;
const DEFAULT_RATE_LIMIT_MAX = 20;
const DEFAULT_RATE_LIMIT_WINDOW_MS = 60_000;
const DEFAULT_RATE_LIMIT_PREFIX = "orchestrator:rate";

const DEFAULT_PROVIDER: LocalLLMProvider = "ollama";
const DEFAULT_BASE_URL = "http://localhost:11434";
const DEFAULT_MODEL = "llama3.1:8b";
const DEFAULT_TEMPERATURE = 0.2;
const DEFAULT_TIMEOUT_MS = 30_000;
const DEFAULT_MAX_TOKENS = 800;
const DEFAULT_ERROR_MODE: LLMErrorMode = "fail";
const DEFAULT_ALLOWED_HOSTS = ["localhost", "127.0.0.1", "0.0.0.0", "::1"];
const DEFAULT_POLICY: LLMPolicyName = "oss";
const DEFAULT_AGENT_REGISTRY_PATH = join(process.cwd(), "apps", "orchestrator", "agent-registry.json");
const LOCAL_AGENT_REGISTRY_PATH = join(process.cwd(), "agent-registry.json");

interface LLMPolicy {
  name: LLMPolicyName;
  allowHosted: boolean;
  allowedProviders: LocalLLMProvider[];
  allowedHosts: string[];
}

const POLICY_REGISTRY: Record<LLMPolicyName, LLMPolicy> = {
  oss: {
    name: "oss",
    allowHosted: false,
    allowedProviders: ["ollama", "openai"],
    allowedHosts: DEFAULT_ALLOWED_HOSTS
  },
  hosted: {
    name: "hosted",
    allowHosted: true,
    allowedProviders: ["ollama", "openai"],
    allowedHosts: DEFAULT_ALLOWED_HOSTS
  },
  locked: {
    name: "locked",
    allowHosted: false,
    allowedProviders: ["ollama"],
    allowedHosts: DEFAULT_ALLOWED_HOSTS
  }
};

const POLICY_BY_ENV: Record<NodeEnv, LLMPolicyName> = {
  production: "oss",
  development: "oss",
  test: "oss"
};

const ROLE_MODEL_ENV: Record<AgentRole, string> = {
  architect: "LOCAL_LLM_MODEL_ARCHITECT",
  implementer: "LOCAL_LLM_MODEL_IMPLEMENTER",
  reviewer: "LOCAL_LLM_MODEL_REVIEWER",
  tester: "LOCAL_LLM_MODEL_TESTER",
  maintainer: "LOCAL_LLM_MODEL_MAINTAINER",
  narrator: "LOCAL_LLM_MODEL_NARRATOR",
  ingestor: "LOCAL_LLM_MODEL_INGESTOR",
  crawler: "LOCAL_LLM_MODEL_CRAWLER",
  hunter: "LOCAL_LLM_MODEL_HUNTER"
};

const emptyToUndefined = (value: unknown) => {
  if (value === undefined || value === null) return undefined;
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed === "" ? undefined : trimmed;
  }
  return value;
};

const optionalString = z.preprocess(emptyToUndefined, z.string().optional());

const optionalInt = z.preprocess(
  emptyToUndefined,
  z.coerce.number().int().positive().optional()
);

const optionalNumber = z.preprocess(
  emptyToUndefined,
  z.coerce.number().min(0).optional()
);

const optionalEnum = <T extends [string, ...string[]]>(values: T) =>
  z.preprocess((value) => {
    const normalized = emptyToUndefined(value);
    return typeof normalized === "string" ? normalized.toLowerCase() : normalized;
  }, z.enum(values).optional());

const optionalBoolString = z.preprocess((value) => {
  const normalized = emptyToUndefined(value);
  return typeof normalized === "string" ? normalized.toLowerCase() : normalized;
}, z.enum(["true", "false"]).optional());

const envSchema = z
  .object({
    NODE_ENV: optionalEnum(["development", "test", "production"]),
    ORCH_PORT: optionalInt,
    PORT: optionalInt,
    ORCH_HOST: optionalString,
    ORCH_AGENT_EXECUTOR: optionalEnum(["local", "oss", "stub", "none"]),
    ORCH_CHECK_LLM: optionalBoolString,
    ORCH_LLM_POLICY: optionalEnum(["oss", "hosted", "locked"]),
    ORCH_LLM_RESPONSE_FORMAT: optionalEnum(["text", "structured-json"]),
    ALLOW_HOSTED_LLM: optionalBoolString,
    LOCAL_LLM_ALLOWED_HOSTS: optionalString,
    LOCAL_LLM_API: optionalEnum(["ollama", "openai"]),
    LOCAL_LLM_URL: optionalString,
    LOCAL_LLM_MODEL: optionalString,
    LOCAL_LLM_TEMPERATURE: optionalNumber,
    LOCAL_LLM_TIMEOUT_MS: optionalInt,
    LOCAL_LLM_MAX_TOKENS: optionalInt,
    LOCAL_LLM_ERROR_MODE: optionalEnum(["fail", "throw"]),
    ORCH_LLM_ERROR_MODE: optionalEnum(["fail", "throw"]),
    LOCAL_LLM_API_KEY: optionalString,
    LOCAL_LLM_MODEL_ARCHITECT: optionalString,
    LOCAL_LLM_MODEL_IMPLEMENTER: optionalString,
    LOCAL_LLM_MODEL_REVIEWER: optionalString,
    LOCAL_LLM_MODEL_TESTER: optionalString,
    LOCAL_LLM_MODEL_MAINTAINER: optionalString,
    LOCAL_LLM_MODEL_NARRATOR: optionalString,
    LOCAL_LLM_MODEL_INGESTOR: optionalString,
    LOCAL_LLM_MODEL_CRAWLER: optionalString,
    TASK_QUEUE: optionalEnum(["memory", "redis"]),
    TASK_QUEUE_KIND: optionalEnum(["memory", "redis"]),
    TASK_QUEUE_URL: optionalString,
    TASK_QUEUE_KEY: optionalString,
    REDIS_URL: optionalString,
    ORCH_TASK_STORE: optionalEnum(["memory", "postgres"]),
    TASK_STORE: optionalEnum(["memory", "postgres"]),
    DATABASE_URL: optionalString,
    POSTGRES_URL: optionalString,
    INTEGRATION_POSTGRES_URL: optionalString,
    INTEGRATION_REDIS_URL: optionalString,
    ORCH_TOOL_ALLOWLIST: optionalString,
    ORCH_TOOL_MAX_ITERATIONS: optionalInt,
    ORCH_TOOL_CWD: optionalString,
    ORCH_TOOL_ALLOWED_ROOTS: optionalString,
    ORCH_AGENT_REGISTRY: optionalString,
    ORCH_SCHEDULER_ENABLED: optionalBoolString,
    ORCH_SCHEDULE_INTERVAL_MS: optionalInt,
    ORCH_SCHEDULE_ROLES: optionalString,
    ORCH_SCHEDULE_DESCRIPTION: optionalString,
    ORCH_WORKER_ENABLED: optionalBoolString,
    ORCH_WORKER_POLL_INTERVAL_MS: optionalInt,
    ORCH_WORKER_MAX_RETRIES: optionalInt,
    ORCH_WORKER_BACKOFF_MS: optionalInt,
    ORCH_RATE_LIMIT_MAX: optionalInt,
    ORCH_RATE_LIMIT_WINDOW_MS: optionalInt,
    ORCH_RATE_LIMIT_REDIS_URL: optionalString,
    ORCH_RATE_LIMIT_KEY_PREFIX: optionalString,
    ORCH_RATE_LIMIT_ENABLED: optionalBoolString,
    SERPER_API_KEY: optionalString,
    ORCH_JOB_HUNT_ENABLED: optionalBoolString,
    ORCH_API_BASE_URL: optionalString,
    API_BASE_URL: optionalString
  })
  .passthrough();

type ParsedEnv = z.infer<typeof envSchema>;

const formatZodError = (error: z.ZodError) =>
  error.issues
    .map((issue) => `${issue.path.length ? issue.path.join(".") : "env"}: ${issue.message}`)
    .join(", ");

const parseEnv = (env: NodeJS.ProcessEnv): ParsedEnv => {
  const result = envSchema.safeParse(env);
  if (!result.success) {
    throw new Error(`Invalid orchestrator environment: ${formatZodError(result.error)}`);
  }
  return result.data;
};

const resolveNodeEnv = (env: ParsedEnv): NodeEnv => (env.NODE_ENV ?? "development") as NodeEnv;

const resolvePolicyName = (env: ParsedEnv): LLMPolicyName => {
  if (env.ORCH_LLM_POLICY && env.ORCH_LLM_POLICY in POLICY_REGISTRY) {
    return env.ORCH_LLM_POLICY as LLMPolicyName;
  }
  const envName = resolveNodeEnv(env);
  return POLICY_BY_ENV[envName] ?? DEFAULT_POLICY;
};

const resolvePolicy = (env: ParsedEnv): LLMPolicy => {
  const name = resolvePolicyName(env);
  return POLICY_REGISTRY[name] ?? POLICY_REGISTRY[DEFAULT_POLICY];
};

const normalizeBaseUrl = (value: string) => value.replace(/\/+$/, "");

const parseAllowedHosts = (value: string | undefined, fallback: string[]): string[] => {
  if (!value) return fallback;
  const parsed = value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
  return parsed.length > 0 ? parsed : fallback;
};

const parseBool = (value: "true" | "false" | undefined) => value === "true";
const parseCsv = (value: string | undefined): string[] => {
  if (!value) return [];
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
};

export const resolvePostgresUrl = (env: NodeJS.ProcessEnv = process.env): string | undefined => {
  const parsed = parseEnv(env);
  return parsed.DATABASE_URL ?? parsed.POSTGRES_URL;
};

export const resolvePostgresUrlWithFallback = (env: NodeJS.ProcessEnv = process.env): string | undefined => {
  const parsed = parseEnv(env);
  return parsed.DATABASE_URL ?? parsed.POSTGRES_URL ?? parsed.INTEGRATION_POSTGRES_URL;
};

export const resolveIntegrationPostgresUrl = (env: NodeJS.ProcessEnv = process.env): string | undefined => {
  const parsed = parseEnv(env);
  return parsed.INTEGRATION_POSTGRES_URL ?? parsed.DATABASE_URL ?? parsed.POSTGRES_URL;
};

export const resolveRedisUrl = (env: NodeJS.ProcessEnv = process.env): string | undefined => {
  const parsed = parseEnv(env);
  return parsed.REDIS_URL ?? parsed.TASK_QUEUE_URL;
};

export const resolveIntegrationRedisUrl = (env: NodeJS.ProcessEnv = process.env): string | undefined => {
  const parsed = parseEnv(env);
  return parsed.INTEGRATION_REDIS_URL ?? parsed.REDIS_URL ?? parsed.TASK_QUEUE_URL;
};

const buildServerConfig = (parsed: ParsedEnv): ServerConfig => ({
  host: parsed.ORCH_HOST ?? DEFAULT_SERVER_HOST,
  port: parsed.ORCH_PORT ?? parsed.PORT ?? DEFAULT_SERVER_PORT
});

export const loadServerConfig = (env: NodeJS.ProcessEnv = process.env): ServerConfig => {
  const parsed = parseEnv(env);
  return buildServerConfig(parsed);
};

const buildAgentConfig = (parsed: ParsedEnv): AgentExecutionConfig => ({
  mode: (parsed.ORCH_AGENT_EXECUTOR ?? "local") as AgentExecutorMode,
  checkLLM: parseBool(parsed.ORCH_CHECK_LLM),
  responseFormat: (parsed.ORCH_LLM_RESPONSE_FORMAT ?? "text") as AgentResponseFormat
});

export const loadAgentConfig = (env: NodeJS.ProcessEnv = process.env): AgentExecutionConfig => {
  const parsed = parseEnv(env);
  return buildAgentConfig(parsed);
};

const buildTaskQueueConfig = (parsed: ParsedEnv): TaskQueueConfig => {
  const url = parsed.REDIS_URL ?? parsed.TASK_QUEUE_URL;
  const kind =
    (parsed.TASK_QUEUE ?? parsed.TASK_QUEUE_KIND) ??
    (url ? "redis" : "memory");
  return {
    kind: kind as TaskQueueKind,
    url: url ?? undefined,
    key: parsed.TASK_QUEUE_KEY ?? DEFAULT_QUEUE_KEY
  };
};

export const loadTaskQueueConfig = (env: NodeJS.ProcessEnv = process.env): TaskQueueConfig => {
  const parsed = parseEnv(env);
  return buildTaskQueueConfig(parsed);
};

const buildTaskStoreConfig = (parsed: ParsedEnv): TaskStoreConfig => {
  const connectionString = parsed.DATABASE_URL ?? parsed.POSTGRES_URL;
  const kind =
    (parsed.ORCH_TASK_STORE ?? parsed.TASK_STORE) ??
    (connectionString ? "postgres" : "memory");
  return {
    kind: kind as TaskStoreKind,
    connectionString
  };
};

export const loadTaskStoreConfig = (env: NodeJS.ProcessEnv = process.env): TaskStoreConfig => {
  const parsed = parseEnv(env);
  return buildTaskStoreConfig(parsed);
};

export const loadToolingConfig = (env: NodeJS.ProcessEnv = process.env): ToolingConfig => {
  const parsed = parseEnv(env);
  const allowlist = parseCsv(parsed.ORCH_TOOL_ALLOWLIST);
  const allowedRoots = parseCsv(parsed.ORCH_TOOL_ALLOWED_ROOTS);
  return {
    allowlist,
    maxIterations: parsed.ORCH_TOOL_MAX_ITERATIONS ?? DEFAULT_TOOL_MAX_ITERATIONS,
    cwd: parsed.ORCH_TOOL_CWD,
    allowedRoots: allowedRoots.length ? allowedRoots : undefined
  };
};

const parseAgentRoles = (roles: string[]): AgentRole[] => {
  const allowed: AgentRole[] = [
    "architect",
    "implementer",
    "reviewer",
    "tester",
    "maintainer",
    "narrator",
    "ingestor",
    "crawler",
    "hunter"
  ];
  return roles.filter((role): role is AgentRole => allowed.includes(role as AgentRole));
};

export const loadSchedulerConfig = (env: NodeJS.ProcessEnv = process.env): SchedulerConfig => {
  const parsed = parseEnv(env);
  const roles = parseAgentRoles(parseCsv(parsed.ORCH_SCHEDULE_ROLES));
  return {
    enabled: parseBool(parsed.ORCH_SCHEDULER_ENABLED),
    intervalMs: parsed.ORCH_SCHEDULE_INTERVAL_MS ?? DEFAULT_SCHEDULE_INTERVAL_MS,
    roles: roles.length ? roles : ["architect", "implementer", "reviewer"],
    description: parsed.ORCH_SCHEDULE_DESCRIPTION ?? "Scheduled orchestrator run"
  };
};

export const loadWorkerConfig = (env: NodeJS.ProcessEnv = process.env): WorkerConfig => {
  const parsed = parseEnv(env);
  return {
    enabled: parseBool(parsed.ORCH_WORKER_ENABLED),
    pollIntervalMs: parsed.ORCH_WORKER_POLL_INTERVAL_MS ?? DEFAULT_WORKER_POLL_INTERVAL_MS,
    maxRetries: parsed.ORCH_WORKER_MAX_RETRIES ?? DEFAULT_WORKER_MAX_RETRIES,
    backoffMs: parsed.ORCH_WORKER_BACKOFF_MS ?? DEFAULT_WORKER_BACKOFF_MS
  };
};

export const loadRateLimitConfig = (env: NodeJS.ProcessEnv = process.env): RateLimitConfig => {
  const parsed = parseEnv(env);
  const redisUrl = parsed.ORCH_RATE_LIMIT_REDIS_URL ?? parsed.REDIS_URL ?? parsed.TASK_QUEUE_URL;
  const enabled = parsed.ORCH_RATE_LIMIT_ENABLED === undefined ? true : parseBool(parsed.ORCH_RATE_LIMIT_ENABLED);
  return {
    enabled,
    max: parsed.ORCH_RATE_LIMIT_MAX ?? DEFAULT_RATE_LIMIT_MAX,
    windowMs: parsed.ORCH_RATE_LIMIT_WINDOW_MS ?? DEFAULT_RATE_LIMIT_WINDOW_MS,
    redisUrl: redisUrl ?? undefined,
    keyPrefix: parsed.ORCH_RATE_LIMIT_KEY_PREFIX ?? DEFAULT_RATE_LIMIT_PREFIX
  };
};

const buildLLMConfig = (parsed: ParsedEnv): LocalLLMConfig => {
  const policy = resolvePolicy(parsed);
  const allowHosted = policy.allowHosted || parseBool(parsed.ALLOW_HOSTED_LLM);
  const allowedHosts = parseAllowedHosts(parsed.LOCAL_LLM_ALLOWED_HOSTS, policy.allowedHosts);
  const roleModels: Partial<Record<AgentRole, string>> = {};
  (Object.keys(ROLE_MODEL_ENV) as AgentRole[]).forEach((role) => {
    const key = ROLE_MODEL_ENV[role];
    const value = key ? (parsed as Record<string, string | undefined>)[key] : undefined;
    if (value) roleModels[role] = value;
  });
  return {
    provider: (parsed.LOCAL_LLM_API ?? DEFAULT_PROVIDER) as LocalLLMProvider,
    baseUrl: normalizeBaseUrl(parsed.LOCAL_LLM_URL ?? DEFAULT_BASE_URL),
    model: parsed.LOCAL_LLM_MODEL ?? DEFAULT_MODEL,
    temperature: parsed.LOCAL_LLM_TEMPERATURE ?? DEFAULT_TEMPERATURE,
    timeoutMs: parsed.LOCAL_LLM_TIMEOUT_MS ?? DEFAULT_TIMEOUT_MS,
    maxTokens: parsed.LOCAL_LLM_MAX_TOKENS ?? DEFAULT_MAX_TOKENS,
    errorMode:
      (parsed.LOCAL_LLM_ERROR_MODE ?? parsed.ORCH_LLM_ERROR_MODE ?? DEFAULT_ERROR_MODE) as LLMErrorMode,
    policyName: policy.name,
    allowHosted,
    allowedProviders: policy.allowedProviders,
    apiKey: parsed.LOCAL_LLM_API_KEY, // allow-secret
    roleModels,
    allowedHosts
  };
};

export const loadLLMConfig = (env: NodeJS.ProcessEnv = process.env): LocalLLMConfig => {
  const parsed = parseEnv(env);
  return buildLLMConfig(parsed);
};

export const loadOrchestratorConfig = (env: NodeJS.ProcessEnv = process.env): OrchestratorConfig => {
  const parsed = parseEnv(env);
  return {
    env: resolveNodeEnv(parsed),
    server: buildServerConfig(parsed),
    queue: buildTaskQueueConfig(parsed),
    store: buildTaskStoreConfig(parsed),
    agent: buildAgentConfig(parsed),
    llm: buildLLMConfig(parsed),
    registry: loadAgentRegistry(env),
    scheduler: loadSchedulerConfig(env),
    worker: loadWorkerConfig(env)
  };
};

export const getDefaultRedisUrl = () => DEFAULT_REDIS_URL;

export const loadAgentRegistry = (env: NodeJS.ProcessEnv = process.env): AgentRegistry | undefined => {
  const parsed = parseEnv(env);
  const candidates = [
    parsed.ORCH_AGENT_REGISTRY,
    LOCAL_AGENT_REGISTRY_PATH,
    DEFAULT_AGENT_REGISTRY_PATH,
    env['INIT_CWD'] ? join(env['INIT_CWD'], "agent-registry.json") : undefined,
    env['INIT_CWD'] ? join(env['INIT_CWD'], "apps", "orchestrator", "agent-registry.json") : undefined
  ].filter((candidate): candidate is string => Boolean(candidate));
  const path = candidates.find((candidate) => existsSync(candidate));
  if (!path) return undefined;
  const raw = readFileSync(path, "utf-8");
  const json = JSON.parse(raw) as unknown;
  const result = AgentRegistrySchema.safeParse(json);
  if (!result.success) {
    throw new Error(`Invalid agent registry: ${formatZodError(result.error)}`);
  }
  return result.data;
};
