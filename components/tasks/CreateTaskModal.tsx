"use client";

import { useState } from "react";
import { createTask, assignTask } from "@/lib/actions/tasks";
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { Plus, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";

interface CreateTaskModalProps {
  projectId: string;
  userRole: string;
  users: { userId: string; fullName: string; teamId: string }[];
  teams: { teamId: string; teamName: string }[];
}

export function CreateTaskModal({
  projectId,
  userRole,
  users,
  teams,
}: CreateTaskModalProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    title: "",
    description: "",
    priority: "MEDIUM" as "LOW" | "MEDIUM" | "HIGH",
    deadline: "",
    assigneeId: "unassigned",
    teamId: teams[0]?.teamId || "",
  });

  if (userRole === "EMPLOYEE") return null;

  function resetForm() {
    setForm({
      title: "",
      description: "",
      priority: "MEDIUM",
      deadline: "",
      assigneeId: "unassigned",
      teamId: teams[0]?.teamId || "",
    });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.title.trim()) { toast.error("Title is required"); return; }
    if (!form.teamId) { toast.error("Please select a team"); return; }
    setLoading(true);
    try {
      const task = await createTask({
        title: form.title.trim(),
        description: form.description.trim(),
        priority: form.priority,
        deadline: form.deadline ? form.deadline + "T00:00:00.000Z" : "",
        projectId,
        teamId: form.teamId,
        assigneeId: form.assigneeId === "unassigned" ? "unassigned" : form.assigneeId,
      });
      if (form.assigneeId && form.assigneeId !== "unassigned") {
        await assignTask(task.taskId, form.assigneeId);
      }
      toast.success("Task created!");
      setOpen(false);
      resetForm();
      router.refresh();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to create task");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) resetForm(); }}>
      {/* Base UI DialogTrigger: render prop specifies the host element */}
      <DialogTrigger
        render={
          <Button
            size="sm"
            className="bg-brand hover:bg-brand-hover text-white transition-colors cursor-pointer group"
            style={{ transitionDuration: "var(--transition-fast)" }}
          />
        }
      >
        <Plus className="w-4 h-4 mr-1.5" />
        New Task
        <span className="ml-1.5 text-xs opacity-0 group-hover:opacity-60 transition-opacity hidden sm:inline">
          [C]
        </span>
      </DialogTrigger>

      <DialogContent
        className="bg-surface-1 border-border-default text-text-primary max-w-lg"
        style={{ boxShadow: "var(--shadow-modal)", zIndex: "var(--z-modal)" }}
      >
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold tracking-tight">
            Create New Task
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          <div className="space-y-1.5">
            <label htmlFor="task-title" className="text-sm font-medium text-text-secondary">
              Title <span className="text-danger">*</span>
            </label>
            <Input
              id="task-title"
              placeholder="e.g., Update login page styles"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              className="bg-surface-2 border-border-default focus:border-brand-hover transition-colors text-text-primary placeholder:text-text-tertiary"
              required
              autoFocus
            />
          </div>

          <div className="space-y-1.5">
            <label htmlFor="task-description" className="text-sm font-medium text-text-secondary">
              Description
            </label>
            <Textarea
              id="task-description"
              placeholder="Provide context and acceptance criteria..."
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              className="bg-surface-2 border-border-default focus:border-brand-hover transition-colors resize-none text-text-primary placeholder:text-text-tertiary"
              rows={3}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-text-secondary">Priority</label>
              <Select value={form.priority} onValueChange={(v) => { if (v) setForm({ ...form, priority: v as "LOW" | "MEDIUM" | "HIGH" }); }}>
                <SelectTrigger className="bg-surface-2 border-border-default text-text-primary">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-surface-1 border-border-default">
                  <SelectItem value="LOW">Low</SelectItem>
                  <SelectItem value="MEDIUM">Medium</SelectItem>
                  <SelectItem value="HIGH">High</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-text-secondary">Team <span className="text-danger">*</span></label>
              <Select value={form.teamId} onValueChange={(v) => { if (v) setForm({ ...form, teamId: v }); }}>
                <SelectTrigger className="bg-surface-2 border-border-default text-text-primary">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-surface-1 border-border-default">
                  {teams.map((t) => (
                    <SelectItem key={t.teamId} value={t.teamId}>{t.teamName}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-text-secondary">Assignee</label>
              <Select value={form.assigneeId} onValueChange={(v) => { if (v) setForm({ ...form, assigneeId: v }); }}>
                <SelectTrigger className="bg-surface-2 border-border-default text-text-primary">
                  <SelectValue placeholder="Select user" />
                </SelectTrigger>
                <SelectContent className="bg-surface-1 border-border-default max-h-[200px]">
                  <SelectItem value="unassigned" className="text-text-tertiary italic">Unassigned</SelectItem>
                  {users.map((u) => (
                    <SelectItem key={u.userId} value={u.userId}>
                      {u.fullName} <span className="text-text-tertiary text-xs">({u.teamId})</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <label htmlFor="task-deadline" className="text-sm font-medium text-text-secondary">Deadline</label>
              <Input
                id="task-deadline"
                type="date"
                value={form.deadline}
                onChange={(e) => setForm({ ...form, deadline: e.target.value })}
                className="bg-surface-2 border-border-default focus:border-brand-hover transition-colors text-text-primary dark:[color-scheme:dark]"
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-3 border-t border-border-subtle">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              className="bg-transparent border-border-default hover:bg-surface-2 text-text-secondary"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={loading || !form.title.trim()}
              className="bg-brand hover:bg-brand-hover text-white min-w-[120px]"
            >
              {loading ? (<><Loader2 className="w-4 h-4 mr-2 animate-spin" />Creating…</>) : "Create Task"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
