/**
 * Checks archived sessions whose stored PR status is still "open" against GitHub.
 *
 * Dry run by default. Pass --write to persist any resolved statuses.
 *
 * Usage:
 *   bun run --cwd apps/web scripts/sync-archived-open-pr-statuses.ts
 *   bun run --cwd apps/web scripts/sync-archived-open-pr-statuses.ts --write
 */

import { and, eq, isNotNull } from "drizzle-orm";
import { db } from "../lib/db/client";
import { sessions } from "../lib/db/schema";
import { updateSession } from "../lib/db/sessions";
import { getPullRequestStatus } from "../lib/github/client";
import { getRepoToken } from "../lib/github/get-repo-token";

type PullRequestStatus = "open" | "closed" | "merged";

type ArchivedSessionWithOpenPr = {
  id: string;
  userId: string;
  repoOwner: string;
  repoName: string;
  prNumber: number;
  prStatus: "open";
};

function printUsage(): void {
  console.log(
    "Usage: bun run --cwd apps/web scripts/sync-archived-open-pr-statuses.ts [--write] [--help]",
  );
  console.log("");
  console.log(
    "  --write  Persist any resolved PR statuses back to the database",
  );
  console.log("  --help   Show this help message");
}

function getRepoUrl(owner: string, repo: string): string {
  return `https://github.com/${owner}/${repo}`;
}

function formatSessionLabel(session: ArchivedSessionWithOpenPr): string {
  return `${session.id} (${session.repoOwner}/${session.repoName}#${session.prNumber})`;
}

async function getArchivedSessionsWithOpenPrs(): Promise<
  ArchivedSessionWithOpenPr[]
> {
  const rows = await db.query.sessions.findMany({
    where: and(
      eq(sessions.status, "archived"),
      eq(sessions.prStatus, "open"),
      isNotNull(sessions.repoOwner),
      isNotNull(sessions.repoName),
      isNotNull(sessions.prNumber),
    ),
    columns: {
      id: true,
      userId: true,
      repoOwner: true,
      repoName: true,
      prNumber: true,
      prStatus: true,
    },
  });

  return rows.flatMap((session) => {
    if (
      !session.repoOwner ||
      !session.repoName ||
      session.prNumber === null ||
      session.prStatus !== "open"
    ) {
      return [];
    }

    return [
      {
        id: session.id,
        userId: session.userId,
        repoOwner: session.repoOwner,
        repoName: session.repoName,
        prNumber: session.prNumber,
        prStatus: session.prStatus,
      },
    ];
  });
}

async function main(): Promise<void> {
  if (process.argv.includes("--help")) {
    printUsage();
    return;
  }

  const shouldWrite = process.argv.includes("--write");
  const tokenCache = new Map<string, Promise<string>>();
  const candidates = await getArchivedSessionsWithOpenPrs();

  if (candidates.length === 0) {
    console.log('No archived sessions with stored "open" PRs found.');
    return;
  }

  console.log(
    `Found ${candidates.length} archived sessions with stored "open" PRs.`,
  );
  console.log(
    shouldWrite
      ? "Write mode enabled: mismatched statuses will be persisted."
      : "Dry run mode: mismatched statuses will be reported only.",
  );

  let checkedCount = 0;
  let unchangedCount = 0;
  let mismatchedCount = 0;
  let updatedCount = 0;
  let errorCount = 0;

  for (const session of candidates) {
    const cacheKey = `${session.userId}:${session.repoOwner.toLowerCase()}`;
    let tokenPromise = tokenCache.get(cacheKey);

    if (!tokenPromise) {
      tokenPromise = getRepoToken(session.userId, session.repoOwner).then(
        (result) => result.token,
      );
      tokenCache.set(cacheKey, tokenPromise);
    }

    let token: string;
    try {
      token = await tokenPromise;
    } catch (error) {
      errorCount += 1;
      console.error(
        `[token] Failed to resolve a GitHub token for ${formatSessionLabel(session)}:`,
        error,
      );
      continue;
    }

    const statusResult = await getPullRequestStatus({
      repoUrl: getRepoUrl(session.repoOwner, session.repoName),
      prNumber: session.prNumber,
      token,
    });

    if (!statusResult.success || !statusResult.status) {
      errorCount += 1;
      console.error(
        `[check] Failed to fetch PR status for ${formatSessionLabel(session)}: ${statusResult.error ?? "Unknown error"}`,
      );
      continue;
    }

    checkedCount += 1;

    const actualStatus: PullRequestStatus = statusResult.status;
    if (actualStatus === session.prStatus) {
      unchangedCount += 1;
      continue;
    }

    mismatchedCount += 1;
    console.log(
      `[mismatch] ${formatSessionLabel(session)} stored=${session.prStatus} actual=${actualStatus}`,
    );

    if (!shouldWrite) {
      continue;
    }

    const updated = await updateSession(session.id, { prStatus: actualStatus });
    if (!updated) {
      errorCount += 1;
      console.error(`[update] Failed to update session ${session.id}`);
      continue;
    }

    updatedCount += 1;
  }

  console.log("");
  console.log("Summary:");
  console.log(`  candidates: ${candidates.length}`);
  console.log(`  checked: ${checkedCount}`);
  console.log(`  unchanged: ${unchangedCount}`);
  console.log(`  mismatched: ${mismatchedCount}`);
  console.log(`  updated: ${updatedCount}`);
  console.log(`  errors: ${errorCount}`);

  if (!shouldWrite && mismatchedCount > 0) {
    console.log("");
    console.log(
      "Re-run with --write to persist the actual PR statuses back to the database.",
    );
  }

  if (errorCount > 0) {
    process.exitCode = 1;
  }
}

void main().catch((error) => {
  console.error("Failed to sync archived open PR statuses:", error);
  process.exit(1);
});
