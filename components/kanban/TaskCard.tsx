"use client";

import type { Task } from "@/lib/types";
import { Card, CardContent } from "@/components/ui/card";
import Link from "next/link";
import { AlertCircle, Clock } from "lucide-react";

interface TaskCardProps {
  task: Task;
  isDragging?: boolean;
}

const STATUS_DOT: Record<string, string> = {
  TODO: "bg-status-todo",
  IN_PROGRESS: "bg-status-progress",
  IN_REVIEW: "bg-status-review",
  DONE: "bg-status-done",
};

export function PriorityIcon({ priority, className = "w-3 h-3" }: { priority: string; className?: string }) {
  const dimmedColor = "text-text-tertiary opacity-25";

  if (priority === "LOW") {
    return (
      <svg viewBox="0 0 16 16" className={`${className} flex-shrink-0`} fill="none" xmlns="http://www.w3.org/2000/svg">
        <title>Low Priority</title>
        <rect x="2" y="10" width="3" height="4" rx="0.75" fill="currentColor" className="text-text-secondary" />
        <rect x="6.5" y="7" width="3" height="7" rx="0.75" fill="currentColor" className={dimmedColor} />
        <rect x="11" y="4" width="3" height="10" rx="0.75" fill="currentColor" className={dimmedColor} />
      </svg>
    );
  }
  if (priority === "MEDIUM") {
    return (
      <svg viewBox="0 0 16 16" className={`${className} flex-shrink-0`} fill="none" xmlns="http://www.w3.org/2000/svg">
        <title>Medium Priority</title>
        <rect x="2" y="10" width="3" height="4" rx="0.75" fill="currentColor" className="text-amber-500" />
        <rect x="6.5" y="7" width="3" height="7" rx="0.75" fill="currentColor" className="text-amber-500" />
        <rect x="11" y="4" width="3" height="10" rx="0.75" fill="currentColor" className={dimmedColor} />
      </svg>
    );
  }
  if (priority === "HIGH") {
    return (
      <svg viewBox="0 0 16 16" className={`${className} flex-shrink-0`} fill="none" xmlns="http://www.w3.org/2000/svg">
        <title>High Priority</title>
        <rect x="2" y="10" width="3" height="4" rx="0.75" fill="currentColor" className="text-danger" />
        <rect x="6.5" y="7" width="3" height="7" rx="0.75" fill="currentColor" className="text-danger" />
        <rect x="11" y="4" width="3" height="10" rx="0.75" fill="currentColor" className="text-danger" />
      </svg>
    );
  }
  return null;
}

export function TaskCard({ task, isDragging }: TaskCardProps) {
  const isOverdue =
    task.deadline &&
    new Date(task.deadline) < new Date() &&
    task.status !== "DONE";

  const priorityLabel = task.priority.charAt(0) + task.priority.slice(1).toLowerCase();

  return (
    <Link href={`/tasks/${task.taskId}`} tabIndex={isDragging ? -1 : 0}>
      <Card
        className={`bg-surface-1 hover:border-brand/40 hover:-translate-y-0.5 transition-all duration-100 ease-in-out cursor-pointer group ${isDragging
            ? "border-brand/30 ring-1 ring-brand/10 shadow-md"
            : "border-border-default hover:shadow-sm"
          }`}
        style={{
          /* §19 — top border lighter when elevated (dragging) */
          borderTopColor: isDragging
            ? "rgba(255,255,255,0.06)"
            : undefined,
        }}
      >
        <CardContent className="p-3 space-y-2.5">
          {/* Title row */}
          <div className="flex items-start justify-between gap-2">
            <p
              className="text-sm font-medium text-text-primary leading-snug line-clamp-2 group-hover:text-brand transition-colors"
              style={{ transitionDuration: "var(--transition-fast)" }}
            >
              {task.title}
            </p>
            {isOverdue && (
              <AlertCircle className="w-4 h-4 text-danger flex-shrink-0 mt-0.5" />
            )}
          </div>

          {/* Meta row */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {/* Premium priority icon indicator */}
              <div
                className="flex items-center gap-1 px-1.5 py-0.5 rounded border border-border-subtle bg-surface-2/40 text-text-secondary text-[10px] font-medium"
                title={`${priorityLabel} Priority`}
              >
                <PriorityIcon priority={task.priority} className="w-3.5 h-3.5" />
                <span>{priorityLabel}</span>
              </div>

              {/* Status dot indicator — subtle, matches column header */}
              <span
                className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${STATUS_DOT[task.status] ?? "bg-text-tertiary"}`}
                title={task.status.replace(/_/g, " ")}
              />

              {/* Deadline */}
              {task.deadline && (
                <div
                  className={`flex items-center gap-1 text-[11px] font-medium ${isOverdue ? "text-danger" : "text-text-tertiary"
                    }`}
                >
                  <Clock className="w-3 h-3" />
                  {new Date(task.deadline).toLocaleDateString(undefined, {
                    month: "short",
                    day: "numeric",
                  })}
                </div>
              )}
            </div>

            {/* Thumbnail */}
            {task.imageThumbnailUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={task.imageThumbnailUrl}
                alt="thumbnail"
                className="w-6 h-6 rounded-md object-cover ring-1 ring-border-default flex-shrink-0"
                loading="lazy"
              />
            )}
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
