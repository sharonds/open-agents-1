import { APIClient } from "@vercel/sandbox/dist/api-client";
import { getCredentials } from "@vercel/sandbox/dist/utils/get-credentials";
import type { ExecResult } from "../interface";

const NON_RECONNECTABLE_ERROR_PREFIXES = [
  "ENOENT:",
  "Failed to create directory:",
  "Failed to read file:",
  "Background command exited with code",
  "Detached execution is not supported by this sandbox",
] as const;

/** Re-fetch credentials after this interval to handle token rotation. */
const API_CLIENT_TTL_MS = 30 * 60 * 1000; // 30 minutes

let sharedApiClientPromise: Promise<APIClient | null> | null = null;
let sharedApiClientCreatedAt = 0;

function isDirectSandboxConnectionDisabled(): boolean {
  return process.env.OPEN_HARNESS_SANDBOX_REST === "0";
}

export async function getSharedApiClient(): Promise<APIClient | null> {
  if (isDirectSandboxConnectionDisabled()) {
    return null;
  }

  if (
    sharedApiClientPromise &&
    Date.now() - sharedApiClientCreatedAt > API_CLIENT_TTL_MS
  ) {
    sharedApiClientPromise = null;
  }

  if (!sharedApiClientPromise) {
    sharedApiClientCreatedAt = Date.now();
    sharedApiClientPromise = (async () => {
      try {
        const credentials = await getCredentials();
        return new APIClient({
          teamId: credentials.teamId,
          token: credentials.token,
        });
      } catch {
        return null;
      }
    })();
  }

  return sharedApiClientPromise;
}

function isSandboxUnavailableMessage(message: string): boolean {
  const normalized = message.toLowerCase();
  return (
    normalized.includes("expected a stream of command data") ||
    normalized.includes("status code 404") ||
    normalized.includes("status code 410") ||
    (normalized.includes("sandbox") && normalized.includes("not found")) ||
    (normalized.includes("sandbox") && normalized.includes("stopped")) ||
    (normalized.includes("session") && normalized.includes("not found")) ||
    (normalized.includes("session") && normalized.includes("stopped"))
  );
}

export function shouldReconnectAfterDirectError(error: unknown): boolean {
  if (!(error instanceof Error)) {
    return true;
  }

  if (
    NON_RECONNECTABLE_ERROR_PREFIXES.some((prefix) =>
      error.message.startsWith(prefix),
    )
  ) {
    return false;
  }

  return true;
}

export function shouldReconnectAfterExecResult(result: ExecResult): boolean {
  if (result.success) {
    return false;
  }

  const combinedOutput = `${result.stderr}\n${result.stdout}`.trim();
  if (!combinedOutput) {
    return false;
  }

  return isSandboxUnavailableMessage(combinedOutput);
}
