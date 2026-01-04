# Deep Agent - AI SDK Coding Agent

## Commands
- `bun run dev` - Run CLI agent
- `bun run typecheck` - Type check
- `bun test` - Run all tests
- `bun test path/to/file.test.ts` - Run single test

## Architecture
- `src/agent/` - Core agent: deep-agent.ts (main), system-prompt.ts, types.ts
- `src/agent/tools/` - Tools: file-system, memory, planning, task-delegation
- `src/agent/sandbox/` - Sandbox execution, `src/agent/state/` - State management
- `src/cli/` - CLI entry point, `src/tui/` - Terminal UI with Ink/React
- `src/models.ts` - Model configuration using AI SDK

## Code Style
- Use Bun exclusively (not Node, npm, pnpm, vite, express, ws, dotenv)
- Testing: `import { test, expect } from "bun:test"`
- Prefer Bun APIs: `Bun.file`, `Bun.serve`, `bun:sqlite`, `Bun.$` for shell
- Use AI SDK patterns: tool definitions with Zod schemas
- TypeScript strict mode, Zod for runtime validation
- Dependencies: ai, @ai-sdk/anthropic, ink, zod
