import { beforeEach, describe, expect, mock, spyOn, test } from "bun:test";

let getAccessTokenResult: { accessToken?: string | null } | null;
let getAccessTokenError: Error | null;

const getAccessTokenSpy = mock(
  async (_input: {
    body: { providerId: string; userId: string };
    headers: Headers;
  }) => {
    if (getAccessTokenError) {
      throw getAccessTokenError;
    }

    return getAccessTokenResult;
  },
);

mock.module("server-only", () => ({}));

mock.module("next/headers", () => ({
  headers: async () => new Headers(),
}));

mock.module("@/lib/auth/config", () => ({
  auth: {
    api: {
      getAccessToken: getAccessTokenSpy,
    },
  },
}));

mock.module("@/lib/db/client", () => ({
  db: {},
}));

mock.module("@/lib/db/schema", () => ({
  accounts: {},
}));

const tokenModulePromise = import("./token");

describe("getUserVercelToken", () => {
  beforeEach(() => {
    getAccessTokenSpy.mockClear();
    getAccessTokenResult = { accessToken: "vc_test" };
    getAccessTokenError = null;
  });

  test("returns the Vercel access token for the user", async () => {
    const { getUserVercelToken } = await tokenModulePromise;

    const token = await getUserVercelToken("user-1");

    expect(token).toBe("vc_test");
    expect(getAccessTokenSpy).toHaveBeenCalledTimes(1);
    expect(getAccessTokenSpy.mock.calls[0]?.[0]).toEqual({
      body: { providerId: "vercel", userId: "user-1" },
      headers: new Headers(),
    });
  });

  test("returns null when the access token is missing", async () => {
    const { getUserVercelToken } = await tokenModulePromise;
    getAccessTokenResult = { accessToken: null };

    const token = await getUserVercelToken("user-1");

    expect(token).toBeNull();
  });

  test("does not log when the Vercel account is not found", async () => {
    const { getUserVercelToken } = await tokenModulePromise;
    const consoleErrorSpy = spyOn(console, "error").mockImplementation(
      () => {},
    );
    getAccessTokenError = new Error("Account not found");

    const token = await getUserVercelToken("user-1");

    expect(token).toBeNull();
    expect(consoleErrorSpy).not.toHaveBeenCalled();
    consoleErrorSpy.mockRestore();
  });

  test("logs unexpected token lookup errors", async () => {
    const { getUserVercelToken } = await tokenModulePromise;
    const consoleErrorSpy = spyOn(console, "error").mockImplementation(
      () => {},
    );
    const error = new Error("boom");
    getAccessTokenError = error;

    const token = await getUserVercelToken("user-1");

    expect(token).toBeNull();
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      "Error fetching Vercel token:",
      error,
    );
    consoleErrorSpy.mockRestore();
  });
});
