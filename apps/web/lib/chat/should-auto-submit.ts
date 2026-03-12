import { type FinishReason, isToolUIPart } from "ai";
import type { WebAgentUIMessage } from "@/app/types";

/**
 * Unlike the AI SDK default, this also blocks auto-submit when a client-side
 * tool is still waiting in a non-terminal state such as `input-available`.
 */
export function shouldAutoSubmit(messages: WebAgentUIMessage[]): boolean {
  const lastMessage = messages[messages.length - 1];
  if (!lastMessage || lastMessage.role !== "assistant") {
    return false;
  }

  const lastStepStartIndex = lastMessage.parts.reduce(
    (lastIndex, part, index) =>
      part.type === "step-start" ? index : lastIndex,
    -1,
  );

  const lastStepToolInvocations = lastMessage.parts
    .slice(lastStepStartIndex + 1)
    .filter(isToolUIPart)
    .filter((part) => !part.providerExecuted);

  if (lastStepToolInvocations.length === 0) {
    return false;
  }

  return lastStepToolInvocations.every(
    (part) =>
      part.state === "output-available" ||
      part.state === "output-error" ||
      part.state === "approval-responded",
  );
}

export function shouldContinueWorkflowAfterStep(
  finishReason: FinishReason,
  assistantMessage: WebAgentUIMessage | undefined,
): boolean {
  if (finishReason !== "tool-calls") {
    return false;
  }

  if (!assistantMessage) {
    return true;
  }

  return shouldAutoSubmit([assistantMessage]);
}
