import { describe, expect, test } from "bun:test";
import { reconcileOptimisticPostTurnPhase } from "./use-auto-commit-status";

describe("reconcileOptimisticPostTurnPhase", () => {
  test("clears optimistic auto-commit once git work is done when auto PR is disabled", () => {
    expect(
      reconcileOptimisticPostTurnPhase({
        autoCreatePrEnabled: false,
        sessionPostTurnPhase: null,
        optimisticPhase: "auto_commit",
        hasExistingPr: false,
        hasUncommittedChanges: false,
        hasUnpushedCommits: false,
      }),
    ).toBeNull();
  });

  test("advances optimistic auto-commit to auto-pr when commit finishes and PR creation is enabled", () => {
    expect(
      reconcileOptimisticPostTurnPhase({
        autoCreatePrEnabled: true,
        sessionPostTurnPhase: null,
        optimisticPhase: "auto_commit",
        hasExistingPr: false,
        hasUncommittedChanges: false,
        hasUnpushedCommits: false,
      }),
    ).toBe("auto_pr");
  });

  test("clears optimistic auto-pr once the PR appears", () => {
    expect(
      reconcileOptimisticPostTurnPhase({
        autoCreatePrEnabled: true,
        sessionPostTurnPhase: null,
        optimisticPhase: "auto_pr",
        hasExistingPr: true,
        hasUncommittedChanges: false,
        hasUnpushedCommits: false,
      }),
    ).toBeNull();
  });
});
