import { beforeEach, describe, expect, mock, test } from "bun:test";

interface TestSessionRecord {
  userId: string;
}

interface TestChatRecord {
  sessionId: string;
  activeStreamId: string | null;
}

let sessionRecord: TestSessionRecord | null;
let chatRecord: TestChatRecord | null;
const cancelledRuns: string[] = [];
const clearedLegacyRuns: Array<string | null> = [];
const assistantUpserts: Array<Record<string, unknown>> = [];

mock.module("workflow/api", () => ({
  getRun: (runId: string) => ({
    cancel: async () => {
      cancelledRuns.push(runId);
    },
  }),
}));

mock.module("@/lib/db/sessions", () => ({
  getChatById: async () => chatRecord,
  getSessionById: async () => sessionRecord,
  updateChatAssistantActivity: async () => {},
  updateChatActiveStreamId: async (
    _chatId: string,
    streamId: string | null,
  ) => {
    clearedLegacyRuns.push(streamId);
  },
  upsertChatMessageScoped: async (value: Record<string, unknown>) => {
    assistantUpserts.push(value);
    return { status: "inserted" as const };
  },
}));

mock.module("@/lib/session/get-server-session", () => ({
  getServerSession: async () => ({
    user: { id: "user-1" },
  }),
}));

const routeModulePromise = import("./route");

describe("/api/chat/[chatId]/stop", () => {
  beforeEach(() => {
    sessionRecord = { userId: "user-1" };
    chatRecord = {
      sessionId: "session-1",
      activeStreamId: "wrun_active",
    };
    cancelledRuns.length = 0;
    clearedLegacyRuns.length = 0;
    assistantUpserts.length = 0;
  });

  test("persists the latest assistant snapshot before cancelling the workflow", async () => {
    const { POST } = await routeModulePromise;
    const response = await POST(
      new Request("http://localhost/api/chat/chat-1/stop", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          assistantMessage: {
            id: "assistant-1",
            role: "assistant",
            parts: [{ type: "text", text: "Working..." }],
          },
        }),
      }),
      { params: Promise.resolve({ chatId: "chat-1" }) },
    );

    expect(response.ok).toBe(true);
    expect(cancelledRuns).toEqual(["wrun_active"]);
    expect(assistantUpserts).toHaveLength(1);
    expect(assistantUpserts[0]).toMatchObject({
      id: "assistant-1",
      chatId: "chat-1",
      role: "assistant",
    });
  });

  test("clears legacy activeStreamId values without cancelling a workflow", async () => {
    chatRecord = {
      sessionId: "session-1",
      activeStreamId: "1680000000:legacy-token",
    };

    const { POST } = await routeModulePromise;
    const response = await POST(
      new Request("http://localhost/api/chat/chat-1/stop", {
        method: "POST",
      }),
      { params: Promise.resolve({ chatId: "chat-1" }) },
    );

    expect(response.ok).toBe(true);
    expect(cancelledRuns).toHaveLength(0);
    expect(clearedLegacyRuns).toEqual([null]);
  });
});
