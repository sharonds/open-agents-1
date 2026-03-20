import type { Source } from "../types";

/**
 * State configuration for creating, reconnecting, or restoring the current cloud sandbox provider.
 * Used with the unified `connectSandbox()` API.
 */
export interface VercelState {
  /** Where to clone from (omit for empty sandbox or when reconnecting/restoring) */
  source?: Source;
  /**
   * Sandbox name for reconnecting to the current long-lived sandbox.
   * Kept as `sandboxId` for backwards compatibility with existing app state.
   */
  sandboxId?: string;
  /**
   * Current session ID for optimistic direct REST operations.
   * Omit when reconnecting legacy state that predates the v2 migration.
   */
  sessionId?: string;
  /** Snapshot ID for restoring when the runtime VM has been snapshotted/stopped */
  snapshotId?: string;
  /** Timestamp (ms) when the sandbox expires */
  expiresAt?: number;
}
