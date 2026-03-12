import { connectSandbox, type Sandbox } from "@open-harness/sandbox";
import {
  DurableAgent,
  type DurableAgentOptions,
  type DurableAgentStreamOptions,
  type DurableAgentStreamResult,
} from "@workflow/ai/agent";
import { tool, type ToolSet } from "ai";
import * as path from "node:path";
import { z } from "zod";
import {
  buildSystemPrompt,
  type BuildSystemPromptOptions,
} from "./system-prompt";

const BASH_TIMEOUT_MS = 120_000;
const DEFAULT_MAX_STEPS = 200;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function getSandboxId(experimentalContext: unknown, toolName: string): string {
  if (!isRecord(experimentalContext)) {
    throw new Error(
      `Missing experimental_context for ${toolName}. Expected { sandboxId: string }`,
    );
  }

  const sandboxId = experimentalContext.sandboxId;
  if (typeof sandboxId !== "string" || sandboxId.trim().length === 0) {
    throw new Error(
      `Missing sandboxId in experimental_context for ${toolName}.`,
    );
  }

  return sandboxId;
}

function isPathWithinDirectory(filePath: string, directory: string): boolean {
  const resolvedPath = path.resolve(filePath);
  const resolvedDirectory = path.resolve(directory);

  return (
    resolvedPath.startsWith(resolvedDirectory + path.sep) ||
    resolvedPath === resolvedDirectory
  );
}

function resolveWorkspacePath(
  filePath: string,
  workingDirectory: string,
): string {
  const absolutePath = path.isAbsolute(filePath)
    ? path.resolve(filePath)
    : path.resolve(workingDirectory, filePath);

  if (!isPathWithinDirectory(absolutePath, workingDirectory)) {
    throw new Error(
      `Path '${filePath}' is outside the working directory '${workingDirectory}'.`,
    );
  }

  return absolutePath;
}

function toDisplayPath(filePath: string, workingDirectory: string): string {
  const relativePath = path
    .relative(workingDirectory, filePath)
    .replace(/\\/g, "/");
  return relativePath.length > 0 ? relativePath : ".";
}

const sandboxConnections = new Map<string, Promise<Sandbox>>();

async function getConnectedSandbox(sandboxId: string): Promise<Sandbox> {
  const existingConnection = sandboxConnections.get(sandboxId);
  if (existingConnection) {
    return existingConnection;
  }

  const connection = connectSandbox({ type: "vercel", sandboxId }).catch(
    (error) => {
      sandboxConnections.delete(sandboxId);
      throw error;
    },
  );

  sandboxConnections.set(sandboxId, connection);
  return connection;
}

const readTool = tool({
  description: `Read file contents from the sandbox filesystem.

USAGE:
- Use workspace-relative paths (e.g., "src/index.ts")
- By default reads up to 2000 lines from line 1
- Use offset and limit for partial reads

IMPORTANT:
- Always read files before editing them
- This tool reads files only (not directories)`,
  inputSchema: z.object({
    filePath: z.string().describe("Workspace-relative file path"),
    offset: z.number().optional().describe("Start line number (1-indexed)"),
    limit: z.number().optional().describe("Maximum lines to read"),
  }),
  execute: async (
    { filePath, offset = 1, limit = 2000 },
    { experimental_context },
  ) => {
    const sandboxId = getSandboxId(experimental_context, "read");
    const sandbox = await getConnectedSandbox(sandboxId);
    const workingDirectory = sandbox.workingDirectory;

    try {
      const absolutePath = resolveWorkspacePath(filePath, workingDirectory);
      const stats = await sandbox.stat(absolutePath);

      if (stats.isDirectory()) {
        return {
          success: false,
          error: "Cannot read a directory.",
        };
      }

      const content = await sandbox.readFile(absolutePath, "utf-8");
      const lines = content.split("\n");
      const startLine = Math.max(1, offset) - 1;
      const endLine = Math.min(lines.length, startLine + limit);
      const selectedLines = lines.slice(startLine, endLine);

      return {
        success: true,
        path: toDisplayPath(absolutePath, workingDirectory),
        totalLines: lines.length,
        startLine: startLine + 1,
        endLine,
        content: selectedLines
          .map((line, index) => `${startLine + index + 1}: ${line}`)
          .join("\n"),
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  },
});

const writeTool = tool({
  description: `Create or overwrite files in the sandbox.

WHEN TO USE:
- Creating new files
- Rewriting full file contents

IMPORTANT:
- Prefer edit for small changes to existing files`,
  inputSchema: z.object({
    filePath: z.string().describe("Workspace-relative file path"),
    content: z.string().describe("File content"),
  }),
  execute: async ({ filePath, content }, { experimental_context }) => {
    const sandboxId = getSandboxId(experimental_context, "write");
    const sandbox = await getConnectedSandbox(sandboxId);
    const workingDirectory = sandbox.workingDirectory;

    try {
      const absolutePath = resolveWorkspacePath(filePath, workingDirectory);
      const directoryPath = path.dirname(absolutePath);

      await sandbox.mkdir(directoryPath, { recursive: true });
      await sandbox.writeFile(absolutePath, content, "utf-8");

      const stats = await sandbox.stat(absolutePath);

      return {
        success: true,
        path: toDisplayPath(absolutePath, workingDirectory),
        bytesWritten: stats.size,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  },
});

const editTool = tool({
  description: `Make exact string replacements in an existing file.

IMPORTANT:
- oldString must match exactly, including whitespace
- Use replaceAll=true for multiple replacements`,
  inputSchema: z.object({
    filePath: z.string().describe("Workspace-relative file path"),
    oldString: z.string().describe("Exact text to replace"),
    newString: z.string().describe("Replacement text"),
    replaceAll: z.boolean().optional().describe("Replace all occurrences"),
    startLine: z.number().optional().describe("Line where oldString starts"),
  }),
  execute: async (
    { filePath, oldString, newString, replaceAll = false },
    { experimental_context },
  ) => {
    const sandboxId = getSandboxId(experimental_context, "edit");
    const sandbox = await getConnectedSandbox(sandboxId);
    const workingDirectory = sandbox.workingDirectory;

    try {
      if (oldString === newString) {
        return {
          success: false,
          error: "oldString and newString must be different.",
        };
      }

      const absolutePath = resolveWorkspacePath(filePath, workingDirectory);
      const content = await sandbox.readFile(absolutePath, "utf-8");

      if (!content.includes(oldString)) {
        return {
          success: false,
          error: "oldString not found in file.",
        };
      }

      const occurrences = content.split(oldString).length - 1;
      if (occurrences > 1 && !replaceAll) {
        return {
          success: false,
          error: `oldString found ${occurrences} times. Set replaceAll=true or provide a more specific oldString.`,
        };
      }

      const matchIndex = content.indexOf(oldString);
      const detectedStartLine = content.slice(0, matchIndex).split("\n").length;

      const newContent = replaceAll
        ? content.replaceAll(oldString, newString)
        : content.replace(oldString, newString);

      await sandbox.writeFile(absolutePath, newContent, "utf-8");

      return {
        success: true,
        path: toDisplayPath(absolutePath, workingDirectory),
        replacements: replaceAll ? occurrences : 1,
        startLine: detectedStartLine,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  },
});

const bashTool = tool({
  description: `Execute a non-interactive bash command in the sandbox.

USAGE:
- Runs with a 120 second timeout by default
- Use detached=true for long-running background commands
- Use cwd for workspace-relative subdirectories`,
  inputSchema: z.object({
    command: z.string().describe("Bash command to execute"),
    cwd: z.string().optional().describe("Workspace-relative working directory"),
    detached: z.boolean().optional().describe("Run command in the background"),
  }),
  execute: async ({ command, cwd, detached }, { experimental_context }) => {
    const sandboxId = getSandboxId(experimental_context, "bash");
    const sandbox = await getConnectedSandbox(sandboxId);
    const workingDirectory = sandbox.workingDirectory;

    try {
      const workingDir = cwd
        ? resolveWorkspacePath(cwd, workingDirectory)
        : workingDirectory;

      if (detached) {
        if (!sandbox.execDetached) {
          return {
            success: false,
            exitCode: null,
            stdout: "",
            stderr: "Detached execution is not supported by this sandbox.",
          };
        }

        const { commandId } = await sandbox.execDetached(command, workingDir);
        return {
          success: true,
          exitCode: null,
          stdout: `Process started in background (command ID: ${commandId}).`,
          stderr: "",
        };
      }

      const result = await sandbox.exec(command, workingDir, BASH_TIMEOUT_MS);
      return {
        success: result.success,
        exitCode: result.exitCode,
        stdout: result.stdout,
        stderr: result.stderr,
        ...(result.truncated && { truncated: true }),
      };
    } catch (error) {
      return {
        success: false,
        exitCode: null,
        stdout: "",
        stderr: error instanceof Error ? error.message : String(error),
      };
    }
  },
});

const durableAgentTools = {
  read: readTool,
  write: writeTool,
  edit: editTool,
  bash: bashTool,
} satisfies ToolSet;

export type DurableAgentTools = typeof durableAgentTools;

export interface CreateDurableAgentOptions {
  model?: DurableAgentOptions["model"];
  maxSteps?: number;
  systemPrompt?: BuildSystemPromptOptions;
  durableOptions?: Omit<DurableAgentOptions, "model" | "tools" | "system">;
}

export type CreateDurableAgentStreamOptions = Omit<
  DurableAgentStreamOptions<DurableAgentTools>,
  "experimental_context"
>;

export interface SandboxBoundDurableAgent {
  agent: DurableAgent<DurableAgentTools>;
  stream: (
    options: CreateDurableAgentStreamOptions,
  ) => Promise<DurableAgentStreamResult<DurableAgentTools>>;
}

export const defaultDurableAgentModel = "anthropic/claude-haiku-4.5";

export function createDurableAgent(
  sandboxId: string,
  options: CreateDurableAgentOptions = {},
): SandboxBoundDurableAgent {
  const systemPromptOptions: BuildSystemPromptOptions = {
    selectedTools: ["read", "bash", "edit", "write"],
    ...options.systemPrompt,
  };

  const agent = new DurableAgent<DurableAgentTools>({
    model: options.model ?? defaultDurableAgentModel,
    tools: durableAgentTools,
    system: buildSystemPrompt(systemPromptOptions),
    ...options.durableOptions,
  });

  return {
    agent,
    stream: (streamOptions) =>
      agent.stream({
        ...streamOptions,
        maxSteps:
          streamOptions.maxSteps ?? options.maxSteps ?? DEFAULT_MAX_STEPS,
        experimental_context: { sandboxId },
      }),
  };
}
