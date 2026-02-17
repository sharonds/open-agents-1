import type { LanguageModel } from "ai";

function normalizeProvider(provider: string): string {
  const normalized = provider.trim().toLowerCase();
  if (!normalized) return "default";
  const dot = normalized.indexOf(".");
  return dot > 0 ? normalized.slice(0, dot) : normalized;
}

/**
 * Extract the underlying provider name from a LanguageModel.
 *
 * Gateway models have `provider === "gateway"` and encode the real provider
 * in `modelId` (e.g. `"anthropic/claude-haiku-4.5"`). For direct provider
 * models the `provider` field already contains the provider name.
 */
export function getProvider(model: LanguageModel): string {
  if (typeof model === "string") {
    const slash = model.indexOf("/");
    return slash > 0
      ? normalizeProvider(model.slice(0, slash))
      : normalizeProvider(model);
  }

  if (model.provider === "gateway") {
    const slash = model.modelId.indexOf("/");
    return slash > 0
      ? normalizeProvider(model.modelId.slice(0, slash))
      : "default";
  }

  return normalizeProvider(model.provider);
}

/** Tool names shared across all providers. */
const commonTools = [
  "todo_write",
  "read",
  "write",
  "edit",
  "grep",
  "glob",
  "task",
  "ask_user_question",
  "skill",
] as const;

/**
 * Maps provider names to the set of tool keys that should be active.
 * Providers not listed here fall through to `default`.
 */
export const toolSets: Record<string, readonly string[]> = {
  anthropic: [...commonTools, "bash_anthropic"],
  default: [...commonTools, "bash"],
};
