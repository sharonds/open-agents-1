import { describe, expect, mock, test } from "bun:test";

mock.module("server-only", () => ({}));

const providerModulePromise = import("./provider");

describe("resolveAuthProviderFromProviderIds", () => {
  test("returns vercel when a Vercel account is linked", async () => {
    const { resolveAuthProviderFromProviderIds } = await providerModulePromise;

    expect(resolveAuthProviderFromProviderIds(["github", "vercel"])).toBe(
      "vercel",
    );
  });

  test("returns github for GitHub-only users", async () => {
    const { resolveAuthProviderFromProviderIds } = await providerModulePromise;

    expect(resolveAuthProviderFromProviderIds(["github"])).toBe("github");
  });

  test("falls back to github when no provider row is available", async () => {
    const { resolveAuthProviderFromProviderIds } = await providerModulePromise;

    expect(resolveAuthProviderFromProviderIds([])).toBe("github");
  });
});
