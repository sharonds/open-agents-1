import { getRun } from "workflow/api";
import type { WebAgentUIMessage } from "@/app/types";
import {
  getChatById,
  getSessionById,
  updateChatActiveStreamId,
  updateChatAssistantActivity,
  upsertChatMessageScoped,
} from "@/lib/db/sessions";
import { getServerSession } from "@/lib/session/get-server-session";

type RouteContext = {
  params: Promise<{ chatId: string }>;
};

type StopWorkflowRequestBody = {
  assistantMessage?: WebAgentUIMessage;
};

export async function POST(request: Request, context: RouteContext) {
  const session = await getServerSession();
  if (!session?.user) {
    return Response.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { chatId } = await context.params;
  const chat = await getChatById(chatId);
  if (!chat) {
    return Response.json({ error: "Chat not found" }, { status: 404 });
  }

  const sessionRecord = await getSessionById(chat.sessionId);
  if (!sessionRecord || sessionRecord.userId !== session.user.id) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  let body: StopWorkflowRequestBody = {};
  try {
    body = (await request.json()) as StopWorkflowRequestBody;
  } catch {
    body = {};
  }

  if (
    body.assistantMessage !== undefined &&
    !isAssistantMessage(body.assistantMessage)
  ) {
    return Response.json(
      { error: "assistantMessage must be an assistant UI message" },
      { status: 400 },
    );
  }

  if (body.assistantMessage) {
    await persistAssistantSnapshot(chatId, body.assistantMessage);
  }

  if (!chat.activeStreamId) {
    return Response.json({ status: "idle" });
  }

  if (!isWorkflowRunId(chat.activeStreamId)) {
    await updateChatActiveStreamId(chatId, null);
    return Response.json({ status: "idle" });
  }

  try {
    await getRun(chat.activeStreamId).cancel();
    return Response.json({ status: "cancelled" });
  } catch {
    return Response.json(
      { error: "Failed to cancel workflow run" },
      { status: 500 },
    );
  }
}

async function persistAssistantSnapshot(
  chatId: string,
  assistantMessage: WebAgentUIMessage,
) {
  const upsertResult = await upsertChatMessageScoped({
    id: assistantMessage.id,
    chatId,
    role: "assistant",
    parts: assistantMessage,
  });

  if (upsertResult.status === "inserted") {
    await updateChatAssistantActivity(chatId, new Date());
  }
}

function isWorkflowRunId(value: string) {
  return value.startsWith("wrun_");
}

function isAssistantMessage(value: unknown): value is WebAgentUIMessage {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  if (!("id" in value) || typeof value.id !== "string") {
    return false;
  }

  if (!("role" in value) || value.role !== "assistant") {
    return false;
  }

  if (!("parts" in value) || !Array.isArray(value.parts)) {
    return false;
  }

  return true;
}
