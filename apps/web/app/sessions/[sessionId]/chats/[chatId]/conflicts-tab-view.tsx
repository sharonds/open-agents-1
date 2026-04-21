"use client";

import { UnresolvedFile } from "@pierre/diffs/react";
import {
  AlertCircle,
  ChevronRight,
  Loader2,
  RefreshCw,
  Sparkles,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import type { ConflictFile } from "@/hooks/use-session-conflicts";
import { useGitPanel } from "./git-panel-context";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { defaultDiffOptions } from "@/lib/diffs-config";
import { cn } from "@/lib/utils";

/* ------------------------------------------------------------------ */
/* Individual collapsible conflict file section                        */
/* ------------------------------------------------------------------ */

function ConflictFileDiffSection({
  file,
  isExpanded,
  onToggle,
  sectionRef,
}: {
  file: ConflictFile;
  isExpanded: boolean;
  onToggle: () => void;
  sectionRef?: React.Ref<HTMLDivElement>;
}) {
  const fileName = file.path.split("/").pop() ?? file.path;
  const dirPath = file.path.slice(0, -fileName.length);

  // Count conflict markers for display
  const conflictCount = (file.contents.match(/^<{7}\s/gm) ?? []).length;

  return (
    <div ref={sectionRef} className="border-b border-border last:border-b-0">
      {/* Collapsible header */}
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center gap-2 px-4 py-2 text-left transition-colors hover:bg-accent/50"
      >
        <ChevronRight
          className={cn(
            "h-3.5 w-3.5 shrink-0 text-muted-foreground transition-transform duration-150",
            isExpanded && "rotate-90",
          )}
        />
        <AlertCircle className="h-4 w-4 shrink-0 text-amber-500" />
        <span className="shrink-0 text-xs font-medium text-foreground font-mono">
          {fileName}
        </span>
        {dirPath && (
          <span
            className="min-w-0 overflow-hidden text-ellipsis whitespace-nowrap text-[10px] text-muted-foreground"
            dir="rtl"
          >
            <bdi>{dirPath.replace(/\/$/, "")}</bdi>
          </span>
        )}
        <div className="ml-auto flex shrink-0 items-center gap-1.5 text-xs">
          <span className="text-amber-600 dark:text-amber-400">
            {conflictCount} conflict{conflictCount !== 1 ? "s" : ""}
          </span>
        </div>
      </button>

      {/* Conflict content */}
      {isExpanded && (
        <div>
          <UnresolvedFile
            file={{
              name: file.path,
              contents: file.contents,
            }}
            options={{
              theme: defaultDiffOptions.theme,
              overflow: defaultDiffOptions.overflow,
              unsafeCSS: defaultDiffOptions.unsafeCSS,
              disableFileHeader: true,
              maxContextLines: 4,
            }}
          />
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Main ConflictsTabView                                               */
/* ------------------------------------------------------------------ */

export function ConflictsTabView({
  conflicts,
  conflictsLoading,
  refreshConflicts,
  onFixConflicts,
  isAgentWorking,
  baseBranchRef,
}: {
  conflicts: ConflictFile[] | null;
  conflictsLoading: boolean;
  refreshConflicts: () => void;
  onFixConflicts?: (baseBranchRef: string) => void;
  isAgentWorking: boolean;
  baseBranchRef: string;
}) {
  const { focusedConflictFile, focusedConflictRequestId } = useGitPanel();

  // Track which files are expanded (by path)
  const [expandedFiles, setExpandedFiles] = useState<Set<string>>(new Set());

  // Refs for scrolling to specific file sections
  const sectionRefs = useRef<Map<string, HTMLDivElement>>(new Map());

  const files = conflicts ?? [];

  // When a file is requested from the sidebar, expand it and scroll to it.
  useEffect(() => {
    if (!focusedConflictFile) return;

    setExpandedFiles((prev) => {
      if (prev.has(focusedConflictFile)) return prev;
      return new Set([...prev, focusedConflictFile]);
    });

    requestAnimationFrame(() => {
      const el = sectionRefs.current.get(focusedConflictFile);
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    });
  }, [focusedConflictFile, focusedConflictRequestId]);

  const toggleFile = useCallback((filePath: string) => {
    setExpandedFiles((prev) => {
      const next = new Set(prev);
      if (next.has(filePath)) {
        next.delete(filePath);
      } else {
        next.add(filePath);
      }
      return next;
    });
  }, []);

  const setSectionRef = useCallback(
    (filePath: string, el: HTMLDivElement | null) => {
      if (el) {
        sectionRefs.current.set(filePath, el);
      } else {
        sectionRefs.current.delete(filePath);
      }
    },
    [],
  );

  // Total conflict count
  const totalConflicts = files.reduce((sum, file) => {
    return sum + (file.contents.match(/^<{7}\s/gm) ?? []).length;
  }, 0);

  return (
    <div className="flex h-full flex-col">
      {/* Toolbar */}
      <div className="flex shrink-0 items-center justify-between border-b border-border px-4 py-2">
        <div className="flex min-w-0 items-center gap-2">
          <AlertCircle className="h-4 w-4 shrink-0 text-amber-500" />
          <span className="text-sm font-medium font-mono">
            {files.length} file{files.length !== 1 ? "s" : ""} with conflicts
          </span>
          {totalConflicts > 0 && (
            <span className="text-xs text-amber-600 dark:text-amber-400">
              {totalConflicts} conflict{totalConflicts !== 1 ? "s" : ""} total
            </span>
          )}
        </div>
        <div className="flex items-center gap-1">
          {onFixConflicts && (
            <Button
              size="sm"
              className="h-7 text-xs"
              disabled={isAgentWorking || files.length === 0}
              onClick={() => onFixConflicts(baseBranchRef)}
            >
              <Sparkles className="mr-1.5 h-3 w-3" />
              Fix Conflicts
            </Button>
          )}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => refreshConflicts()}
                className="h-7 w-7 px-0"
              >
                <RefreshCw
                  className={cn(
                    "h-3.5 w-3.5",
                    conflictsLoading && "animate-spin",
                  )}
                />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom">Refresh</TooltipContent>
          </Tooltip>
          {/* Expand / Collapse all */}
          <div className="flex items-center gap-0.5">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() =>
                    setExpandedFiles(new Set(files.map((f) => f.path)))
                  }
                  className="h-7 px-1.5 text-xs text-muted-foreground"
                >
                  Expand all
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom">Expand all files</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setExpandedFiles(new Set())}
                  className="h-7 px-1.5 text-xs text-muted-foreground"
                >
                  Collapse all
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom">Collapse all files</TooltipContent>
            </Tooltip>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="min-h-0 flex-1 overflow-y-auto">
        {conflictsLoading && (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        )}

        {!conflictsLoading && files.length === 0 && (
          <div className="flex flex-1 flex-col items-center justify-center gap-3 py-12 text-muted-foreground/50">
            <AlertCircle className="h-8 w-8" />
            <p className="text-sm">No merge conflicts</p>
          </div>
        )}

        {!conflictsLoading &&
          files.length > 0 &&
          files.map((file) => (
            <ConflictFileDiffSection
              key={file.path}
              file={file}
              isExpanded={expandedFiles.has(file.path)}
              onToggle={() => toggleFile(file.path)}
              sectionRef={(el) => setSectionRef(file.path, el)}
            />
          ))}
      </div>
    </div>
  );
}
