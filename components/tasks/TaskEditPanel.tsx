"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { assignTask, updateTask } from "@/lib/actions/tasks";
import type { Task } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { Edit3, Loader2, UserRoundCog } from "lucide-react";

interface TaskEditPanelProps {
  task: Task;
  users: { userId: string; fullName: string; teamId: string }[];
}

const priorityOptions: Task['priority'][] = ["LOW", "MEDIUM", "HIGH"];

export function TaskEditPanel({ task, users }: TaskEditPanelProps) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [title, setTitle] = useState(task.title);
  const [description, setDescription] = useState(task.description);
  const [priority, setPriority] = useState<Task['priority']>(task.priority);
  const [deadline, setDeadline] = useState(task.deadline ? task.deadline.slice(0, 10) : "");
  const [assigneeId, setAssigneeId] = useState(task.assigneeId || "unassigned");

  async function handleSave() {
    const trimmedTitle = title.trim();
    const trimmedDescription = description.trim();

    if (!trimmedTitle) {
      toast.error("Task title is required");
      return;
    }

    setSaving(true);
    try {
      const updates: Record<string, any> = {
        title: trimmedTitle,
        description: trimmedDescription,
        priority,
      };

      // Only include deadline if it has a value; omit to keep existing deadline
      if (deadline) {
        updates.deadline = `${deadline}T00:00:00.000Z`;
      }

      await updateTask(task.taskId, updates);

      if (assigneeId !== task.assigneeId) {
        await assignTask(task.taskId, assigneeId);
      }

      toast.success("Task updated");
      router.refresh();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to update task");
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="mt-6 rounded-xl border border-border-subtle bg-surface-1 p-4 sm:p-5" style={{ boxShadow: "var(--shadow-xs)" }}>
      <div className="flex items-center gap-2 mb-4">
        <div className="w-8 h-8 rounded-lg bg-brand/10 flex items-center justify-center flex-shrink-0">
          <Edit3 className="w-4 h-4 text-brand" />
        </div>
        <div>
          <h2 className="text-sm font-semibold tracking-tight text-text-primary">Edit Task</h2>
          <p className="text-xs text-text-tertiary">Managers and admins can update the task fields and assignee.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4">
        <div className="space-y-1.5">
          <label htmlFor="task-edit-title" className="text-sm font-medium text-text-secondary">
            Title
          </label>
          <Input
            id="task-edit-title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="bg-surface-2 border-border-default focus:border-brand-hover transition-colors text-text-primary placeholder:text-text-tertiary"
          />
        </div>

        <div className="space-y-1.5">
          <label htmlFor="task-edit-description" className="text-sm font-medium text-text-secondary">
            Description
          </label>
          <Textarea
            id="task-edit-description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={4}
            className="bg-surface-2 border-border-default focus:border-brand-hover transition-colors resize-none text-text-primary placeholder:text-text-tertiary"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-text-secondary">Priority</label>
            <Select value={priority} onValueChange={(value) => setPriority(value as Task['priority'])}>
              <SelectTrigger className="w-full bg-surface-2 border-border-default text-text-primary">
                <SelectValue>
                  {(value) => {
                    if (!value) return "Medium";
                    return value.charAt(0) + value.slice(1).toLowerCase();
                  }}
                </SelectValue>
              </SelectTrigger>
              <SelectContent className="bg-surface-1 border-border-default">
                {priorityOptions.map((value) => (
                  <SelectItem key={value} value={value}>
                    {value[0] + value.slice(1).toLowerCase()}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <label htmlFor="task-edit-deadline" className="text-sm font-medium text-text-secondary">
              Deadline
            </label>
            <Input
              id="task-edit-deadline"
              type="date"
              value={deadline}
              onChange={(e) => setDeadline(e.target.value)}
              className="bg-surface-2 border-border-default focus:border-brand-hover transition-colors text-text-primary dark:[color-scheme:dark]"
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="text-sm font-medium text-text-secondary flex items-center gap-2">
            <UserRoundCog className="w-4 h-4 text-text-tertiary" />
            Assignee
          </label>
          <Select value={assigneeId} onValueChange={(val) => setAssigneeId(val || "unassigned")}>
            <SelectTrigger className="w-full bg-surface-2 border-border-default text-text-primary">
              <SelectValue placeholder="Select assignee">
                {(value) => {
                  if (!value || value === "unassigned") return <span className="text-text-tertiary italic">Unassigned</span>;
                  const u = users.find((user) => user.userId === value);
                  return u ? u.fullName : "Select assignee";
                }}
              </SelectValue>
            </SelectTrigger>
            <SelectContent className="bg-surface-1 border-border-default max-h-[240px]">
              <SelectItem value="unassigned" className="text-text-tertiary italic">
                Unassigned
              </SelectItem>
              {users.length === 0 ? (
                <div className="px-3 py-2 text-xs text-text-tertiary italic">No members in this team</div>
              ) : (
                users.map((user) => (
                  <SelectItem key={user.userId} value={user.userId}>
                    {user.fullName}
                  </SelectItem>
                ))
              )}
            </SelectContent>
          </Select>
        </div>

        <div className="flex justify-end pt-2 border-t border-border-subtle">
          <Button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="bg-brand hover:bg-brand-hover text-white min-w-[140px]"
            style={{ transitionDuration: "var(--transition-fast)" }}
          >
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Saving…
              </>
            ) : (
              "Save Changes"
            )}
          </Button>
        </div>
      </div>
    </section>
  );
}
