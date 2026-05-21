"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { updateTaskStatus } from "@/lib/actions/tasks";
import type { TaskStatus } from "@/lib/types";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";

const STATUS_OPTIONS: { id: TaskStatus; label: string; color: string }[] = [
  { id: "TODO", label: "To Do", color: "bg-status-todo/15 text-text-secondary" },
  { id: "IN_PROGRESS", label: "In Progress", color: "bg-status-progress/15 text-brand" },
  { id: "IN_REVIEW", label: "In Review", color: "bg-status-review/15 text-warning" },
  { id: "DONE", label: "Done", color: "bg-status-done/15 text-success" },
];

interface TaskStatusControlProps {
  taskId: string;
  currentStatus: TaskStatus;
}

export function TaskStatusControl({ taskId, currentStatus }: TaskStatusControlProps) {
  const router = useRouter();
  const [updating, setUpdating] = useState(false);
  const [status, setStatus] = useState<TaskStatus>(currentStatus);

  async function handleStatusChange(newStatus: TaskStatus) {
    if (newStatus === currentStatus) return;

    setStatus(newStatus);
    setUpdating(true);

    try {
      await updateTaskStatus(taskId, newStatus);
      toast.success(`Task moved to ${newStatus.replace(/_/g, " ")}`);
      router.refresh();
    } catch (err: unknown) {
      setStatus(currentStatus);
      toast.error(err instanceof Error ? err.message : "Failed to update status");
    } finally {
      setUpdating(false);
    }
  }

  const currentOption = STATUS_OPTIONS.find((s) => s.id === status);

  return (
    <div className="mt-4 rounded-xl border border-border-subtle bg-surface-1 p-4" style={{ boxShadow: "var(--shadow-xs)" }}>
      <div className="flex items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-medium text-text-secondary">Status</h3>
          <p className="text-xs text-text-tertiary mt-0.5">Update the current task status</p>
        </div>
        <Select value={status} onValueChange={(value) => handleStatusChange(value as TaskStatus)} disabled={updating}>
          <SelectTrigger
            className={`w-32 bg-surface-2 border-border-default text-text-primary font-medium ${
              currentOption?.color || ""
            }`}
          >
            <SelectValue>
              {(value) => {
                const opt = STATUS_OPTIONS.find((s) => s.id === value);
                return opt ? opt.label : value;
              }}
            </SelectValue>
          </SelectTrigger>
          <SelectContent className="bg-surface-1 border-border-default">
            {STATUS_OPTIONS.map((option) => (
              <SelectItem key={option.id} value={option.id}>
                <span className={`font-medium ${option.color}`}>{option.label}</span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
