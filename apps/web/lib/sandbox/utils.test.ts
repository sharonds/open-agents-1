import { describe, expect, test } from "bun:test";
import { hasLegacyRuntimeSandboxState, hasRuntimeSandboxState } from "./utils";

describe("sandbox runtime state helpers", () => {
  test("treats persistent name-only state as resumable but not legacy runtime state", () => {
    const persistentState = {
      type: "vercel" as const,
      name: "session_session-1",
    };

    expect(hasRuntimeSandboxState(persistentState)).toBe(true);
    expect(hasLegacyRuntimeSandboxState(persistentState)).toBe(false);
  });

  test("keeps legacy sandboxId state marked as runtime state", () => {
    const legacyState = {
      type: "vercel" as const,
      sandboxId: "sandbox-1",
    };

    expect(hasRuntimeSandboxState(legacyState)).toBe(true);
    expect(hasLegacyRuntimeSandboxState(legacyState)).toBe(true);
  });
});
