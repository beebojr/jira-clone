"use client";

import { useState } from "react";
import { createTask } from "@/lib/actions/tasks";
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
  users?: { userId: string; fullName: string; teamId: string }[]; // kept for API compatibility, unused
  teams: { teamId: string; teamName: string }[];
}

export function CreateTaskModal({
  projectId,
  userRole,
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
    teamId: teams[0]?.teamId || "",
  });

  if (userRole === "EMPLOYEE") return null;

  function resetForm() {
    setForm({
      title: "",
      description: "",
      priority: "MEDIUM",
      deadline: "",
      teamId: teams[0]?.teamId || "",
    });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.title.trim()) { toast.error("Title is required"); return; }
    if (!form.teamId) { toast.error("Please select a team"); return; }
    setLoading(true);
    try {
      await createTask({
        title: form.title.trim(),
        description: form.description.trim(),
        priority: form.priority,
        deadline: form.deadline ? form.deadline + "T00:00:00.000Z" : "",
        projectId,
        teamId: form.teamId,
        assigneeId: "unassigned",
      });
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
          {/* Title */}
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

          {/* Description */}
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

          {/* Priority + Team */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-text-secondary">Priority</label>
              <Select
                value={form.priority}
                onValueChange={(v) => { if (v) setForm({ ...form, priority: v as "LOW" | "MEDIUM" | "HIGH" }); }}
              >
                <SelectTrigger className="w-full bg-surface-2 border-border-default text-text-primary">
                  <SelectValue>
                    {(value) => {
                      if (!value) return "Medium";
                      return value.charAt(0) + value.slice(1).toLowerCase();
                    }}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent className="bg-surface-1 border-border-default">
                  <SelectItem value="LOW">Low</SelectItem>
                  <SelectItem value="MEDIUM">Medium</SelectItem>
                  <SelectItem value="HIGH">High</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium text-text-secondary">
                Team <span className="text-danger">*</span>
              </label>
              <Select
                value={form.teamId}
                onValueChange={(v) => { if (v) setForm({ ...form, teamId: v }); }}
              >
                <SelectTrigger className="w-full bg-surface-2 border-border-default text-text-primary">
                  <SelectValue>
                    {(value) => {
                      const t = teams.find((team) => team.teamId === value);
                      return t ? t.teamName : "Select team";
                    }}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent className="bg-surface-1 border-border-default">
                  {teams.map((t) => (
                    <SelectItem key={t.teamId} value={t.teamId}>{t.teamName}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Deadline */}
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
