"use client";

import { useGitHubConnectionStatus } from "@/hooks/use-github-connection-status";
import { useSession } from "@/hooks/use-session";
import { GitHubReconnectDialog } from "./github-reconnect-dialog";

export function GitHubReconnectGate() {
  const { isAuthenticated, loading } = useSession();
  const { reconnectRequired, reason, isLoading } = useGitHubConnectionStatus({
    enabled: isAuthenticated,
  });

  if (loading || !isAuthenticated || isLoading || !reconnectRequired) {
    return null;
  }

  return <GitHubReconnectDialog open reason={reason} />;
}
