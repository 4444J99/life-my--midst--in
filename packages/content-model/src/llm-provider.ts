export interface NarrativeContext {
  mask: string;
  personality: string;
  tone: string;
  focusTags: string[];
  recentEvents: string[];
}

export interface GenerateOptions {
  orchestratorUrl?: string;
  timeoutMs?: number;
  modelMaxTokens?: number;
  tokenBudgetRatio?: number;
  cacheTtlMs?: number;
}

async function pollTask(url: string, taskId: string, timeoutMs: number): Promise<string> {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(`${url}/tasks/${taskId}`);
      if (!res.ok) throw new Error(`Orchestrator error: ${res.status}`);
      const json = await res.json();
      const task = json.data;
      
      if (task.status === "completed") {
        return task.notes || "No content generated.";
      }
      if (task.status === "failed") {
        throw new Error(task.notes || "Task failed");
      }
    } catch (err) {
      console.warn("Poll failed, retrying", err);
    }
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
  throw new Error("Task timed out");
}

const CACHE_TTL_MS = 10 * 60 * 1000;
const MODEL_TOKEN_DEFAULT = 4096;

const estimateTokens = (value: string) => Math.ceil(value.length / 4);

const summarizeContext = (events: string[], budgetTokens: number): string => {
  if (events.length === 0) return "";
  const maxTokens = Math.max(512, budgetTokens);
  const ordered = [...events];
  let total = 0;
  const selected: string[] = [];
  for (const event of ordered) {
    const tokens = estimateTokens(event);
    if (total + tokens > maxTokens) break;
    selected.push(event);
    total += tokens;
  }
  if (selected.length === events.length) return selected.join("; ");
  const remaining = events.length - selected.length;
  return `${selected.join("; ")}; Earlier events summarized (${remaining} more).`;
};

const simpleHash = (value: string) => {
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash << 5) - hash + value.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash).toString(36);
};

const cache = new Map<string, { value: string; storedAt: number }>();

const getFromCache = (key: string, ttlMs: number) => {
  const entry = cache.get(key);
  if (!entry) return undefined;
  if (Date.now() - entry.storedAt > ttlMs) {
    cache.delete(key);
    return undefined;
  }
  return entry.value;
};

const setCache = (key: string, value: string) => {
  cache.set(key, { value, storedAt: Date.now() });
};

async function generateWithOrchestrator(
  context: NarrativeContext,
  templateId: string,
  options: GenerateOptions
): Promise<string> {
  const taskId = `task-${globalThis.crypto.randomUUID()}`;
  const modelMax = options.modelMaxTokens ?? MODEL_TOKEN_DEFAULT;
  const ratio = options.tokenBudgetRatio ?? 0.8;
  const budget = Math.floor(modelMax * ratio);
  const evidence = summarizeContext(context.recentEvents, budget);
  
  const payload = {
    id: taskId,
    role: "narrator",
    description: `Generate ${templateId} for ${context.mask}`,
    payload: {
      context: {
        summary: `Generate a narrative block for a CV based on the '${context.mask}' persona.`,
        goals: [
          `Adopt a ${context.tone} tone.`,
          `Focus on tags: ${context.focusTags.join(', ')}.`,
          `Personality Orientation: ${context.personality}`,
        ],
        notes: [
          `Target Template: ${templateId}`,
          `Evidence Pool (Timeline Events): ${evidence}`,
        ],
        constraints: [
          'Output clean Markdown only.',
          'Do not include any preamble or meta-talk.',
          'Ensure historical fidelity to the provided events.',
        ],
      },
    },
  };

  const res = await fetch(`${options.orchestratorUrl}/tasks`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });

  if (!res.ok) {
    throw new Error(`Failed to enqueue task: ${res.status}`);
  }

  return pollTask(options.orchestratorUrl!, taskId, options.timeoutMs ?? 30000);
}

export async function generateNarrativeBlock(
  context: NarrativeContext,
  templateId: string,
  options?: GenerateOptions
): Promise<string> {
  const ttlMs = options?.cacheTtlMs ?? CACHE_TTL_MS;
  const cacheKey = `${templateId}:${simpleHash(JSON.stringify(context))}`;
  const cached = getFromCache(cacheKey, ttlMs);
  if (cached) return cached;

  if (options?.orchestratorUrl) {
    try {
      const value = await generateWithOrchestrator(context, templateId, options);
      setCache(cacheKey, value);
      return value;
    } catch (err) {
      console.error("Orchestrator generation failed, falling back to mock", err);
      const fallback = getFromCache(cacheKey, ttlMs);
      if (fallback) return fallback;
    }
  }

  // Fallback / Mock
  await new Promise((resolve) => setTimeout(resolve, 50));

  const { mask, personality, tone, focusTags, recentEvents } = context;
  const tagsStr = focusTags.join(', ');
  const eventsStr = recentEvents.slice(0, 3).join('; ');

  switch (templateId) {
    case 'summary':
      return `Operating as a **${mask}** with a *${personality}* disposition. My recent focus has been on ${tagsStr}, evidenced by: ${eventsStr}.`;
    
    case 'mask-voice':
      return `Through the lens of the **${mask}**, I approach problems with a ${tone} tone. The goal is to prioritize ${tagsStr} over standard metrics.`;
    
    case 'evidence':
      return `The data supports this ${mask} alignment. Notable artifacts include: ${eventsStr}. These demonstrate a commitment to ${tagsStr}.`;
    
    case 'stage-spotlight':
      return `Currently emphasizing the **${context.mask}** phase of the lifecycle. This requires a ${tone} shift in operations.`;

    default:
      return `[${mask}]: Generated content for ${templateId} focusing on ${tagsStr}.`;
  }
}
