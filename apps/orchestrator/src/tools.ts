import { execFile } from "node:child_process";
import { resolve } from "node:path";

export type ToolKind = "shell";

export interface ToolCall {
  id: string;
  tool: ToolKind;
  command: string;
  args?: string[];
  cwd?: string;
  env?: Record<string, string>;
  timeoutMs?: number;
}

export interface ToolResult {
  id: string;
  ok: boolean;
  exitCode?: number;
  stdout?: string;
  stderr?: string;
  error?: string;
  durationMs: number;
}

export interface ToolDefinition {
  tool: ToolKind;
  commands?: string[];
  description?: string;
}

export interface ToolRunner {
  run(call: ToolCall): Promise<ToolResult>;
  listTools?(): ToolDefinition[];
}

export interface ShellToolRunnerOptions {
  allowedCommands: string[];
  defaultCwd?: string;
  allowedCwdRoots?: string[];
  timeoutMs?: number;
  maxOutputChars?: number;
}

const DEFAULT_MAX_OUTPUT_CHARS = 10_000;
const DEFAULT_TIMEOUT_MS = 30_000;

const truncate = (value: string, limit: number) => (value.length > limit ? `${value.slice(0, limit)}...` : value);

const normalizeArgs = (args: string[] | undefined) => (args ?? []).map((arg) => String(arg));

const isCommandAllowed = (command: string, allowed: string[]) => allowed.includes(command);

const isCwdAllowed = (cwd: string, allowedRoots: string[]) => {
  const resolved = resolve(cwd);
  return allowedRoots.some((root) => {
    const rootPath = resolve(root);
    return resolved === rootPath || resolved.startsWith(`${rootPath}/`);
  });
};

export class ShellToolRunner implements ToolRunner {
  private allowedCommands: string[];
  private defaultCwd?: string;
  private allowedCwdRoots?: string[];
  private timeoutMs: number;
  private maxOutputChars: number;

  constructor(options: ShellToolRunnerOptions) {
    this.allowedCommands = options.allowedCommands;
    this.defaultCwd = options.defaultCwd;
    this.allowedCwdRoots = options.allowedCwdRoots;
    this.timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
    this.maxOutputChars = options.maxOutputChars ?? DEFAULT_MAX_OUTPUT_CHARS;
  }

  listTools(): ToolDefinition[] {
    return [
      {
        tool: "shell",
        commands: [...this.allowedCommands]
      }
    ];
  }

  async run(call: ToolCall): Promise<ToolResult> {
    const startedAt = Date.now();
    if (call.tool !== "shell") {
      return {
        id: call.id,
        ok: false,
        error: `unsupported_tool:${call.tool}`,
        durationMs: Date.now() - startedAt
      };
    }

    if (!isCommandAllowed(call.command, this.allowedCommands)) {
      return {
        id: call.id,
        ok: false,
        error: `command_not_allowed:${call.command}`,
        durationMs: Date.now() - startedAt
      };
    }

    const cwd = call.cwd ?? this.defaultCwd;
    if (cwd && this.allowedCwdRoots && !isCwdAllowed(cwd, this.allowedCwdRoots)) {
      return {
        id: call.id,
        ok: false,
        error: `cwd_not_allowed:${cwd}`,
        durationMs: Date.now() - startedAt
      };
    }

    const args = normalizeArgs(call.args);
    const timeoutMs = call.timeoutMs ?? this.timeoutMs;
    return new Promise((resolvePromise) => {
      execFile(
        call.command,
        args,
        {
          cwd,
          timeout: timeoutMs,
          env: call.env ? { ...process.env, ...call.env } : process.env,
          maxBuffer: this.maxOutputChars * 2
        },
        (err, stdout, stderr) => {
          const durationMs = Date.now() - startedAt;
          const exitCode = err && typeof (err as any).code === "number" ? (err as any).code : 0;
          const errorMessage = err
            ? (err as any).killed
              ? "command_timeout"
              : err.message
            : undefined;
          resolvePromise({
            id: call.id,
            ok: !err,
            exitCode: err ? exitCode : 0,
            stdout: stdout ? truncate(String(stdout), this.maxOutputChars) : undefined,
            stderr: stderr ? truncate(String(stderr), this.maxOutputChars) : undefined,
            error: errorMessage,
            durationMs
          });
        }
      );
    });
  }
}
