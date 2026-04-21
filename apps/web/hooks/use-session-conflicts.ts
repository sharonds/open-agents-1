"use client";

import useSWR from "swr";
import { fetcher } from "@/lib/swr";
import type {
  ConflictFile,
  ConflictsResponse,
} from "@/app/api/sessions/[sessionId]/conflicts/route";

export type { ConflictFile };

export function useSessionConflicts(sessionId: string, hasSandbox: boolean) {
  const { data, error, isLoading, isValidating, mutate } =
    useSWR<ConflictsResponse>(
      hasSandbox ? `/api/sessions/${sessionId}/conflicts` : null,
      fetcher,
      {
        revalidateOnFocus: false,
        dedupingInterval: 5000,
      },
    );

  return {
    conflicts: data?.files ?? null,
    baseBranch: data?.baseBranch ?? null,
    conflictsLoading: isLoading,
    conflictsRefreshing: isValidating && !isLoading,
    conflictsError: error ? String(error) : null,
    refreshConflicts: () => mutate(),
  };
}
