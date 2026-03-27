# Screencast Subagent — Implementation Spec

## Overview

A new `screencast` subagent type that records a narrated browser demo and returns a public URL. The parent agent invokes it like any subagent via the `task` tool. All intermediate work (browser automation, TTS synthesis, audio muxing, file cleanup) happens inside the subagent's context and never pollutes the parent conversation.

**Parent agent invocation:**
```
task(subagentType: "screencast", task: "Demo the new search feature", instructions: "...")
```

**Parent agent receives:**
```
"Screencast recorded and uploaded: https://xyz.blob.vercel-storage.com/demo-narrated.webm"
```

---

## Pipeline

```
┌─────────────────────────────────────────────────────────────────┐
│  Screencast Subagent (ToolLoopAgent)                            │
│                                                                 │
│  1. LLM plans the script (narration + browser actions)          │
│     ↓                                                           │
│  2. record_screencast tool                                      │
│     → agent-browser record start/stop                           │
│     → narrate() helper writes VTT                               │
│     → returns: { video: "demo.webm", vtt: "demo.vtt" }         │
│     ↓                                                           │
│  3. synthesize_voiceover tool                                   │
│     → parses VTT cues                                           │
│     → AI SDK generateSpeech + @ai-sdk/elevenlabs per cue       │
│     → returns: { audioSegments: ["cue_000.mp3", ...] }          │
│     ↓                                                           │
│  4. mux_audio tool                                              │
│     → ffmpeg adelay + amix + mux into video                     │
│     → returns: { output: "demo-narrated.webm" }                 │
│     ↓                                                           │
│  5. upload_blob tool                                            │
│     → @vercel/blob put()                                        │
│     → returns: { url: "https://..." }                           │
└─────────────────────────────────────────────────────────────────┘
```

Note: Step 1 isn't a tool — it's the subagent's LLM reasoning. The subagent decides what to demo, writes narration text, and plans the browser actions. Then it calls the tools in sequence.

---

## Files to create/modify

### New files

#### 1. `packages/agent/subagents/screencast.ts`

The subagent definition. Follows the exact pattern of `executor.ts`.

```ts
import type { LanguageModel } from "ai";
import { gateway, stepCountIs, ToolLoopAgent } from "ai";
import { z } from "zod";
import {
  recordScreencastTool,
  synthesizeVoiceoverTool,
  muxAudioTool,
  uploadBlobTool,
} from "./screencast-tools";
import { bashTool } from "../tools/bash";
import type { SandboxExecutionContext } from "../types";

const SCREENCAST_SYSTEM_PROMPT = `You are a screencast agent...`; // see below

const callOptionsSchema = z.object({
  task: z.string(),
  instructions: z.string(),
  sandbox: z.custom<SandboxExecutionContext["sandbox"]>(),
  model: z.custom<LanguageModel>(),
});

export type ScreencastCallOptions = z.infer<typeof callOptionsSchema>;

export const screencastSubagent = new ToolLoopAgent({
  model: gateway("anthropic/claude-haiku-4.5"),
  instructions: SCREENCAST_SYSTEM_PROMPT,
  tools: {
    bash: bashTool(),                          // for agent-browser commands
    record_screencast: recordScreencastTool(),  // step 2
    synthesize_voiceover: synthesizeVoiceoverTool(), // step 3
    mux_audio: muxAudioTool(),                 // step 4
    upload_blob: uploadBlobTool(),             // step 5
  },
  stopWhen: stepCountIs(50),  // more headroom than explorer/executor
  callOptionsSchema,
  prepareCall: ({ options, ...settings }) => {
    // same pattern as executor.ts
  },
});
```

**System prompt** — teaches the subagent the workflow:

```
You are a screencast agent that records narrated browser demos.

## Workflow

1. PLAN: Based on the task, plan a sequence of scenes. Each scene has:
   - Narration text (conversational, first-person, like an engineer demoing to a teammate)
   - Browser actions to perform (agent-browser commands)

2. RECORD: Call record_screencast with your planned scenes.
   The tool handles browser automation, VTT generation, and video recording.

3. SYNTHESIZE: Call synthesize_voiceover with the VTT path from step 2.
   The tool generates speech audio for each narration cue.

4. MUX: Call mux_audio with the video and audio paths.
   The tool combines them into a single narrated video.

5. UPLOAD: Call upload_blob with the final video path.
   The tool uploads to Vercel Blob and returns a public URL.

## Narration guidelines

- Conversational and direct: "Here I'm opening the settings page"
- First person: use "I"
- Explain the why, not just the what
- Point out what's interesting
- 2-5 seconds per cue
- Don't narrate selectors, refs, or waits

## Final response

Return the blob URL and a one-sentence summary of what the screencast shows.
```

#### 2. `packages/agent/subagents/screencast-tools.ts`

The 4 pipeline tools. Each is a pure function that takes structured input and returns structured output.

```ts
// --- record_screencast ---
// Input: { url: string, scenes: Array<{ narration: string, actions: string[] }> }
// Internally:
//   1. Writes the narrate() bash helper to a temp script
//   2. Runs agent-browser record start
//   3. For each scene: calls narrate(), then runs each action via sandbox.exec()
//   4. Flushes final cue, runs agent-browser record stop
// Output: { video: string, vtt: string }

export const recordScreencastTool = () => tool({
  description: "Record a browser screencast with synchronized narration script.",
  inputSchema: z.object({
    url: z.string().describe("Starting URL to record"),
    scenes: z.array(z.object({
      narration: z.string().describe("What to say during this scene"),
      actions: z.array(z.string()).describe("agent-browser commands to execute"),
    })),
    outputDir: z.string().optional().describe("Output directory (default: /tmp/screencast)"),
  }),
  execute: async ({ url, scenes, outputDir }, { experimental_context }) => {
    const sandbox = getSandbox(experimental_context);
    const dir = outputDir ?? "/tmp/screencast";
    // ... implementation: bash commands via sandbox.exec()
  },
});

// --- synthesize_voiceover ---
// Input: { vttPath: string }
// Internally:
//   1. Reads and parses VTT file
//   2. For each cue: calls generateSpeech via AI SDK + ElevenLabs
//   3. Writes audio segments to temp dir
// Output: { segments: string[], tmpDir: string }

export const synthesizeVoiceoverTool = () => tool({
  description: "Synthesize speech audio from a VTT narration script.",
  inputSchema: z.object({
    vttPath: z.string().describe("Path to the VTT file"),
  }),
  execute: async ({ vttPath }, { experimental_context }) => {
    const sandbox = getSandbox(experimental_context);
    // Read VTT via sandbox.readFile
    // Parse cues
    // For each cue: generateSpeech → write to sandbox
  },
});

// --- mux_audio ---
// Input: { videoPath: string, vttPath: string, segments: string[] }
// Internally:
//   1. Resolves ffmpeg binary
//   2. Runs adelay + amix to assemble timed audio track
//   3. Muxes audio into video with -c:v copy -c:a libopus
// Output: { output: string }

export const muxAudioTool = () => tool({
  description: "Mux synthesized audio segments into a video file.",
  inputSchema: z.object({
    videoPath: z.string(),
    vttPath: z.string().describe("VTT file for timestamp info"),
    segments: z.array(z.string()).describe("Paths to audio segment files"),
  }),
  execute: async ({ videoPath, vttPath, segments }, { experimental_context }) => {
    const sandbox = getSandbox(experimental_context);
    // ffmpeg via sandbox.exec
  },
});

// --- upload_blob ---
// Input: { filePath: string, filename?: string }
// Internally:
//   1. Reads file from sandbox
//   2. Uploads via @vercel/blob put()
// Output: { url: string }

export const uploadBlobTool = () => tool({
  description: "Upload a file to Vercel Blob storage and return the public URL.",
  inputSchema: z.object({
    filePath: z.string().describe("Path to the file to upload"),
    filename: z.string().optional().describe("Filename for the blob (default: basename of filePath)"),
  }),
  execute: async ({ filePath, filename }, { experimental_context }) => {
    const sandbox = getSandbox(experimental_context);
    // Read file, upload via @vercel/blob
  },
});
```

### Modified files

#### 3. `packages/agent/subagents/index.ts`

```ts
export { explorerSubagent, type ExplorerCallOptions } from "./explorer";
export { executorSubagent, type ExecutorCallOptions } from "./executor";
export { screencastSubagent, type ScreencastCallOptions } from "./screencast";  // ← add
export type { SubagentMessageMetadata, SubagentUIMessage } from "./types";
```

#### 4. `packages/agent/subagents/types.ts`

```ts
import type { InferAgentUIMessage, LanguageModelUsage } from "ai";
import type { executorSubagent } from "./executor";
import type { explorerSubagent } from "./explorer";
import type { screencastSubagent } from "./screencast";  // ← add

export type SubagentMessageMetadata = {
  lastStepUsage?: LanguageModelUsage;
  totalMessageUsage?: LanguageModelUsage;
  modelId?: string;
};

export type SubagentUIMessage =
  | InferAgentUIMessage<typeof explorerSubagent, SubagentMessageMetadata>
  | InferAgentUIMessage<typeof executorSubagent, SubagentMessageMetadata>
  | InferAgentUIMessage<typeof screencastSubagent, SubagentMessageMetadata>;  // ← add
```

#### 5. `packages/agent/tools/task.ts`

Two changes:

```ts
// 1. Extend the enum
const subagentTypeSchema = z.enum(["explorer", "executor", "screencast"]);  // ← add

// 2. Update dispatch (around line 108-110)
import { screencastSubagent } from "../subagents/screencast";  // ← add

const subagent =
  subagentType === "explorer"
    ? explorerSubagent
    : subagentType === "screencast"
      ? screencastSubagent     // ← add
      : executorSubagent;
```

Also update the tool description string to document the new type:

```
3. **screencast** (RECORDING)
   - Use for: Recording narrated browser demos with voiceover
   - Tools: bash (agent-browser), record, synthesize, mux, upload
   - Produces a narrated WebM video uploaded to Vercel Blob
   - Returns: public blob URL
   - Best for: Feature demos, walkthroughs, visual documentation
```

#### 6. `packages/agent/system-prompt.ts`

Add screencast to the task tool description in the system prompt (the section that describes subagent types to the main agent).

#### 7. `packages/agent/package.json`

```json
"dependencies": {
  "@vercel/blob": "...",     // ← add
  "ffmpeg-static": "..."     // ← add (or resolve dynamically)
}
```

Note: `ai` and `@ai-sdk/elevenlabs` are already project dependencies.

---

## Design decisions

### Why separate tools instead of one big pipeline function?

1. **Observability** — the parent agent sees tool call progress updates (via the streaming `yield` in task.ts): "recording...", "synthesizing...", "muxing...", "uploading..."
2. **Retry granularity** — if TTS fails on cue 3, the subagent can retry just that step without re-recording the video
3. **Flexibility** — the subagent can skip `synthesize` + `mux` if there's no ElevenLabs key and just upload the silent video + VTT
4. **The subagent is an LLM** — it can make decisions between steps (e.g., "the recording was too short, let me re-record with more pauses")

### ffmpeg resolution

Rather than adding `ffmpeg-static` as a package dependency (80MB binary), the `mux_audio` tool should:
1. Check if `ffmpeg` is on PATH
2. Check known locations (`node_modules/ffmpeg-static/ffmpeg`)
3. If not found, install it to a temp location via `bun add ffmpeg-static`

This keeps the package lean and handles environments where ffmpeg is pre-installed.

### Blob upload authentication

`@vercel/blob` uses `BLOB_READ_WRITE_TOKEN` env var. The `upload_blob` tool should:
- Check for the token before attempting upload
- If no token, skip upload and return the local file path instead
- The subagent includes both the URL (if uploaded) and the local path in its response

### Graceful degradation

If `ELEVENLABS_API_KEY` is not set:
- `synthesize_voiceover` returns an error
- The subagent skips steps 3-4 and uploads the silent video + VTT
- The parent still gets a useful screencast, just without audio

---

## What the parent agent sees

The `toModelOutput` function in `task.ts` already extracts the last assistant text from the subagent. So the parent agent's context will contain something like:

```
**Summary**: Recorded a 15-second narrated screencast demoing the new search feature.
Navigated to the dashboard, demonstrated real-time search, and showed result navigation.

**Answer**: Screencast uploaded: https://xyz.blob.vercel-storage.com/demo-search-narrated.webm
```

No VTT contents, no ffmpeg output, no TTS logs — just the URL and summary.

---

## Open questions

1. **Model choice for the screencast subagent** — Should it use haiku (fast/cheap, same as other subagents) or a larger model (better at planning natural narration scripts)?

2. **Max steps** — Explorer/executor use `stepCountIs(100)`. The screencast pipeline is ~5 tool calls but may need more if it re-records or retries TTS. Suggest `stepCountIs(50)`.

3. **VTT as output too?** — Should the subagent also upload the VTT file alongside the video? Useful for subtitles on a web player.

4. **Existing skill docs** — The `references/narrated-recording.md` and `templates/` we already added become internal implementation details of the subagent. We could keep them as reference docs (useful if someone wants to do it manually) or remove them to avoid confusion.
