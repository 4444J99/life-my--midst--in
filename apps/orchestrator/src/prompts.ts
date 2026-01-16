import type { AgentRole, AgentTask } from "./agents";

export type ChatRole = "system" | "user" | "assistant";

export interface ChatMessage {
  role: ChatRole;
  content: string;
}

export interface PromptFileContext {
  path: string;
  summary?: string;
  content?: string;
}

export interface PromptContext {
  summary?: string;
  goals?: string[];
  constraints?: string[];
  assumptions?: string[];
  references?: string[];
  notes?: string[];
  files?: PromptFileContext[];
}

export interface PromptOptions {
  includeRawPayload?: boolean;
  maxPayloadChars?: number;
  maxFileChars?: number;
  maxFiles?: number;
  responseFormat?: "text" | "structured-json";
  tooling?: {
    allowlist?: string[];
    guidance?: string;
  };
}

interface ResolvedPromptOptions {
  includeRawPayload: boolean;
  maxPayloadChars: number;
  maxFileChars: number;
  maxFiles: number;
  responseFormat: "text" | "structured-json";
}

const DEFAULT_PROMPT_OPTIONS: ResolvedPromptOptions = {
  includeRawPayload: true,
  maxPayloadChars: 4000,
  maxFileChars: 2000,
  maxFiles: 6,
  responseFormat: "text"
};

const resolvePromptOptions = (options?: PromptOptions): ResolvedPromptOptions => ({
  includeRawPayload: options?.includeRawPayload ?? DEFAULT_PROMPT_OPTIONS.includeRawPayload,
  maxPayloadChars: options?.maxPayloadChars ?? DEFAULT_PROMPT_OPTIONS.maxPayloadChars,
  maxFileChars: options?.maxFileChars ?? DEFAULT_PROMPT_OPTIONS.maxFileChars,
  maxFiles: options?.maxFiles ?? DEFAULT_PROMPT_OPTIONS.maxFiles,
  responseFormat: options?.responseFormat ?? DEFAULT_PROMPT_OPTIONS.responseFormat
});

const truncate = (value: string, limit: number) => (value.length > limit ? `${value.slice(0, limit)}...` : value);
const safeStringify = (value: unknown) => {
  try {
    return JSON.stringify(value ?? {}, null, 2);
  } catch {
    return String(value ?? "");
  }
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const toStringValue = (value: unknown): string | undefined => {
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  return undefined;
};

const toStringArray = (value: unknown): string[] => {
  if (!value) return [];
  if (typeof value === "string") return [value];
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => toStringValue(item))
    .filter((item): item is string => Boolean(item));
};

const normalizeFiles = (value: unknown, options: ResolvedPromptOptions): PromptFileContext[] => {
  if (!Array.isArray(value)) return [];
  const files: PromptFileContext[] = [];
  for (const entry of value) {
    if (files.length >= options.maxFiles) break;
    if (typeof entry === "string") {
      files.push({ path: entry });
      continue;
    }
    if (!isRecord(entry)) continue;
    const path = toStringValue(entry['path'] ?? entry['file'] ?? entry['name']);
    if (!path) continue;
    const summary = toStringValue(entry['summary'] ?? entry['description']);
    const content = toStringValue(entry['content'] ?? entry['snippet']);
    files.push({
      path,
      summary,
      content: content ? truncate(content, options.maxFileChars) : undefined
    });
  }
  return files;
};

export const selectPromptContext = (payload: Record<string, unknown>, options?: PromptOptions): PromptContext => {
  const resolved = resolvePromptOptions(options);
  const contextRoot = isRecord(payload['context']) ? payload['context'] : {};
  const summary =
    toStringValue(contextRoot['summary']) ??
    toStringValue(payload['summary']) ??
    toStringValue(payload['overview']);
  const goals = toStringArray(contextRoot['goals'] ?? payload['goals'] ?? payload['objectives']);
  const constraints = toStringArray(contextRoot['constraints'] ?? payload['constraints'] ?? payload['requirements']);
  const assumptions = toStringArray(contextRoot['assumptions'] ?? payload['assumptions']);
  const references = toStringArray(contextRoot['references'] ?? payload['references'] ?? payload['links']);
  const notes = toStringArray(contextRoot['notes'] ?? payload['notes']);
  const files = normalizeFiles(contextRoot['files'] ?? payload['files'] ?? payload['fileContexts'], resolved);

  return {
    summary,
    goals: goals.length ? goals : undefined,
    constraints: constraints.length ? constraints : undefined,
    assumptions: assumptions.length ? assumptions : undefined,
    references: references.length ? references : undefined,
    notes: notes.length ? notes : undefined,
    files: files.length ? files : undefined
  };
};

export const formatPromptContext = (context: PromptContext, options?: PromptOptions): string => {
  const resolved = resolvePromptOptions(options);
  const sections: string[] = [];

  if (context.summary) {
    sections.push(`Context Summary: ${truncate(context.summary, resolved.maxPayloadChars)}`);
  }
  if (context.goals?.length) {
    sections.push(`Goals:\n- ${context.goals.join("\n- ")}`);
  }
  if (context.constraints?.length) {
    sections.push(`Constraints:\n- ${context.constraints.join("\n- ")}`);
  }
  if (context.assumptions?.length) {
    sections.push(`Assumptions:\n- ${context.assumptions.join("\n- ")}`);
  }
  if (context.references?.length) {
    sections.push(`References:\n- ${context.references.join("\n- ")}`);
  }
  if (context.notes?.length) {
    sections.push(`Notes:\n- ${context.notes.join("\n- ")}`);
  }
  if (context.files?.length) {
    const fileBlocks = context.files.map((file) => {
      const lines = [`File: ${file.path}`];
      if (file.summary) lines.push(`Summary: ${file.summary}`);
      if (file.content) {
        lines.push("Snippet:");
        lines.push("```");
        lines.push(file.content);
        lines.push("```");
      }
      return lines.join("\n");
    });
    sections.push(`Files:\n${fileBlocks.join("\n\n")}`);
  }

  return sections.join("\n\n");
};

export const buildSystemPrompt = (role: AgentRole, options?: PromptOptions): string => {
  const resolved = resolvePromptOptions(options);

  if (role === "narrator") {
    return [
      "You are the Narrator agent, a specialist in professional identity assembly and context-aware storytelling.",
      "Your goal is to transform dry professional data into compelling, verifiable narratives aligned with specific 'Identity Masks'.",
      "When generating content:",
      "1. Adhere strictly to the requested Tone and Personality provided in the notes.",
      "2. Emphasize the requested Focus Tags using high-fidelity evidence from the provided events.",
      "3. Maintain a balance between professional authority and the specific rhetorical mode of the mask.",
      "4. Output should be formatted in clean Markdown.",
      "Mask voice guidance (apply when relevant):",
      "- Analyst: precise, metrics-aware, high-context vocabulary, minimal flourish.",
      "- Strategist: directional, prioritization language, tradeoff framing.",
      "- Narrator: emotive storytelling, clear stakes, human impact.",
      "- Artisan: craft-focused, tactile detail, emphasis on quality signals.",
      "- Executor: concise, action/result oriented, operational clarity.",
      "- Provoker: incisive, contrarian, tension-forward without hostility.",
      "- Mediator: empathetic, alignment language, stakeholder emphasis.",
      resolved.responseFormat === "structured-json"
        ? "Respond with JSON only, matching the AgentResponseSchema shape. Wrap the narrative in the deliverable summary."
        : ""
    ]
      .filter(Boolean)
      .join(" ");
  }

  if (role === "ingestor") {
    return [
      "You are the Ingestor agent, a specialist in data mapping and normalization for professional identity systems.",
      "Your goal is to take raw data from external sources (like GitHub or LinkedIn) and map it into structured CV entities (Project, Experience, Skill).",
      "When processing data:",
      "1. Identify the most appropriate entity type for each raw record.",
      "2. Map fields accurately (e.g., repository name to Project name, stars to metadata).",
      "3. Auto-generate tags based on languages, topics, or keywords.",
      "4. Ensure the output is valid JSON matching the system's expected schema.",
      "5. If provided with raw resume text, parse it into distinct Experience and Education blocks, extracting dates and roles.",
      resolved.responseFormat === "structured-json"
        ? "Respond with JSON only, matching the AgentResponseSchema shape. The 'deliverable.summary' should contain the mapped entities."
        : ""
    ]
      .filter(Boolean)
      .join(" ");
  }

  const lines = [
    `You are the ${role} agent.`,
    "Provide a concise, actionable response with explicit next steps.",
    "Structure the response with: Interpretation, Context Integration, Strategic Continuation, Core Deliverable, Continuity Hooks."
  ];
  if (options?.tooling) {
    lines.push(
      'To use tools, respond with JSON: {"toolCalls":[{"id":"call-1","tool":"shell","command":"rg","args":["pattern","path"]}]}.'
    );
    if (options.tooling.allowlist?.length) {
      lines.push(`Allowed shell commands: ${options.tooling.allowlist.join(", ")}.`);
    }
    if (options.tooling.guidance) {
      lines.push(options.tooling.guidance);
    }
  }
  if (resolved.responseFormat === "structured-json") {
    lines.push("Respond with JSON only, matching the AgentResponseSchema shape.");
  }
  return lines.join(" ");
};

export const buildUserPrompt = (task: AgentTask, options?: PromptOptions): string => {
  const resolved = resolvePromptOptions(options);
  const context = selectPromptContext(task.payload ?? {}, resolved);
  const sections = [`Task ${task.id}: ${task.description}`];
  const contextBlock = formatPromptContext(context, resolved);
  if (contextBlock) {
    sections.push(contextBlock);
  }
  if (resolved.includeRawPayload) {
    const payload = safeStringify(task.payload ?? {});
    sections.push(`Raw Payload:\n${truncate(payload, resolved.maxPayloadChars)}`);
  }
  return sections.join("\n\n");
};

export const buildPromptMessages = (task: AgentTask, options?: PromptOptions): ChatMessage[] => {
  const payload = task.payload as Record<string, unknown> | undefined;
  const systemPrompt = (payload?.['systemPromptOverride'] as string) ?? buildSystemPrompt(task.role, options);
  const userPrompt = (payload?.['userPromptOverride'] as string) ?? buildUserPrompt(task, options);
  return [
    { role: "system", content: systemPrompt },
    { role: "user", content: userPrompt }
  ];
};
