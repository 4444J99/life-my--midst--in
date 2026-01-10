import { describe, expect, it } from "vitest";
import { formatPromptContext, selectPromptContext } from "../src/prompts";

describe("prompt context utilities", () => {
  it("extracts summary, constraints, and files", () => {
    const payload = {
      summary: "Summarize this task",
      constraints: ["keep it short"],
      files: [{ path: "src/app.ts", content: "console.log('hi')" }]
    };

    const context = selectPromptContext(payload);
    expect(context.summary).toBe("Summarize this task");
    expect(context.constraints).toEqual(["keep it short"]);
    expect(context.files?.[0]?.path).toBe("src/app.ts");

    const formatted = formatPromptContext(context);
    expect(formatted).toContain("Context Summary: Summarize this task");
    expect(formatted).toContain("Constraints:");
    expect(formatted).toContain("File: src/app.ts");
  });
});
