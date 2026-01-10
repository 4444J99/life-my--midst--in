import type { AgentTask } from "./agents";

export type TaskStatus = "queued" | "running" | "completed" | "failed";

export interface TrackedTask extends AgentTask {
  status: TaskStatus;
  result?: Record<string, unknown>;
  llm?: Record<string, unknown>;
  attempts?: number;
  metadata?: Record<string, unknown>;
  history?: Array<{ status: TaskStatus; timestamp: string; notes?: string }>;
}
