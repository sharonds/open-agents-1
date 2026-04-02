Summary: Replace hardcoded subagent types with one generic subagent runtime plus configurable profiles stored in user settings. Keep a built-in `explore` profile for parity, let custom profiles define model/skills/tools/prompt, and keep subagent output fixed to a short text summary.

Context: Key findings from exploration -- existing patterns, relevant files, constraints

- The current delegation path is hardcoded around `explorer` / `executor` / `design` in `packages/agent/tools/task.ts`, `packages/agent/subagents/registry.ts`, and the individual subagent files under `packages/agent/subagents/`.
- The main system prompt also hardcodes the available subagents via `buildSubagentSummaryLines()` inside `packages/agent/system-prompt.ts`, so both tool description and prompt generation need to become runtime-driven.
- The existing subagent prompts already have reusable shell fragments in `packages/agent/subagents/constants.ts`; those are the right place to keep the shared “one-shot / no questions / bounded / summary-only” rules.
- The `skill` tool reads available skills from `experimental_context.skills` in `packages/agent/tools/skill.ts`. Current subagents do not receive that context, so a generic subagent must pass sandbox + model + discovered skills into its own runtime context.
- The main agent already discovers available skills before each turn and passes them into `OpenHarnessAgentCallOptions` from `apps/web/app/api/chat/route.ts`, using runtime discovery from `apps/web/app/api/chat/_lib/runtime.ts`.
- User settings already persist related agent configuration in `apps/web/lib/db/user-preferences.ts`, expose it through `apps/web/app/api/settings/preferences/route.ts`, and edit it in `apps/web/app/settings/preferences-section.tsx`, so subagent profiles fit naturally into the same preferences flow.
- The repo uses Bun (`bun.lock`) and the documented verification commands in `AGENTS.md` / `package.json` are `bun run ci` plus any focused test runs needed while iterating.

Approach: High-level design decision and why

- Keep the `task` tool as the delegation surface, but switch it from a compile-time subagent registry to runtime-resolved profiles.
- Introduce a generic subagent shell in `packages/agent` that:
  - accepts a resolved profile
  - exposes only that profile’s allowed tools (plus the `skill` tool when skills are configured)
  - injects a stronger shell prompt that requires loading configured skills before substantive work
  - always returns a plain text summary
- Ship one built-in profile, `explore`, defined in code for parity with the current explorer behavior.
- Store custom profiles in user preferences as JSON; merge built-in profiles + user-defined profiles at runtime when building the main agent prompt and when resolving `task` tool calls.
- Keep the MVP simple by letting the model invoke configured skills itself rather than forcing preload in `prepareStep`. Add telemetry/tests so we can tighten this later if needed.
- Keep the existing `defaultSubagentModelId` preference temporarily as compatibility/defaulting support (for the built-in explore profile and profile creation UX) rather than trying to remove it in the same change.

Changes:
- `packages/agent/subagents/constants.ts`
  - tighten the shared shell rules for generic subagents
  - replace the old “Summary + Answer” requirement with a summary-only final response contract
  - keep reusable fragments for no-questions, completion, validation, and working-directory context
- `packages/agent/subagents/explorer.ts`
  - stop treating this file as a standalone hardcoded agent
  - extract/reuse its read-only instructions and tool policy as the built-in `explore` profile definition so behavior stays close to today
- `packages/agent/subagents/registry.ts`
  - replace the hardcoded agent registry with built-in profile metadata/helpers (initially just `explore`)
  - expose helpers for merging built-ins with runtime-provided custom profiles and for rendering profile summary lines
- `packages/agent/subagents/types.ts`
  - replace the union of hardcoded explorer/executor/design UI message types with the generic subagent’s UI message type
- `packages/agent/types.ts`
  - extend `AgentContext` / related runtime types to carry resolved subagent profiles alongside sandbox/model/skills
- `packages/agent/open-harness-agent.ts`
  - extend `OpenHarnessAgentCallOptions` to accept runtime subagent profiles
  - pass profiles into `buildSystemPrompt(...)`
  - include profiles in `experimental_context` so the `task` tool can resolve them dynamically
- `packages/agent/system-prompt.ts`
  - remove the compile-time subagent list from the core prompt assembly path
  - build the delegation section from the runtime profile list so the main agent only advertises built-in `explore` plus the user’s configured custom profiles
- `packages/agent/tools/task.ts`
  - change the task input from hardcoded enum-backed subagent types to a profile id/string resolved at execution time
  - validate the requested profile against runtime-provided profiles
  - launch the new generic subagent shell instead of selecting from `SUBAGENT_REGISTRY`
  - preserve the current parent-facing behavior: concise streamed progress + final text summary only
- `packages/agent/tools/skill.ts`
  - likely no behavior change, but verify/test the generic subagent path so configured skills are visible and invocable from subagent context
- `packages/agent/tools/tools.test.ts`
  - replace hardcoded explorer/executor assertions with dynamic profile assertions
  - cover built-in `explore`, custom profile resolution, and invalid-profile rejection
- `apps/web/lib/db/schema.ts`
  - add a JSONB `subagentProfiles` field to user preferences (shape: id/name/model/customPrompt/skills/allowedTools)
- `apps/web/lib/db/migrations/*`
  - add the Drizzle migration for the new `subagent_profiles` user preference column
- `apps/web/lib/db/user-preferences.ts`
  - define/normalize the stored subagent profile data
  - merge persisted profiles with defaults returned to the client/runtime
  - keep `defaultSubagentModelId` working during the transition
- `apps/web/app/api/settings/preferences/route.ts`
  - accept, validate, and return `subagentProfiles`
- `apps/web/hooks/use-user-preferences.ts`
  - extend the client preference types to include `subagentProfiles`
- `apps/web/app/settings/preferences-section.tsx`
  - add custom subagent profile management UI (name, model, custom instructions, skills picker, allowed-tools multi-select)
  - keep the built-in `explore` visible but not removable
  - if this starts to bloat, extract the profile editor into a colocated child component rather than growing the page component further
- `apps/web/app/api/chat/route.ts`
  - pass the resolved profile list into `agentOptions` so the main agent and `task` tool use the same runtime configuration
  - continue passing discovered skills so subagents can invoke their configured skills
- `apps/web/app/api/chat/route.test.ts`
  - add coverage that user-configured profiles flow into agent options and do not break existing chat startup behavior
- `apps/web/app/api/settings/preferences/route.test.ts`
  - add coverage for validating and persisting `subagentProfiles`

Verification:
- Focused tests while iterating:
  - `bun run test:verbose packages/agent/tools/tools.test.ts`
  - `bun run test:verbose apps/web/app/api/settings/preferences/route.test.ts`
  - `bun run test:verbose apps/web/app/api/chat/route.test.ts`
- Full repo verification after implementation:
  - `bun run ci`
- End-to-end behaviors to confirm:
  - with no custom profiles, the main agent advertises only built-in `explore`
  - the built-in `explore` profile remains read-only and behaves like the current explorer path
  - custom profiles appear in the task description/prompt and can be selected by id
  - configured skills are available to the subagent and can be loaded before task work
  - profiles with restricted tool sets cannot access disabled tools
  - subagent final output is always a short text summary, not structured multi-section output
  - invalid or deleted custom profile ids fail clearly instead of silently falling back
