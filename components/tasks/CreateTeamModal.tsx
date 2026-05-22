"use client";

import { useState } from "react";
import { createTeam } from "@/lib/actions/teams";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { Plus, Loader2, Users } from "lucide-react";
import { useRouter } from "next/navigation";

interface CreateTeamModalProps {
  userRole: string;
}

export function CreateTeamModal({ userRole }: CreateTeamModalProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [teamName, setTeamName] = useState("");

  // Only MANAGER and ADMIN can create teams
  if (userRole === "EMPLOYEE") return null;

  function resetForm() {
    setTeamName("");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!teamName.trim()) {
      toast.error("Team name is required");
      return;
    }
    setLoading(true);
    try {
      await createTeam({ teamName: teamName.trim() });
      toast.success(`Team "${teamName}" created!`);
      setOpen(false);
      resetForm();
      router.refresh();
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Failed to create team";
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
        New Team
      </DialogTrigger>

      <DialogContent
        className="bg-surface-1 border-border-default text-text-primary max-w-md"
        style={{ boxShadow: "var(--shadow-modal)", zIndex: "var(--z-modal)" }}
      >
        <DialogHeader>
          <div className="flex items-center gap-3 mb-1">
            <div className="w-9 h-9 rounded-xl bg-brand/10 flex items-center justify-center flex-shrink-0">
              <Users className="w-4 h-4 text-brand" />
            </div>
            <DialogTitle className="text-xl font-semibold tracking-tight">
              Create New Team
            </DialogTitle>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          <div className="space-y-1.5">
            <label htmlFor="team-name" className="text-sm font-medium text-text-secondary">
              Team Name <span className="text-danger">*</span>
            </label>
            <Input
              id="team-name"
              placeholder="e.g., Frontend, Backend, QA, DevOps"
              value={teamName}
              onChange={(e) => setTeamName(e.target.value)}
              className="bg-surface-2 border-border-default focus:border-brand-hover transition-colors text-text-primary placeholder:text-text-tertiary"
              style={{ transitionDuration: "var(--transition-fast)" }}
              required
              autoFocus
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
              disabled={loading || !teamName.trim()}
              className="bg-brand hover:bg-brand-hover text-white min-w-[130px]"
              style={{ transitionDuration: "var(--transition-fast)" }}
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Creating…
                </>
              ) : (
                "Create Team"
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
