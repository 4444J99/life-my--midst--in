import { describe, expect, it } from "vitest";
import { loadLocalLLMConfig, resolveAgentExecutor } from "../src/llm";

describe("local LLM config", () => {
  it("parses error mode", () => {
    const config = loadLocalLLMConfig({ LOCAL_LLM_ERROR_MODE: "throw" } as NodeJS.ProcessEnv);
    expect(config.errorMode).toBe("throw");
  });

  it("blocks non-local base URLs by default", () => {
    const executor = resolveAgentExecutor({
      ORCH_AGENT_EXECUTOR: "local",
      LOCAL_LLM_API: "ollama",
      LOCAL_LLM_URL: "https://example.com"
    } as NodeJS.ProcessEnv);
    expect(executor).toBeUndefined();
  });

  it("allows local base URLs", () => {
    const executor = resolveAgentExecutor({
      ORCH_AGENT_EXECUTOR: "local",
      LOCAL_LLM_API: "ollama",
      LOCAL_LLM_URL: "http://localhost:11434"
    } as NodeJS.ProcessEnv);
    expect(executor).toBeDefined();
  });

  it("allows hosted URLs when explicitly enabled", () => {
    const executor = resolveAgentExecutor({
      ORCH_AGENT_EXECUTOR: "local",
      LOCAL_LLM_API: "openai",
      LOCAL_LLM_URL: "https://api.openai.com",
      ALLOW_HOSTED_LLM: "true"
    } as NodeJS.ProcessEnv);
    expect(executor).toBeDefined();
  });

  it("blocks providers disallowed by policy", () => {
    const executor = resolveAgentExecutor({
      ORCH_AGENT_EXECUTOR: "local",
      ORCH_LLM_POLICY: "locked",
      LOCAL_LLM_API: "openai",
      LOCAL_LLM_URL: "http://localhost:11434"
    } as NodeJS.ProcessEnv);
    expect(executor).toBeUndefined();
  });

  it("allows hosted policy for remote URLs", () => {
    const executor = resolveAgentExecutor({
      ORCH_AGENT_EXECUTOR: "local",
      ORCH_LLM_POLICY: "hosted",
      LOCAL_LLM_API: "openai",
      LOCAL_LLM_URL: "https://example.com"
    } as NodeJS.ProcessEnv);
    expect(executor).toBeDefined();
  });
});
