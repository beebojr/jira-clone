"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { deleteTask } from "@/lib/actions/tasks";
import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";

interface DeleteTaskButtonProps {
  taskId: string;
  projectId: string;
  taskTitle: string;
}

export function DeleteTaskButton({ taskId, projectId, taskTitle }: DeleteTaskButtonProps) {
  const router = useRouter();
  const [isDeleting, setIsDeleting] = useState(false);

  async function handleDelete() {
    if (!confirm(`Delete task "${taskTitle}"? This cannot be undone.`)) {
      return;
    }

    setIsDeleting(true);
    try {
      await deleteTask(taskId);
      toast.success("Task deleted successfully");
      router.push(`/board/${projectId}`);
      router.refresh();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to delete task";
      toast.error(message);
      setIsDeleting(false); // Only reset if failed, since success redirects
    }
  }

  return (
    <Button
      onClick={handleDelete}
      disabled={isDeleting}
      variant="destructive"
      size="sm"
      className="bg-danger hover:bg-danger-hover text-white w-full sm:w-auto"
      style={{ transitionDuration: "var(--transition-fast)" }}
    >
      <Trash2 className="w-4 h-4 mr-2" />
      {isDeleting ? "Deleting..." : "Delete Task"}
    </Button>
  );
}
