import type { NextRequest } from "next/server";
import { connectSandbox } from "@open-harness/sandbox";
import {
  requireAuthenticatedUser,
  requireOwnedSessionWithSandboxGuard,
} from "@/app/api/sessions/_lib/session-context";
import { updateSession } from "@/lib/db/sessions";
import { buildHibernatedLifecycleUpdate } from "@/lib/sandbox/lifecycle";
import {
  clearUnavailableSandboxState,
  hasRuntimeSandboxState,
  isSandboxUnavailableError,
} from "@/lib/sandbox/utils";

export type ConflictFile = {
  path: string;
  contents: string;
};

export type ConflictsResponse = {
  files: ConflictFile[];
  baseBranch: string | null;
};

type RouteContext = {
  params: Promise<{ sessionId: string }>;
};

export async function GET(_req: NextRequest, context: RouteContext) {
  const authResult = await requireAuthenticatedUser();
  if (!authResult.ok) {
    return authResult.response;
  }

  const { sessionId } = await context.params;

  const sessionContext = await requireOwnedSessionWithSandboxGuard({
    userId: authResult.userId,
    sessionId,
    sandboxGuard: hasRuntimeSandboxState,
    sandboxErrorMessage: "Sandbox not initialized",
  });
  if (!sessionContext.ok) {
    return sessionContext.response;
  }

  const { sessionRecord } = sessionContext;
  const sandboxState = sessionRecord.sandboxState;
  if (!sandboxState) {
    return Response.json({ error: "Sandbox not initialized" }, { status: 400 });
  }

  try {
    const sandbox = await connectSandbox(sandboxState);
    const cwd = sandbox.workingDirectory;

    // Check for merge conflict files using git
    const conflictResult = await sandbox.exec(
      "git diff --name-only --diff-filter=U",
      cwd,
      10000,
    );

    if (!conflictResult.success) {
      // No conflicts or not in a merge state
      return Response.json({
        files: [],
        baseBranch: null,
      } satisfies ConflictsResponse);
    }

    const conflictPaths = conflictResult.stdout
      .trim()
      .split("\n")
      .filter((line) => line.length > 0);

    if (conflictPaths.length === 0) {
      return Response.json({
        files: [],
        baseBranch: null,
      } satisfies ConflictsResponse);
    }

    // Read the contents of each conflict file
    const files: ConflictFile[] = [];
    for (const filePath of conflictPaths) {
      try {
        const fullPath = `${cwd}/${filePath}`;
        const contents = await sandbox.readFile(fullPath, "utf-8");
        files.push({ path: filePath, contents });
      } catch {
        // Skip files we can't read
      }
    }

    // Try to determine the base branch
    let baseBranch: string | null = null;
    const headResult = await sandbox.exec(
      "git rev-parse --abbrev-ref MERGE_HEAD 2>/dev/null || echo ''",
      cwd,
      5000,
    );
    if (headResult.success && headResult.stdout.trim()) {
      baseBranch = headResult.stdout.trim();
    }

    return Response.json({
      files,
      baseBranch,
    } satisfies ConflictsResponse);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (isSandboxUnavailableError(message)) {
      await updateSession(sessionId, {
        sandboxState: clearUnavailableSandboxState(
          sessionRecord.sandboxState,
          message,
        ),
        ...buildHibernatedLifecycleUpdate(),
      });
      return Response.json(
        { error: "Sandbox is unavailable. Please resume sandbox." },
        { status: 409 },
      );
    }

    console.error("Failed to get conflicts:", error);
    return Response.json(
      { error: "Failed to connect to sandbox" },
      { status: 500 },
    );
  }
}
