import { sumLanguageModelUsage } from "@open-harness/agent";
import {
  convertToModelMessages,
  type FinishReason,
  type LanguageModelUsage,
  type ModelMessage,
  type UIMessageChunk,
} from "ai";
import { getWorkflowMetadata, getWritable } from "workflow";
import { webAgent } from "@/app/config";
import type { WebAgentUIMessage } from "@/app/types";
import { shouldContinueWorkflowAfterStep } from "@/lib/chat/should-auto-submit";
import {
  getLatestAssistantMessage,
  getResponseMessageId,
  getSandboxState,
  type RunAgentWorkflowOptions,
  type RunAgentWorkflowResult,
  resolveStepContext,
  type StepContext,
  withLatestAssistantMessage,
} from "./run-agent-context";
import {
  closeStream,
  finalizeRun,
  isAbortError,
  sendFinish,
  sendStart,
  startStopMonitor,
} from "./run-agent-finalize";

export type { RunAgentWorkflowResult } from "./run-agent-context";

const MAX_AGENT_ITERATIONS = 200;

type Writable = WritableStream<UIMessageChunk>;

interface RunAgentStepResult {
  responseMessages: ModelMessage[];
  finishReason: FinishReason;
  assistantMessage?: WebAgentUIMessage;
  stepWasAborted: boolean;
  usage?: LanguageModelUsage;
  mainModelId: string;
  context?: StepContext;
}

export async function runAgent(
  messages: WebAgentUIMessage[],
  options: RunAgentWorkflowOptions,
  maxIterations = MAX_AGENT_ITERATIONS,
): Promise<RunAgentWorkflowResult> {
  "use workflow";

  const { workflowRunId } = getWorkflowMetadata();
  const writable = getWritable<UIMessageChunk>();
  const responseMessageId = getResponseMessageId(messages, workflowRunId);

  let modelMessages = await toModelMessages(messages);
  let latestAssistantMessage = getLatestAssistantMessage(messages);
  let totalUsage: LanguageModelUsage | undefined;
  let latestContext: StepContext | undefined;
  let mainModelId = "anthropic/claude-haiku-4.5";
  let wasAborted = false;
  let completedNaturally = false;

  await sendStart(writable, responseMessageId);

  for (let iteration = 0; iteration < maxIterations; iteration += 1) {
    const stepResult = await runAgentStep(
      modelMessages,
      messages,
      latestAssistantMessage,
      writable,
      options,
      workflowRunId,
      responseMessageId,
    );

    latestAssistantMessage =
      stepResult.assistantMessage ?? latestAssistantMessage;
    totalUsage = sumLanguageModelUsage(totalUsage, stepResult.usage);
    latestContext = stepResult.context ?? latestContext;
    mainModelId = stepResult.mainModelId;
    wasAborted = wasAborted || stepResult.stepWasAborted;
    modelMessages = [...modelMessages, ...stepResult.responseMessages];

    if (
      !shouldContinueWorkflowAfterStep(
        stepResult.finishReason,
        stepResult.assistantMessage,
      )
    ) {
      completedNaturally =
        !stepResult.stepWasAborted && stepResult.finishReason !== "tool-calls";
      break;
    }
  }

  const stillOwnsRun = await finalizeRun({
    options,
    workflowRunId,
    latestAssistantMessage,
    latestSandboxState: latestContext
      ? getSandboxState(latestContext.sandbox)
      : undefined,
    totalUsage,
    mainModelId,
    wasAborted,
  });

  await sendFinish(writable);
  await closeStream(writable);

  return {
    wasAborted,
    completedNaturally,
    stillOwnsRun,
  };
}

async function toModelMessages(messages: WebAgentUIMessage[]) {
  "use step";

  return convertToModelMessages(messages, {
    ignoreIncompleteToolCalls: true,
    tools: webAgent.tools,
  });
}

async function runAgentStep(
  messages: ModelMessage[],
  originalMessages: WebAgentUIMessage[],
  latestAssistantMessage: WebAgentUIMessage | undefined,
  writable: Writable,
  options: RunAgentWorkflowOptions,
  workflowRunId: string,
  responseMessageId: string,
): Promise<RunAgentStepResult> {
  "use step";

  const abortController = new AbortController();
  const stopMonitor = startStopMonitor(workflowRunId, abortController);

  try {
    const context = await resolveStepContext(options, originalMessages);

    const result = await webAgent.stream({
      messages,
      options: {
        sandbox: context.sandbox,
        model: context.model,
        subagentModel: context.subagentModel,
        context: context.compactionContext,
        approval: {
          type: "interactive",
          autoApprove: "all",
          sessionRules: [],
        },
        type: "durable",
        ...(context.skills && context.skills.length > 0
          ? { skills: context.skills }
          : {}),
      },
      abortSignal: abortController.signal,
    });

    const streamOriginalMessages = withLatestAssistantMessage(
      originalMessages,
      latestAssistantMessage,
    );
    let assistantMessage: WebAgentUIMessage | undefined;
    let lastStepUsage: LanguageModelUsage | undefined;
    let stepUsage: LanguageModelUsage | undefined;

    const stream = result.toUIMessageStream<WebAgentUIMessage>({
      sendStart: false,
      sendFinish: false,
      originalMessages: streamOriginalMessages,
      generateMessageId: () => responseMessageId,
      messageMetadata: ({ part }) => {
        if (part.type === "finish-step") {
          lastStepUsage = part.usage;
          return { lastStepUsage, totalMessageUsage: undefined };
        }

        if (part.type === "finish") {
          stepUsage = part.totalUsage;
          return { lastStepUsage, totalMessageUsage: part.totalUsage };
        }

        return undefined;
      },
      onFinish: ({ responseMessage }) => {
        assistantMessage = responseMessage;
      },
    });

    const reader = stream.getReader();
    const writer = writable.getWriter();

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) {
          break;
        }
        await writer.write(value);
      }
    } finally {
      reader.releaseLock();
      writer.releaseLock();
    }

    const [response, finishReason, resultUsage] = await Promise.all([
      result.response,
      result.finishReason,
      result.usage,
    ]);

    return {
      responseMessages: response.messages,
      finishReason,
      assistantMessage,
      stepWasAborted: false,
      usage: stepUsage ?? resultUsage,
      mainModelId: context.mainModelId,
      context,
    };
  } catch (error) {
    if (isAbortError(error)) {
      return {
        responseMessages: [],
        finishReason: "stop",
        assistantMessage: undefined,
        stepWasAborted: true,
        mainModelId: "anthropic/claude-haiku-4.5",
      };
    }

    throw error;
  } finally {
    stopMonitor.stop();
    await stopMonitor.done;
  }
}
