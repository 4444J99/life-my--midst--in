import { afterEach, describe, expect, it, vi } from "vitest";
import { LocalLLMExecutor } from "../src/llm";
import type { ToolRunner } from "../src/tools";

describe("LocalLLMExecutor structured flow", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("runs tool calls and parses structured JSON output", async () => {
    const toolRunner: ToolRunner = {
      listTools: () => [{ tool: "shell", commands: ["rg"] }],
      run: vi.fn().mockResolvedValue({
        id: "call-1",
        ok: true,
        stdout: "match",
        durationMs: 5
      })
    };

    const toolCallPayload = JSON.stringify({
      toolCalls: [
        { id: "call-1", tool: "shell", command: "rg", args: ["todo", "."], cwd: "." }
      ]
    });
    const finalPayload = JSON.stringify({
      status: "completed",
      interpretation: "Handled task",
      context: { sources: [], assumptions: [], constraints: [], references: [] },
      strategy: { summary: "Proceed", steps: [] },
      deliverable: { summary: "Done", artifacts: [], notes: [] },
      continuity: { nextSteps: [], openQuestions: [], handoffNotes: [] },
      risks: []
    });

    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({ ok: true, json: async () => ({ message: { content: toolCallPayload } }) })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ message: { content: finalPayload } }) });
    vi.stubGlobal("fetch", fetchMock as typeof fetch);

    const executor = new LocalLLMExecutor(
      { provider: "ollama", baseUrl: "http://localhost:11434", model: "llama3.1:8b" },
      { toolRunner, responseFormat: "structured-json", maxToolIterations: 2 }
    );

    const result = await executor.invoke({
      id: "task-1",
      role: "architect",
      description: "Test tool loop",
      payload: {}
    });

    expect(result.status).toBe("completed");
    expect(result.output).toBeDefined();
    expect(result.llm?.['toolCallsExecuted']).toBe(1);
    expect(toolRunner.run).toHaveBeenCalledTimes(1);
  });
});
