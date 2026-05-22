"use client";

import { useState } from "react";
import { deleteTeam, updateTeam } from "@/lib/actions/teams";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  Users,
  Trash2,
  Pencil,
  Check,
  X,
  Loader2,
  User,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { AssignUserToTeamModal } from "./AssignUserToTeamModal";

interface TeamMember {
  userId: string;
  fullName: string;
  email: string;
  role: string;
  teamId: string;
}

interface TeamCardProps {
  teamId: string;
  teamName: string;
  members: TeamMember[];
  allTeams: { teamId: string; teamName: string }[];
  isManager: boolean;
}

export function TeamCard({
  teamId,
  teamName,
  members,
  allTeams,
  isManager,
}: TeamCardProps) {
  const router = useRouter();
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(teamName);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  async function handleSaveName() {
    if (!editName.trim() || editName.trim() === teamName) {
      setIsEditing(false);
      setEditName(teamName);
      return;
    }
    setIsSaving(true);
    try {
      await updateTeam(teamId, { teamName: editName.trim() });
      toast.success(`Team renamed to "${editName.trim()}"`);
      setIsEditing(false);
      router.refresh();
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Failed to rename team";
      toast.error(message);
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDelete() {
    if (!confirm(`Delete team "${teamName}"? This cannot be undone.`)) return;
    setIsDeleting(true);
    try {
      await deleteTeam(teamId);
      toast.success(`Team "${teamName}" deleted`);
      router.refresh();
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Failed to delete team";
      toast.error(message);
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <Card
      className="border-border-subtle bg-surface-1 hover:border-border-default transition-all group"
      style={{
        transitionDuration: "var(--transition-fast)",
        boxShadow: "var(--shadow-xs)",
      }}
    >
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between gap-2">
          {isEditing && isManager ? (
            <div className="flex items-center gap-1.5 flex-1 min-w-0">
              <Input
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                className="h-8 bg-surface-2 border-border-default text-sm font-medium text-text-primary"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleSaveName();
                  if (e.key === "Escape") {
                    setIsEditing(false);
                    setEditName(teamName);
                  }
                }}
              />
              <button
                onClick={handleSaveName}
                disabled={isSaving}
                className="p-1 rounded-md hover:bg-success/15 text-success cursor-pointer transition-colors"
                title="Save"
              >
                {isSaving ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Check className="w-3.5 h-3.5" />
                )}
              </button>
              <button
                onClick={() => {
                  setIsEditing(false);
                  setEditName(teamName);
                }}
                className="p-1 rounded-md hover:bg-danger/15 text-danger cursor-pointer transition-colors"
                title="Cancel"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <CardTitle className="text-base text-text-primary flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-brand/10 flex items-center justify-center flex-shrink-0">
                <Users className="w-3.5 h-3.5 text-brand" />
              </div>
              <span className="truncate">{teamName}</span>
            </CardTitle>
          )}

          {!isEditing && isManager && (
            <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
              <button
                onClick={() => setIsEditing(true)}
                className="p-1.5 rounded-md hover:bg-surface-2 text-text-tertiary hover:text-text-primary cursor-pointer transition-colors"
                title="Rename team"
              >
                <Pencil className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={handleDelete}
                disabled={isDeleting}
                className="p-1.5 rounded-md hover:bg-danger/10 text-text-tertiary hover:text-danger cursor-pointer transition-colors"
                title="Delete team"
              >
                {isDeleting ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Trash2 className="w-3.5 h-3.5" />
                )}
              </button>
            </div>
          )}
        </div>
      </CardHeader>

      <CardContent className="pt-0">
        <div className="flex items-center gap-2 mb-3 pt-1">
          <Badge
            variant="outline"
            className="text-[10px] py-0 px-1.5 border-border-default text-text-tertiary"
          >
            {members.length} member{members.length !== 1 ? "s" : ""}
          </Badge>
        </div>

        {/* Member list */}
        {members.length === 0 ? (
          <p className="text-xs text-text-tertiary italic py-3 text-center">
            No members assigned yet.
          </p>
        ) : (
          <div className="space-y-1.5 max-h-[200px] overflow-y-auto">
            {members.map((member) => (
              <div
                key={member.userId}
                className="flex items-center justify-between gap-2 px-2 py-1.5 rounded-lg hover:bg-surface-2/60 transition-colors group/member"
                style={{ transitionDuration: "var(--transition-fast)" }}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <div className="w-6 h-6 rounded-full bg-surface-3 flex items-center justify-center flex-shrink-0">
                    <User className="w-3 h-3 text-text-tertiary" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-medium text-text-primary truncate leading-tight">
                      {member.fullName}
                    </p>
                    <p className="text-[10px] text-text-tertiary truncate leading-tight">
                      {member.email}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 flex-shrink-0">
                  <Badge
                    variant="outline"
                    className="text-[9px] py-0 px-1 border-border-subtle text-text-tertiary"
                  >
                    {member.role}
                  </Badge>
                  {isManager && (
                    <div className="opacity-0 group-hover/member:opacity-100 transition-opacity">
                      <AssignUserToTeamModal
                        userId={member.userId}
                        userName={member.fullName}
                        currentTeamId={teamId}
                        teams={allTeams}
                      />
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
