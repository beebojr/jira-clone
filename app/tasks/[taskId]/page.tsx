import { getTask, getUsers, deleteTask } from "@/lib/actions/tasks";
import { getComments } from "@/lib/actions/comments";
import { getAuthUser } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Trash2, Clock, Layers, LogOut, User } from "lucide-react";
import { CommentThread } from "@/components/tasks/CommentThread";
import { ImageUpload } from "@/components/tasks/ImageUpload";
import { TaskEditPanel } from "@/components/tasks/TaskEditPanel";
import { TaskStatusControl } from "@/components/tasks/TaskStatusControl";
import { signOut } from "@/lib/actions/auth";

// Named server action for delete — avoids inline closure issues
async function handleDeleteTask(taskId: string, projectId: string) {
  "use server";
  await deleteTask(taskId);
  redirect(`/board/${projectId}`);
}

const STATUS_COLORS: Record<string, string> = {
  TODO: "bg-status-todo/15 text-text-secondary border-status-todo/20",
  IN_PROGRESS: "bg-status-progress/15 text-brand border-status-progress/20",
  IN_REVIEW: "bg-status-review/15 text-warning border-status-review/20",
  DONE: "bg-status-done/15 text-success border-status-done/20",
};

export default async function TaskDetailPage({
  params,
}: {
  params: Promise<{ taskId: string }>;
}) {
  const user = await getAuthUser();
  if (!user) redirect("/login");

  const { taskId } = await params;

  let task;
  try {
    task = await getTask(taskId);
  } catch (e: unknown) {
    if (e instanceof Error && e.message.includes("FORBIDDEN"))
      redirect("/dashboard");
    throw e;
  }

  if (!task) notFound();

  const [comments, users] = await Promise.all([getComments(taskId), getUsers()]);

  const isManager = user.role === "MANAGER" || user.role === "ADMIN";
  const isAssigned = task.assigneeId === user.userId;
  const canChangeStatus = true; // Everyone who can view the task can change its status
  const isOverdue =
    task.deadline &&
    new Date(task.deadline) < new Date() &&
    task.status !== "DONE";

  // Bind the server action with the specific task params
  const deleteThisTask = handleDeleteTask.bind(null, task.taskId, task.projectId);

  return (
    <div className="min-h-screen bg-surface-0 text-text-primary">
      {/* ── Navigation ────────────────────────────────────────────── */}
      <nav
        className="sticky top-0 border-b border-border-default bg-surface-0/80 backdrop-blur-sm px-4 sm:px-6 py-3 flex items-center justify-between"
        style={{ zIndex: "var(--z-nav)" }}
      >
        <div className="flex items-center gap-3 min-w-0">
          <Link
            href={`/board/${task.projectId}`}
            className="flex items-center justify-center w-8 h-8 rounded-lg hover:bg-surface-2 transition-colors text-text-tertiary hover:text-text-primary flex-shrink-0"
            style={{ transitionDuration: "var(--transition-fast)" }}
            title="Back to Board"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="sr-only">Back to Board</span>
          </Link>
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-text-tertiary text-sm hidden sm:inline">
              Task Details
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
          <Badge
            variant="outline"
            className="text-text-secondary border-border-default text-xs font-medium hidden sm:inline-flex"
          >
            {user.role}
          </Badge>
          <form action={signOut}>
            <Button
              type="submit"
              variant="ghost"
              size="sm"
              title="Sign out"
              className="text-text-tertiary hover:text-text-primary cursor-pointer transition-colors h-8 w-8 p-0"
              style={{ transitionDuration: "var(--transition-fast)" }}
            >
              <LogOut className="w-4 h-4" />
              <span className="sr-only">Sign out</span>
            </Button>
          </form>
        </div>
      </nav>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-8 space-y-8">
        {/* ── Task Header ───────────────────────────────────────────── */}
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <h1 className="text-2xl font-semibold tracking-tight text-text-primary mb-4 leading-tight">
              {task.title}
            </h1>

            <div className="flex flex-wrap gap-2 mb-6">
              {/* Status badge — color-coded */}
              <Badge
                className={`border text-xs font-medium ${STATUS_COLORS[task.status] ?? "bg-surface-1 border-border-default text-text-secondary"}`}
              >
                {task.status.replace(/_/g, " ")}
              </Badge>

              {/* Priority badge */}
              <Badge
                className="border-transparent font-medium text-xs"
                style={{
                  backgroundColor: `var(--priority-${task.priority.toLowerCase()})`,
                  color: `var(--priority-${task.priority.toLowerCase()}-text)`,
                }}
              >
                {task.priority}
              </Badge>

              {/* Team badge */}
              <Badge
                variant="outline"
                className="bg-surface-1 border-border-default text-text-secondary flex items-center gap-1.5 text-xs"
              >
                <Layers className="w-3 h-3 text-text-tertiary" />
                {task.teamId}
              </Badge>

              {/* Deadline badge */}
              {task.deadline && (
                <Badge
                  variant="outline"
                  className={`bg-surface-1 border text-xs flex items-center gap-1.5 ${
                    isOverdue
                      ? "border-danger/30 text-danger"
                      : "border-border-default text-text-secondary"
                  }`}
                >
                  <Clock className="w-3 h-3" />
                  {isOverdue ? "Overdue · " : "Due: "}
                  {new Date(task.deadline).toLocaleDateString(undefined, {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })}
                </Badge>
              )}

              {/* Assignee badge */}
              {task.assigneeId && (
                <Badge
                  variant="outline"
                  className="bg-surface-1 border-border-default text-text-secondary flex items-center gap-1.5 text-xs"
                >
                  <User className="w-3 h-3 text-text-tertiary" />
                  {task.assigneeId}
                </Badge>
              )}
            </div>

            {/* Status Change Control — available to manager or assigned employee */}
            {canChangeStatus && (
              <TaskStatusControl taskId={task.taskId} currentStatus={task.status} />
            )}

            {/* Description */}
            <div
              className="bg-surface-1 rounded-xl p-5 border border-border-subtle"
              style={{ boxShadow: "var(--shadow-xs)" }}
            >
              <h3 className="text-xs font-medium text-text-tertiary uppercase tracking-wider mb-3">
                Description
              </h3>
              <p className="text-text-primary whitespace-pre-wrap leading-relaxed text-sm">
                {task.description || (
                  <span className="text-text-tertiary italic">
                    No description provided.
                  </span>
                )}
              </p>
            </div>

            {isManager && (
              <TaskEditPanel
                task={task}
                users={users.filter(
                  (u) => u.teamId === task.teamId || u.userId === task.assigneeId
                )}
              />
            )}
          </div>

          {/* Delete button (manager/admin only) */}
          {isManager && (
            <form action={deleteThisTask} className="flex-shrink-0">
              <Button
                type="submit"
                variant="destructive"
                size="sm"
                className="bg-danger hover:bg-danger-hover text-white w-full sm:w-auto"
                style={{ transitionDuration: "var(--transition-fast)" }}
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Delete Task
              </Button>
            </form>
          )}
        </div>

        {/* ── Attachments + Comments (60/40 layout) ─────────────── */}
        <div
          className="grid grid-cols-1 lg:grid-cols-5 gap-6 pt-6 border-t border-border-subtle"
        >
          {/* Attachments — 2/5 width on large screens */}
          <div className="lg:col-span-2 space-y-4">
            <h3 className="text-sm font-semibold tracking-tight text-text-primary">
              Attachments
            </h3>

            {task.imageThumbnailUrl && (
              <div className="rounded-xl overflow-hidden border border-border-default bg-surface-1 p-2">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={task.imageOriginalUrl || task.imageThumbnailUrl}
                  alt="Task attachment"
                  className="rounded-lg w-full h-auto object-contain max-h-64"
                  loading="lazy"
                />
              </div>
            )}

            <ImageUpload taskId={task.taskId} />
          </div>

          {/* Comments — 3/5 width on large screens */}
          <div className="lg:col-span-3">
            <CommentThread
              taskId={task.taskId}
              initialComments={comments}
              currentUserId={user.userId}
            />
          </div>
        </div>
      </main>
    </div>
  );
}
