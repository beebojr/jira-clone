"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { deleteProject } from "@/lib/actions/projects";
import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";

interface DeleteProjectButtonProps {
  projectId: string;
  projectName: string;
}

export function DeleteProjectButton({ projectId, projectName }: DeleteProjectButtonProps) {
  const router = useRouter();
  const [isDeleting, setIsDeleting] = useState(false);

  async function handleDelete(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();

    if (!confirm(`Delete project "${projectName}"? This cannot be undone.`)) {
      return;
    }

    setIsDeleting(true);
    try {
      await deleteProject(projectId);
      toast.success("Project deleted successfully");
      router.refresh();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to delete project";
      toast.error(message);
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <Button
      onClick={handleDelete}
      disabled={isDeleting}
      variant="ghost"
      size="sm"
      className="absolute top-3 right-3 text-danger hover:bg-danger/10 hover:text-danger opacity-0 group-hover:opacity-100 transition-opacity"
      style={{ transitionDuration: "var(--transition-fast)" }}
      title="Delete project"
      aria-label={`Delete ${projectName}`}
    >
      <Trash2 className="w-4 h-4" />
    </Button>
  );
}
