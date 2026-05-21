import { getTasks, getUsers } from "@/lib/actions/tasks";
import { getTeams, getProject } from "@/lib/actions/projects";
import { getAuthUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import Link from "next/link";
import { KanbanBoard } from "@/components/kanban/KanbanBoard";
import { CreateTaskModal } from "@/components/tasks/CreateTaskModal";
import { Layers, ArrowLeft, LogOut } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { signOut } from "@/lib/actions/auth";

function BoardSkeleton() {
  return (
    <div className="flex gap-4 overflow-x-auto pb-6">
      {[1, 2, 3, 4].map((i) => (
        <div key={i} className="flex-shrink-0 w-72">
          {/* Column header skeleton */}
          <div className="flex items-center gap-2 mb-3 px-1">
            <div className="w-2.5 h-2.5 rounded-full shimmer" />
            <div className="h-4 w-20 rounded shimmer" />
            <div className="h-5 w-6 rounded ml-auto shimmer" />
          </div>
          {/* Cards skeleton */}
          <div
            className="rounded-xl p-2 space-y-2 border border-transparent"
            style={{ background: "var(--surface-1)" }}
          >
            {[1, 2, 3].map((j) => (
              <div
                key={j}
                className="h-24 rounded-lg shimmer"
                style={{ opacity: 1 - (j - 1) * 0.15 }}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

export default async function BoardPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const user = await getAuthUser();
  if (!user) redirect("/login");

  const { projectId } = await params;

  const [tasks, users, teams, project] = await Promise.all([
    getTasks(projectId),
    getUsers(),
    getTeams(),
    getProject(projectId),
  ]);

  return (
    <div className="min-h-screen bg-surface-0 text-text-primary">
      {/* ── Navigation ───────────────────────────────────────────── */}
      <nav
        className="sticky top-0 border-b border-border-default bg-surface-0/80 backdrop-blur-sm px-4 sm:px-6 py-3 flex items-center justify-between"
        style={{ zIndex: "var(--z-nav)" }}
      >
        <div className="flex items-center gap-3 min-w-0">
          <Link
            href="/dashboard"
            className="flex items-center justify-center w-8 h-8 rounded-lg hover:bg-surface-2 transition-colors text-text-tertiary hover:text-text-primary flex-shrink-0"
            style={{ transitionDuration: "var(--transition-fast)" }}
            title="Back to Dashboard"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="sr-only">Back to Dashboard</span>
          </Link>
          <div className="flex items-center gap-2 min-w-0">
            <Layers className="w-4 h-4 text-brand flex-shrink-0" />
            <h1 className="text-base sm:text-lg font-semibold tracking-tight truncate">
              {project?.projectName || "Board"}
            </h1>
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

      <main className="px-4 sm:px-6 py-6">
        {/* ── Board Header ─────────────────────────────────────────── */}
        <div className="flex flex-wrap items-center gap-3 justify-between mb-5">
          <div className="flex items-center gap-3">
            <h2 className="text-xl font-semibold tracking-tight">Board</h2>
            <Badge
              variant="outline"
              className="text-text-tertiary border-border-default text-xs tabular-nums"
            >
              {tasks.length} task{tasks.length !== 1 ? "s" : ""}
            </Badge>
          </div>
          <CreateTaskModal
            projectId={projectId}
            userRole={user.role}
            users={users}
            teams={teams}
          />
        </div>

        <Suspense fallback={<BoardSkeleton />}>
          <KanbanBoard
            initialTasks={tasks}
            userRole={user.role}
            teams={teams}
          />
        </Suspense>
      </main>
    </div>
  );
}
