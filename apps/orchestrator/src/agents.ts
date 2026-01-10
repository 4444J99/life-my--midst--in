import { CrawlerAgent } from "./agents/crawler";
import { IngestorAgent } from "./agents/ingestor";
import { HunterAgent } from "./agents/hunter";

export type AgentRole =
  | "architect"
  | "implementer"
  | "reviewer"
  | "tester"
  | "maintainer"
  | "narrator"
  | "ingestor"
  | "crawler"
  | "hunter";

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
  status: "completed" | "failed";
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
      status: "completed",
      notes: `Stub executor handled: ${task.description}`
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

export function createStubAgent(role: AgentRole, executor: AgentExecutor = new StubExecutor()): Agent {
  return {
    role,
    async execute(task: AgentTask): Promise<AgentResult> {
      return executor.invoke(task);
    }
  };
}

export function defaultAgents(executor?: AgentExecutor | Partial<Record<AgentRole, AgentExecutor>>): Agent[] {
  const pickExecutor = (role: AgentRole) => {
    if (!executor) return new StubExecutor();
    if ("invoke" in executor) return executor as AgentExecutor;
    return (executor as Partial<Record<AgentRole, AgentExecutor>>)[role] ?? new StubExecutor();
  };
  return [
    createStubAgent("architect", pickExecutor("architect")),
    createStubAgent("implementer", pickExecutor("implementer")),
    createStubAgent("reviewer", pickExecutor("reviewer")),
    createStubAgent("tester", pickExecutor("tester")),
    createStubAgent("maintainer", pickExecutor("maintainer")),
    createStubAgent("narrator", pickExecutor("narrator")),
    new IngestorAgent(pickExecutor("ingestor")),
    new CrawlerAgent(),
    new HunterAgent({ executor: pickExecutor("hunter") })
  ];
}
