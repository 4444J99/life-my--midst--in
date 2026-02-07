import { ArchitectAgent } from './agents/architect';
import { CatcherAgent } from './agents/catcher';
import { CrawlerAgent } from './agents/crawler';
import { HunterAgent } from './agents/hunter';
import { ImplementerAgent } from './agents/implementer';
import { IngestorAgent } from './agents/ingestor';
import { MaintainerAgent } from './agents/maintainer';
import { NarratorAgent } from './agents/narrator';
import { ReviewerAgent } from './agents/reviewer';
import { TesterAgent } from './agents/tester';
import { isLocalLLMEnabled } from './llm';
import { createRoleExecutorMap, type ReActExecutorOptions } from './react-loop';

export type AgentRole =
  | 'architect'
  | 'implementer'
  | 'reviewer'
  | 'tester'
  | 'maintainer'
  | 'narrator'
  | 'ingestor'
  | 'crawler'
  | 'hunter'
  | 'catcher';

export interface AgentTask {
  id: string;
  runId?: string;
  role: AgentRole;
  description: string;
  payload: Record<string, unknown>;
}

export interface Agent {
  role: AgentRole;
  execute(task: AgentTask): Promise<AgentResult>;
}

export interface AgentResult {
  taskId: string;
  status: 'completed' | 'failed';
  notes?: string;
  output?: Record<string, unknown>;
  llm?: Record<string, unknown>;
}

export interface AgentExecutor {
  invoke(task: AgentTask): Promise<AgentResult>;
}

class StubExecutor implements AgentExecutor {
  async invoke(task: AgentTask): Promise<AgentResult> {
    await new Promise((resolve) => setTimeout(resolve, 20));
    return {
      taskId: task.id,
      status: 'completed',
      notes: `Stub executor handled: ${task.description}`,
    };
  }
}

export class RoutedAgentExecutor implements AgentExecutor {
  private executors: Partial<Record<AgentRole, AgentExecutor>>;
  private fallback?: AgentExecutor;

  constructor(executors: Partial<Record<AgentRole, AgentExecutor>>, fallback?: AgentExecutor) {
    this.executors = executors;
    this.fallback = fallback;
  }

  async invoke(task: AgentTask): Promise<AgentResult> {
    const exec = this.executors[task.role] ?? this.fallback;
    if (!exec) {
      throw new Error(`No executor registered for role ${task.role}`);
    }
    return exec.invoke(task);
  }
}

export function createStubAgent(
  role: AgentRole,
  executor: AgentExecutor = new StubExecutor(),
): Agent {
  return {
    role,
    async execute(task: AgentTask): Promise<AgentResult> {
      return executor.invoke(task);
    },
  };
}

export function defaultAgents(
  executor?: AgentExecutor | Partial<Record<AgentRole, AgentExecutor>>,
): Agent[] {
  const pickExecutor = (role: AgentRole) => {
    if (!executor) return new StubExecutor();
    if ('invoke' in executor) return executor;
    return executor[role] ?? new StubExecutor();
  };
  return [
    new ArchitectAgent(pickExecutor('architect')),
    new ImplementerAgent(pickExecutor('implementer')),
    new ReviewerAgent(pickExecutor('reviewer')),
    new TesterAgent(pickExecutor('tester')),
    new MaintainerAgent(pickExecutor('maintainer')),
    new NarratorAgent(pickExecutor('narrator')),
    new IngestorAgent(pickExecutor('ingestor')),
    new CrawlerAgent(),
    new HunterAgent({ executor: pickExecutor('hunter') }),
    new CatcherAgent(),
  ];
}

/**
 * Create agents with role-specific LLM executors (tool-restricted).
 *
 * When the local LLM is enabled and reachable, each agent role gets its own
 * LocalLLMExecutor configured with a ShellToolRunner restricted to that role's
 * allowed commands. When the LLM is disabled or unreachable, falls back
 * to StubExecutor for all roles — ensuring the orchestrator always boots.
 */
export function createLLMAgents(
  options?: ReActExecutorOptions,
  env: NodeJS.ProcessEnv = process.env,
): Agent[] {
  if (!isLocalLLMEnabled(env)) {
    return defaultAgents();
  }

  const executorMap = createRoleExecutorMap(options);
  return defaultAgents(executorMap);
}
