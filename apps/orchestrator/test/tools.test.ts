import { describe, expect, it } from "vitest";
import { ShellToolRunner } from "../src/tools";

describe("ShellToolRunner", () => {
  it("blocks disallowed commands", async () => {
    const runner = new ShellToolRunner({ allowedCommands: [] });
    const result = await runner.run({ id: "1", tool: "shell", command: "ls" });
    expect(result.ok).toBe(false);
    expect(result.error).toContain("command_not_allowed");
  });

  it("executes allowed commands", async () => {
    const runner = new ShellToolRunner({ allowedCommands: [process.execPath] });
    const result = await runner.run({
      id: "2",
      tool: "shell",
      command: process.execPath,
      args: ["-e", "console.log('ok')"]
    });
    expect(result.ok).toBe(true);
    expect(result.stdout).toContain("ok");
  });

  it("blocks cwd outside allowed roots", async () => {
    const runner = new ShellToolRunner({
      allowedCommands: [process.execPath],
      allowedCwdRoots: [process.cwd()]
    });
    const result = await runner.run({
      id: "3",
      tool: "shell",
      command: process.execPath,
      args: ["-e", "console.log('ok')"],
      cwd: "/tmp"
    });
    expect(result.ok).toBe(false);
    expect(result.error).toContain("cwd_not_allowed");
  });
});
