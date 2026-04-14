"use client";

import {
  ExternalLink,
  GitPullRequest,
  Loader2,
  Play,
  Trash2,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { AutomationForm } from "../automation-form";
import {
  useAutomationDetail,
  useAutomations,
  type AutomationRecord,
  type AutomationRunRecord,
} from "@/hooks/use-automations";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import {
  formatAutomationDateTime,
  getNextCronOccurrence,
} from "@/lib/automations/cron";
import type { AutomationUpsertInput } from "@/lib/automations/types";

function getCronConfig(automation: AutomationRecord) {
  const cronTrigger = automation.triggers.find(
    (trigger) => trigger.type === "cron" && trigger.config.type === "cron",
  );
  return cronTrigger?.config.type === "cron" ? cronTrigger.config : null;
}

function toFormValue(
  automation: AutomationRecord,
): Partial<AutomationUpsertInput> {
  return {
    name: automation.name,
    instructions: automation.instructions,
    repoOwner: automation.repoOwner,
    repoName: automation.repoName,
    cloneUrl: automation.cloneUrl ?? undefined,
    baseBranch: automation.baseBranch,
    modelId: automation.modelId,
    enabled: automation.enabled,
    triggers: automation.triggers.map((trigger) => trigger.config),
    tools: automation.tools.map((tool) => tool.config),
    connections: automation.connections.map((connection) => ({
      provider: connection.provider,
      connectionRef: connection.connectionRef,
      config: connection.config,
    })),
  };
}

function formatRunTime(value: string | null) {
  return value ? new Date(value).toLocaleString() : "Not available";
}

function getRunStatusDotColor(status: string) {
  switch (status) {
    case "completed":
      return "bg-emerald-500";
    case "running":
      return "bg-blue-500 animate-pulse";
    case "queued":
      return "bg-blue-400";
    case "needs_attention":
      return "bg-amber-500";
    case "failed":
    case "cancelled":
      return "bg-red-500";
    default:
      return "bg-zinc-400";
  }
}

function DetailSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-4 w-40" />
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-9 w-24" />
          <Skeleton className="h-9 w-20" />
        </div>
      </div>
      <div className="space-y-3">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="flex items-center justify-between">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-4 w-40" />
          </div>
        ))}
      </div>
    </div>
  );
}

function RunHistoryRow({ run }: { run: AutomationRunRecord }) {
  return (
    <div className="flex items-center justify-between gap-3 px-3 py-3">
      <div className="flex min-w-0 items-center gap-3">
        <span
          className={cn(
            "h-2 w-2 shrink-0 rounded-full",
            getRunStatusDotColor(run.status),
          )}
        />
        <div className="min-w-0">
          <p className="text-sm font-medium">
            {run.triggeredAt
              ? new Date(run.triggeredAt).toLocaleString()
              : "Automation run"}
          </p>
          <p className="truncate text-xs text-muted-foreground">
            {run.resultSummary ?? run.needsAttentionReason ?? "No summary yet"}
          </p>
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-2">
        <span className="text-xs uppercase tracking-wide text-muted-foreground">
          {run.status.replaceAll("_", " ")}
        </span>
        {run.sessionId ? (
          <Button asChild size="sm" variant="ghost" className="h-7 px-2">
            <Link href={`/sessions/${run.sessionId}`}>
              <ExternalLink className="h-3.5 w-3.5" />
            </Link>
          </Button>
        ) : null}
        {run.prUrl ? (
          <Button asChild size="sm" variant="ghost" className="h-7 px-2">
            <a href={run.prUrl} rel="noreferrer" target="_blank">
              <GitPullRequest className="h-3.5 w-3.5" />
            </a>
          </Button>
        ) : null}
        {run.compareUrl ? (
          <Button asChild size="sm" variant="ghost" className="h-7 px-2">
            <a href={run.compareUrl} rel="noreferrer" target="_blank">
              <ExternalLink className="h-3.5 w-3.5" />
            </a>
          </Button>
        ) : null}
      </div>
    </div>
  );
}

export function AutomationDetailPage({
  automationId,
}: {
  automationId: string;
}) {
  const router = useRouter();
  const { automation, runs, error, isLoading, mutate } =
    useAutomationDetail(automationId);
  const { updateAutomation, deleteAutomation, runNow } = useAutomations();
  const [isRunningNow, setIsRunningNow] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const cronConfig = useMemo(
    () => (automation ? getCronConfig(automation) : null),
    [automation],
  );

  const nextPreview = useMemo(() => {
    if (!cronConfig) return "Not scheduled";

    try {
      return formatAutomationDateTime(
        automation?.nextRunAt
          ? new Date(automation.nextRunAt)
          : getNextCronOccurrence({
              cron: cronConfig.cron,
              timezone: cronConfig.timezone,
            }),
        cronConfig.timezone,
      );
    } catch {
      return "Not scheduled";
    }
  }, [automation?.nextRunAt, cronConfig]);

  if (isLoading) {
    return <DetailSkeleton />;
  }

  if (!automation) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-semibold">Automation not found</h1>
        <p className="text-sm text-muted-foreground">
          {error instanceof Error
            ? error.message
            : "This automation could not be loaded."}
        </p>
        <Button asChild variant="outline">
          <Link href="/settings/automations">Back to automations</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* ── Header ── */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-semibold">{automation.name}</h1>
            <span
              className={cn(
                "h-2 w-2 rounded-full",
                automation.enabled ? "bg-emerald-500" : "bg-zinc-400",
              )}
            />
            <span className="text-xs text-muted-foreground">
              {automation.enabled ? "Enabled" : "Paused"}
            </span>
          </div>
          <p className="font-mono text-xs text-muted-foreground">
            {automation.repoOwner}/{automation.repoName} on{" "}
            {automation.baseBranch}
          </p>
        </div>

        <div className="flex gap-2">
          <Button
            disabled={isRunningNow}
            onClick={async () => {
              setIsRunningNow(true);
              try {
                const result = await runNow(automation.id);
                await mutate();
                router.push(
                  `/sessions/${result.session.id}/chats/${result.chat.id}`,
                );
              } finally {
                setIsRunningNow(false);
              }
            }}
          >
            {isRunningNow ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Play className="h-4 w-4" />
            )}
            Run now
          </Button>
          <Button
            disabled={isDeleting}
            variant="destructive"
            onClick={async () => {
              const confirmed = window.confirm(
                `Delete automation "${automation.name}"? Existing sessions will remain, but future runs will stop.`,
              );
              if (!confirmed) return;

              setIsDeleting(true);
              try {
                await deleteAutomation(automation.id);
                router.push("/settings/automations");
              } finally {
                setIsDeleting(false);
              }
            }}
          >
            <Trash2 className="h-4 w-4" />
            Delete
          </Button>
        </div>
      </div>

      {/* ── Summary ── */}
      <div className="divide-y divide-border/60 rounded-lg border border-border/70 text-sm">
        <div className="flex items-center justify-between px-3 py-2.5">
          <span className="text-muted-foreground">Schedule</span>
          <span>{automation.scheduleSummary}</span>
        </div>
        <div className="flex items-center justify-between px-3 py-2.5">
          <span className="text-muted-foreground">Next run</span>
          <span>{nextPreview}</span>
        </div>
        <div className="flex items-center justify-between px-3 py-2.5">
          <span className="text-muted-foreground">Last run</span>
          <span>
            {automation.lastRunAt
              ? formatRunTime(automation.lastRunAt)
              : "No runs yet"}
          </span>
        </div>
        <div className="flex items-center justify-between px-3 py-2.5">
          <span className="text-muted-foreground">Last result</span>
          <span>
            {automation.lastRunSummary ??
              automation.lastRunStatus ??
              "Waiting for first run"}
          </span>
        </div>
        <div className="flex items-center justify-between px-3 py-2.5">
          <span className="text-muted-foreground">Tools</span>
          <span>
            {automation.enabledToolTypes.length > 0 ? (
              <span className="flex flex-wrap justify-end gap-1">
                {automation.enabledToolTypes.map((toolType) => (
                  <span
                    key={toolType}
                    className="inline-flex items-center rounded-full border border-border px-1.5 py-0 text-[10px] uppercase tracking-wide text-muted-foreground"
                  >
                    {toolType.replaceAll("_", " ")}
                  </span>
                ))}
              </span>
            ) : (
              "None"
            )}
          </span>
        </div>
      </div>

      {/* ── Edit ── */}
      <div className="space-y-4 border-t border-border/50 pt-8">
        <h2 className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          Edit
        </h2>
        <AutomationForm
          key={automation.id}
          initialValue={toFormValue(automation)}
          submitLabel="Save changes"
          onSubmit={async (input) => {
            await updateAutomation(automation.id, input);
            await mutate();
          }}
        />
      </div>

      {/* ── Run History ── */}
      <div className="space-y-4 border-t border-border/50 pt-8">
        <h2 className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          Run History
        </h2>

        {runs.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            No runs yet. Use Run now or wait for the next scheduled execution.
          </p>
        ) : (
          <div className="divide-y divide-border/60 rounded-lg border border-border/70">
            {runs.map((run) => (
              <RunHistoryRow key={run.id} run={run} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
