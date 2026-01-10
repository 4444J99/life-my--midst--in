import { describe, expect, it } from "vitest";
import { RoutedAgentExecutor, AgentTask } from "../src/agents";

class MockExecutor {
  role: string;
  constructor(role: string) {
    this.role = role;
  }
  async invoke(task: AgentTask) {
    return { taskId: task.id, status: "completed" as const, notes: this.role };
  }
}

describe("RoutedAgentExecutor", () => {
  it("routes to role-specific executors", async () => {
    const executor = new RoutedAgentExecutor({
      architect: new MockExecutor("architect"),
      reviewer: new MockExecutor("reviewer")
    });

    const result = await executor.invoke({ id: "1", role: "architect", description: "plan", payload: {} });
    expect(result.notes).toBe("architect");
  });

  it("falls back when role not registered", async () => {
    const executor = new RoutedAgentExecutor({}, new MockExecutor("fallback"));
    const result = await executor.invoke({ id: "2", role: "tester", description: "test", payload: {} });
    expect(result.notes).toBe("fallback");
  });

  it("throws when no executor available", async () => {
    const executor = new RoutedAgentExecutor({});
    await expect(
      executor.invoke({ id: "3", role: "maintainer", description: "maintain", payload: {} })
    ).rejects.toThrow(/No executor/);
  });
});
