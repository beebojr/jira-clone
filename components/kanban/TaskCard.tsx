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

export function TaskCard({ task, isDragging }: TaskCardProps) {
  const isOverdue =
    task.deadline &&
    new Date(task.deadline) < new Date() &&
    task.status !== "DONE";

  return (
    <Link href={`/tasks/${task.taskId}`} tabIndex={isDragging ? -1 : 0}>
      <Card
        className={`bg-surface-1 hover:border-brand/50 transition-all cursor-pointer group ${
          isDragging
            ? "border-brand/30 ring-1 ring-brand/10"
            : "border-border-default"
        }`}
        style={{
          boxShadow: isDragging ? "var(--shadow-md)" : "var(--shadow-xs)",
          transitionDuration: "var(--transition-fast)",
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
              {/* Priority pill */}
              <span
                className="text-xs px-1.5 py-0.5 rounded font-medium"
                style={{
                  backgroundColor: `var(--priority-${task.priority.toLowerCase()})`,
                  color: `var(--priority-${task.priority.toLowerCase()}-text)`,
                }}
              >
                {task.priority}
              </span>

              {/* Status dot indicator — subtle, matches column header */}
              <span
                className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${STATUS_DOT[task.status] ?? "bg-text-tertiary"}`}
                title={task.status.replace(/_/g, " ")}
              />

              {/* Deadline */}
              {task.deadline && (
                <div
                  className={`flex items-center gap-1 text-xs ${
                    isOverdue ? "text-danger" : "text-text-tertiary"
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
