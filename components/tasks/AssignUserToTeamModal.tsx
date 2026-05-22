"use client";

import { useState } from "react";
import { updateUserTeam } from "@/lib/actions/teams";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { Loader2, ArrowRightLeft } from "lucide-react";
import { useRouter } from "next/navigation";

interface AssignUserToTeamModalProps {
  userId: string;
  userName: string;
  currentTeamId: string;
  teams: { teamId: string; teamName: string }[];
}

export function AssignUserToTeamModal({
  userId,
  userName,
  currentTeamId,
  teams,
}: AssignUserToTeamModalProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [selectedTeamId, setSelectedTeamId] = useState(currentTeamId);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedTeamId || selectedTeamId === currentTeamId) {
      toast.error("Please select a different team");
      return;
    }
    setLoading(true);
    try {
      await updateUserTeam(userId, selectedTeamId);
      const newTeamName = teams.find((t) => t.teamId === selectedTeamId)?.teamName || selectedTeamId;
      toast.success(`${userName} moved to ${newTeamName}`);
      setOpen(false);
      router.refresh();
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Failed to reassign user";
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
        if (!v) setSelectedTeamId(currentTeamId);
      }}
    >
      <DialogTrigger
        render={
          <button
            className="p-1 rounded-md hover:bg-surface-3 text-text-tertiary hover:text-brand transition-colors cursor-pointer"
            style={{ transitionDuration: "var(--transition-fast)" }}
            title={`Reassign ${userName}`}
          />
        }
      >
        <ArrowRightLeft className="w-3.5 h-3.5" />
      </DialogTrigger>

      <DialogContent
        className="bg-surface-1 border-border-default text-text-primary max-w-sm"
        style={{ boxShadow: "var(--shadow-modal)", zIndex: "var(--z-modal)" }}
      >
        <DialogHeader>
          <div className="flex items-center gap-3 mb-1">
            <div className="w-9 h-9 rounded-xl bg-brand/10 flex items-center justify-center flex-shrink-0">
              <ArrowRightLeft className="w-4 h-4 text-brand" />
            </div>
            <DialogTitle className="text-lg font-semibold tracking-tight">
              Reassign Team
            </DialogTitle>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          <p className="text-sm text-text-secondary">
            Move <span className="font-medium text-text-primary">{userName}</span> to a different team.
          </p>

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-text-secondary">
              New Team <span className="text-danger">*</span>
            </label>
            <Select value={selectedTeamId} onValueChange={(v) => setSelectedTeamId(v ?? "")}>
              <SelectTrigger className="bg-surface-2 border-border-default text-text-primary">
                <SelectValue placeholder="Select a team" />
              </SelectTrigger>
              <SelectContent className="bg-surface-1 border-border-default">
                {teams.map((team) => (
                  <SelectItem
                    key={team.teamId}
                    value={team.teamId}
                    className="text-text-primary hover:bg-surface-2"
                  >
                    {team.teamName}
                    {team.teamId === currentTeamId && " (current)"}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
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
              disabled={loading || !selectedTeamId || selectedTeamId === currentTeamId}
              className="bg-brand hover:bg-brand-hover text-white min-w-[110px]"
              style={{ transitionDuration: "var(--transition-fast)" }}
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Moving…
                </>
              ) : (
                "Reassign"
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
