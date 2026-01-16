import { describe, it, expect, vi } from "vitest";
import { classifyWithLLM, ExtractedMetadata } from "../../src/prompts/artifact-classification";
import type { AgentExecutor } from "../../src/agents";

describe("classifyWithLLM", () => {
  it("should classify artifact correctly with LLM", async () => {
    const mockExecutor: AgentExecutor = {
      invoke: vi.fn().mockResolvedValue({
        taskId: "test",
        status: "completed",
        notes: JSON.stringify({
          artifactType: "academic_paper",
          confidence: 0.95,
          title: "Test Paper",
          reasoning: "Looks like a paper"
        })
      })
    };

    const metadata: ExtractedMetadata = {
      filename: "test.pdf",
      mimeType: "application/pdf",
      fileSize: 1000,
      textContent: "Abstract..."
    };

    const result = await classifyWithLLM(metadata, mockExecutor);

    expect(result.artifactType).toBe("academic_paper");
    expect(result.confidence).toBe(0.95);
    expect(mockExecutor.invoke).toHaveBeenCalled();
    const callArgs = (mockExecutor.invoke as any).mock.calls[0][0];
    expect(callArgs.payload.systemPromptOverride).toBeDefined();
    expect(callArgs.payload.userPromptOverride).toBeDefined();
  });

  it("should normalize invalid artifact type", async () => {
    const mockExecutor: AgentExecutor = {
      invoke: vi.fn().mockResolvedValue({
        taskId: "test",
        status: "completed",
        notes: JSON.stringify({
          artifactType: "invalid_type",
          confidence: 0.95
        })
      })
    };

    const metadata: ExtractedMetadata = {
      filename: "test.pdf",
      mimeType: "application/pdf",
      fileSize: 1000
    };

    const result = await classifyWithLLM(metadata, mockExecutor);
    expect(result.artifactType).toBe("other");
  });

  it("should clamp confidence", async () => {
    const mockExecutor: AgentExecutor = {
      invoke: vi.fn().mockResolvedValue({
        taskId: "test",
        status: "completed",
        notes: JSON.stringify({
          artifactType: "academic_paper",
          confidence: 1.5
        })
      })
    };

    const metadata: ExtractedMetadata = {
      filename: "test.pdf",
      mimeType: "application/pdf",
      fileSize: 1000
    };

    const result = await classifyWithLLM(metadata, mockExecutor);
    expect(result.confidence).toBe(1.0);
  });

  it("should handle failed LLM response", async () => {
    const mockExecutor: AgentExecutor = {
      invoke: vi.fn().mockResolvedValue({
        taskId: "test",
        status: "failed",
        notes: "Error"
      })
    };

    const metadata: ExtractedMetadata = {
      filename: "test.pdf",
      mimeType: "application/pdf",
      fileSize: 1000
    };

    await expect(classifyWithLLM(metadata, mockExecutor)).rejects.toThrow("LLM classification failed");
  });

  it("should handle unparseable response", async () => {
    const mockExecutor: AgentExecutor = {
      invoke: vi.fn().mockResolvedValue({
        taskId: "test",
        status: "completed",
        notes: "Not JSON"
      })
    };

    const metadata: ExtractedMetadata = {
      filename: "test.pdf",
      mimeType: "application/pdf",
      fileSize: 1000
    };

    await expect(classifyWithLLM(metadata, mockExecutor)).rejects.toThrow("Failed to parse LLM response");
  });
});
