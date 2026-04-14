"use client";

import { Play, Zap } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { useAutomations, type AutomationRecord } from "@/hooks/use-automations";
import { formatAutomationDateTime } from "@/lib/automations/cron";

function getAutomationTimezone(automation: AutomationRecord) {
  const cronTrigger = automation.triggers.find(
    (trigger) => trigger.type === "cron" && trigger.config.type === "cron",
  );

  return cronTrigger?.config.type === "cron"
    ? cronTrigger.config.timezone
    : Intl.DateTimeFormat().resolvedOptions().timeZone;
}

function ListSkeleton() {
  return (
    <div className="divide-y divide-border/60 rounded-lg border border-border/70">
      {[1, 2, 3].map((i) => (
        <div key={i} className="flex items-center gap-3 px-3 py-3">
          <Skeleton className="h-2 w-2 rounded-full" />
          <div className="flex-1 space-y-1.5">
            <Skeleton className="h-4 w-48" />
            <Skeleton className="h-3 w-32" />
          </div>
          <Skeleton className="h-3 w-20" />
        </div>
      ))}
    </div>
  );
}

export function AutomationsListPage() {
  const router = useRouter();
  const { automations, isLoading, runNow } = useAutomations();

  return (
    <>
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold">Automations</h1>
        <Button asChild>
          <Link href="/settings/automations/new">New automation</Link>
        </Button>
      </div>

      {isLoading ? (
        <ListSkeleton />
      ) : automations.length === 0 ? (
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <Zap />
            </EmptyMedia>
            <EmptyTitle>No automations yet</EmptyTitle>
            <EmptyDescription>
              Create one to start recurring repo work.
            </EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <Button asChild>
              <Link href="/settings/automations/new">New automation</Link>
            </Button>
          </EmptyContent>
        </Empty>
      ) : (
        <div className="divide-y divide-border/60 rounded-lg border border-border/70">
          {automations.map((automation) => (
            <div
              key={automation.id}
              className="flex items-center justify-between gap-3 px-3 py-3 transition-colors hover:bg-muted/50"
            >
              <Link
                href={`/settings/automations/${automation.id}`}
                className="flex min-w-0 flex-1 items-center gap-3"
              >
                <span
                  className={cn(
                    "h-2 w-2 shrink-0 rounded-full",
                    automation.enabled ? "bg-emerald-500" : "bg-zinc-400",
                  )}
                />
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">
                    {automation.name}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">
                    {automation.scheduleSummary}
                  </p>
                </div>
              </Link>

              <div className="flex shrink-0 items-center gap-3">
                <span className="hidden text-xs text-muted-foreground sm:inline">
                  {automation.lastRunStatus
                    ? `Last: ${automation.lastRunStatus}`
                    : formatAutomationDateTime(
                        automation.nextRunAt
                          ? new Date(automation.nextRunAt)
                          : null,
                        getAutomationTimezone(automation),
                      )}
                </span>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 w-7 p-0"
                  onClick={async (e) => {
                    e.stopPropagation();
                    const result = await runNow(automation.id);
                    router.push(
                      `/sessions/${result.session.id}/chats/${result.chat.id}`,
                    );
                  }}
                >
                  <Play className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
