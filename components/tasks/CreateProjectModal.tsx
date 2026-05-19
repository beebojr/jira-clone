"use client";

import { useState } from "react";
import { createProject } from "@/lib/actions/projects";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { Plus, Loader2, FolderOpen } from "lucide-react";
import { useRouter } from "next/navigation";

interface CreateProjectModalProps {
  userRole: string;
}

export function CreateProjectModal({ userRole }: CreateProjectModalProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ projectName: "", description: "" });

  // Only MANAGER and ADMIN can create projects
  if (userRole === "EMPLOYEE") return null;

  function resetForm() {
    setForm({ projectName: "", description: "" });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.projectName.trim()) {
      toast.error("Project name is required");
      return;
    }
    setLoading(true);
    try {
      await createProject({
        projectName: form.projectName.trim(),
        description: form.description.trim(),
      });
      toast.success(`Project "${form.projectName}" created!`);
      setOpen(false);
      resetForm();
      router.refresh();
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Failed to create project";
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        setOpen(v);
        if (!v) resetForm();
      }}
    >
      <DialogTrigger
        render={
          <Button
            size="sm"
            className="bg-brand hover:bg-brand-hover text-white transition-colors cursor-pointer"
            style={{ transitionDuration: "var(--transition-fast)" }}
          />
        }
      >
        <Plus className="w-4 h-4 mr-1.5" />
        New Project
      </DialogTrigger>

      <DialogContent
        className="bg-surface-1 border-border-default text-text-primary max-w-md"
        style={{ boxShadow: "var(--shadow-modal)", zIndex: "var(--z-modal)" }}
      >
        <DialogHeader>
          <div className="flex items-center gap-3 mb-1">
            <div className="w-9 h-9 rounded-xl bg-brand/10 flex items-center justify-center flex-shrink-0">
              <FolderOpen className="w-4 h-4 text-brand" />
            </div>
            <DialogTitle className="text-xl font-semibold tracking-tight">
              Create New Project
            </DialogTitle>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          <div className="space-y-1.5">
            <label htmlFor="project-name" className="text-sm font-medium text-text-secondary">
              Project Name <span className="text-danger">*</span>
            </label>
            <Input
              id="project-name"
              placeholder="e.g., Jira Clone MVP"
              value={form.projectName}
              onChange={(e) => setForm({ ...form, projectName: e.target.value })}
              className="bg-surface-2 border-border-default focus:border-brand-hover transition-colors text-text-primary placeholder:text-text-tertiary"
              style={{ transitionDuration: "var(--transition-fast)" }}
              required
              autoFocus
            />
          </div>

          <div className="space-y-1.5">
            <label htmlFor="project-description" className="text-sm font-medium text-text-secondary">
              Description
            </label>
            <Textarea
              id="project-description"
              placeholder="Brief description of the project scope and goals…"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              className="bg-surface-2 border-border-default focus:border-brand-hover transition-colors resize-none text-text-primary placeholder:text-text-tertiary"
              style={{ transitionDuration: "var(--transition-fast)" }}
              rows={3}
            />
          </div>

          <div className="flex justify-end gap-3 pt-3 border-t border-border-subtle">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              className="bg-transparent border-border-default hover:bg-surface-2 text-text-secondary"
              style={{ transitionDuration: "var(--transition-fast)" }}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={loading || !form.projectName.trim()}
              className="bg-brand hover:bg-brand-hover text-white min-w-[130px]"
              style={{ transitionDuration: "var(--transition-fast)" }}
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Creating…
                </>
              ) : (
                "Create Project"
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
