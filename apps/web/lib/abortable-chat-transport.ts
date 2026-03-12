import type { FetchFunction } from "@ai-sdk/provider-utils";
import { WorkflowChatTransport } from "@workflow/ai";
import type { UIMessage } from "ai";

/**
 * A workflow chat transport that can abort all active fetches, including
 * reconnect requests, without cancelling the server-side workflow run.
 */
export class AbortableChatTransport<
  UI_MESSAGE extends UIMessage = UIMessage,
> extends WorkflowChatTransport<UI_MESSAGE> {
  private state: { controller: AbortController };

  constructor(
    options: ConstructorParameters<typeof WorkflowChatTransport<UI_MESSAGE>>[0],
  ) {
    const state = { controller: new AbortController() };
    const outerFetch: FetchFunction = options?.fetch ?? globalThis.fetch;

    super({
      ...options,
      fetch: ((input: RequestInfo | URL, init?: RequestInit) =>
        outerFetch(input, {
          ...init,
          signal: init?.signal
            ? AbortSignal.any([state.controller.signal, init.signal])
            : state.controller.signal,
        })) as FetchFunction,
    });

    this.state = state;
  }

  abort(): void {
    this.state.controller.abort();
    this.state.controller = new AbortController();
  }
}
