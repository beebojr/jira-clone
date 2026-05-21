import { getProjects, getTeams } from "@/lib/actions/projects";
import { getTasks, getMyTasks } from "@/lib/actions/tasks";
import { getAuthUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DeleteProjectButton } from "@/components/tasks/DeleteProjectButton";
import {
  Layers,
  Clock,
  CheckCircle2,
  AlertCircle,
  LogOut,
  Users,
  TrendingUp,
} from "lucide-react";
import { signOut } from "@/lib/actions/auth";
import { CreateProjectModal } from "@/components/tasks/CreateProjectModal";

export default async function DashboardPage() {
  const user = await getAuthUser();
  if (!user) redirect("/login");

  const projects = await getProjects();

  // ⚠️ Spec: query via GSI_Assignee — "tasks assigned to me" for every role
  const myTasks = await getMyTasks();
  const myOpenTasks = myTasks.filter((t) => t.status !== "DONE");
  const myDoneTasks = myTasks.filter((t) => t.status === "DONE");

  // Manager/Admin: aggregate team stats across all projects
  const isManager = user.role === "MANAGER" || user.role === "ADMIN";
  let teamStats: Record<string, { open: number; done: number; teamName: string }> = {};

  if (isManager) {
    const teams = await getTeams();
    // Build a teamName lookup
    const teamMap = Object.fromEntries(
      teams.map((t) => [t.teamId, t.teamName])
    );

    for (const p of projects) {
      const pTasks = await getTasks(p.projectId);
      for (const t of pTasks) {
        if (!teamStats[t.teamId]) {
          teamStats[t.teamId] = {
            open: 0,
            done: 0,
            teamName: teamMap[t.teamId] || t.teamId,
          };
        }
        if (t.status === "DONE") teamStats[t.teamId].done++;
        else teamStats[t.teamId].open++;
      }
    }
  }

  const teamEntries = Object.entries(teamStats);

  return (
    <div className="min-h-screen bg-surface-0 text-text-primary">
      {/* ── Navigation ────────────────────────────────────────────── */}
      <nav
        className="sticky top-0 border-b border-border-default bg-surface-0/80 backdrop-blur-sm px-4 sm:px-6 py-3 flex items-center justify-between"
        style={{ zIndex: "var(--z-nav)" }}
      >
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-brand/15">
            <Layers className="w-4 h-4 text-brand" />
          </div>
          <h1 className="text-lg font-semibold tracking-tight text-text-primary">
            JiraClone
          </h1>
        </div>

        <div className="flex items-center gap-3">
          <Badge
            variant="outline"
            className="text-text-secondary border-border-default text-xs font-medium hidden sm:inline-flex"
          >
            {user.role}
          </Badge>
          <span className="text-text-tertiary text-sm hidden md:inline truncate max-w-[200px]">
            {user.email}
          </span>
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

      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
        {/* ── Greeting ────────────────────────────────────────────── */}
        <div className="mb-8">
          <h2 className="text-2xl font-semibold tracking-tight">
            Good{getTimeOfDayGreeting()},{" "}
            <span className="text-brand">{user.fullName.split(" ")[0]}</span>
          </h2>
          <p className="text-text-tertiary text-sm mt-1">
            {isManager
              ? `You're managing ${projects.length} project${projects.length !== 1 ? "s" : ""}.`
              : `You have ${myOpenTasks.length} open task${myOpenTasks.length !== 1 ? "s" : ""} assigned to you.`}
          </p>
        </div>

        {/* ── Stats Row ───────────────────────────────────────────── */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4 mb-10">
          <Card
            className="border-border-subtle bg-surface-1"
            style={{ boxShadow: "var(--shadow-xs)" }}
          >
            <CardContent className="pt-5 pb-4 px-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-text-tertiary text-xs font-medium uppercase tracking-wider">
                    Open Tasks
                  </p>
                  <p className="text-2xl font-semibold tracking-tight mt-1 tabular-nums">
                    {myOpenTasks.length}
                  </p>
                </div>
                <div className="w-10 h-10 rounded-xl bg-brand/10 flex items-center justify-center flex-shrink-0">
                  <Clock className="w-5 h-5 text-brand" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card
            className="border-border-subtle bg-surface-1"
            style={{ boxShadow: "var(--shadow-xs)" }}
          >
            <CardContent className="pt-5 pb-4 px-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-text-tertiary text-xs font-medium uppercase tracking-wider">
                    Completed
                  </p>
                  <p className="text-2xl font-semibold tracking-tight mt-1 tabular-nums">
                    {myDoneTasks.length}
                  </p>
                </div>
                <div className="w-10 h-10 rounded-xl bg-success/10 flex items-center justify-center flex-shrink-0">
                  <CheckCircle2 className="w-5 h-5 text-success" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card
            className="border-border-subtle bg-surface-1 col-span-2 sm:col-span-1"
            style={{ boxShadow: "var(--shadow-xs)" }}
          >
            <CardContent className="pt-5 pb-4 px-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-text-tertiary text-xs font-medium uppercase tracking-wider">
                    Projects
                  </p>
                  <p className="text-2xl font-semibold tracking-tight mt-1 tabular-nums">
                    {projects.length}
                  </p>
                </div>
                <div className="w-10 h-10 rounded-xl bg-warning/10 flex items-center justify-center flex-shrink-0">
                  <Layers className="w-5 h-5 text-warning" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* ── Team Summary (Manager/Admin only) ─────────────────── */}
        {isManager && teamEntries.length > 0 && (
          <section className="mb-10">
            <div className="flex items-center gap-2 mb-4">
              <TrendingUp className="w-4 h-4 text-text-tertiary" />
              <h2 className="text-base font-semibold tracking-tight">
                Team Summary
              </h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {teamEntries.map(([teamId, stats]) => {
                const total = stats.open + stats.done;
                const pct = total > 0 ? Math.round((stats.done / total) * 100) : 0;
                return (
                  <Card
                    key={teamId}
                    className="border-border-subtle bg-surface-1"
                    style={{ boxShadow: "var(--shadow-xs)" }}
                  >
                    <CardContent className="pt-4 pb-4 px-5">
                      <div className="flex items-center gap-2 mb-3">
                        <div className="w-7 h-7 rounded-lg bg-surface-2 flex items-center justify-center flex-shrink-0">
                          <Users className="w-3.5 h-3.5 text-text-tertiary" />
                        </div>
                        <p className="text-sm font-medium text-text-primary truncate">
                          {stats.teamName}
                        </p>
                      </div>
                      <div className="flex items-center gap-3 mb-3">
                        <Badge
                          variant="outline"
                          className="text-text-secondary border-border-default text-xs"
                        >
                          {stats.open} open
                        </Badge>
                        <Badge className="bg-success/15 text-success border-success/20 border text-xs">
                          {stats.done} done
                        </Badge>
                      </div>
                      {/* Progress bar */}
                      <div className="h-1.5 bg-surface-2 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-success rounded-full transition-all"
                          style={{
                            width: `${pct}%`,
                            transitionDuration: "var(--transition-slow)",
                          }}
                        />
                      </div>
                      <p className="text-xs text-text-tertiary mt-1.5 text-right tabular-nums">
                        {pct}% done
                      </p>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </section>
        )}

        {/* ── My Assigned Tasks (GSI_Assignee) ────────────────────── */}
        <section className="mb-10">
          <div className="flex items-center gap-3 mb-4">
            <h2 className="text-base font-semibold tracking-tight">
              My Assigned Tasks
            </h2>
            <Badge
              variant="outline"
              className="text-text-tertiary border-border-default text-xs"
            >
              {myOpenTasks.length} open
            </Badge>
          </div>

          {myOpenTasks.length === 0 ? (
            <Card
              className="border-border-subtle bg-surface-1"
              style={{ boxShadow: "var(--shadow-xs)" }}
            >
              <CardContent className="py-10 text-center">
                <CheckCircle2 className="w-8 h-8 text-success mx-auto mb-3 opacity-60" />
                <p className="text-text-secondary text-sm font-medium">
                  All caught up!
                </p>
                <p className="text-text-tertiary text-xs mt-1">
                  No open tasks assigned to you.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {myOpenTasks.slice(0, 6).map((t) => {
                const isOverdue =
                  t.deadline &&
                  new Date(t.deadline) < new Date() &&
                  t.status !== "DONE";

                return (
                  <Link key={t.taskId} href={`/tasks/${t.taskId}`}>
                    <Card
                      className="border-border-subtle bg-surface-1 hover:border-brand/40 transition-all cursor-pointer group h-full"
                      style={{
                        transitionDuration: "var(--transition-fast)",
                        boxShadow: "var(--shadow-xs)",
                      }}
                    >
                      <CardContent className="py-3 px-4">
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <p className="text-sm font-medium text-text-primary line-clamp-2 group-hover:text-brand transition-colors leading-snug" style={{ transitionDuration: "var(--transition-fast)" }}>
                            {t.title}
                          </p>
                          {isOverdue && (
                            <AlertCircle className="w-4 h-4 text-danger flex-shrink-0 mt-0.5" />
                          )}
                        </div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs text-text-tertiary">
                            {t.status.replace(/_/g, " ")}
                          </span>
                          <span className="text-text-tertiary opacity-50">·</span>
                          <span
                            className="text-xs px-1.5 py-0.5 rounded font-medium"
                            style={{
                              backgroundColor: `var(--priority-${t.priority.toLowerCase()})`,
                              color: `var(--priority-${t.priority.toLowerCase()}-text)`,
                            }}
                          >
                            {t.priority}
                          </span>
                          {t.deadline && (
                            <>
                              <span className="text-text-tertiary opacity-50">·</span>
                              <span className={`text-xs ${isOverdue ? "text-danger" : "text-text-tertiary"}`}>
                                {new Date(t.deadline).toLocaleDateString(undefined, {
                                  month: "short",
                                  day: "numeric",
                                })}
                              </span>
                            </>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                );
              })}
              {myOpenTasks.length > 6 && (
                <div className="flex items-center justify-center text-text-tertiary text-sm col-span-full">
                  +{myOpenTasks.length - 6} more tasks
                </div>
              )}
            </div>
          )}
        </section>

        {/* ── Projects ────────────────────────────────────────────── */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-semibold tracking-tight">Projects</h2>
            {isManager && <CreateProjectModal userRole={user.role} />}
          </div>

          {projects.length === 0 ? (
            <Card
              className="border-border-subtle bg-surface-1"
              style={{ boxShadow: "var(--shadow-xs)" }}
            >
              <CardContent className="py-16 text-center">
                <Layers className="w-10 h-10 text-text-tertiary mx-auto mb-3 opacity-30" />
                <p className="text-text-secondary text-sm font-medium">
                  No projects yet
                </p>
                <p className="text-text-tertiary text-xs mt-1">
                  {isManager
                    ? "Create your first project to get started."
                    : "Ask your manager to create a project."}
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {projects.map((project) => (
                <Link
                  key={project.projectId}
                  href={`/board/${project.projectId}`}
                  className="border-border-subtle bg-surface-1 hover:border-brand/40 transition-all cursor-pointer group h-full relative"
                >
                  <Card
                    className="border-border-subtle bg-surface-1 hover:border-brand/40 transition-all cursor-pointer group h-full"
                    style={{
                      transitionDuration: "var(--transition-fast)",
                      boxShadow: "var(--shadow-xs)",
                    }}
                  >
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base text-text-primary flex items-center gap-2 group-hover:text-brand transition-colors" style={{ transitionDuration: "var(--transition-fast)" }}>
                        <div className="w-7 h-7 rounded-lg bg-brand/10 flex items-center justify-center flex-shrink-0 group-hover:bg-brand/20 transition-colors" style={{ transitionDuration: "var(--transition-fast)" }}>
                          <Layers className="w-3.5 h-3.5 text-brand" />
                        </div>
                        <span className="line-clamp-1">
                          {project.projectName}
                        </span>
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <p className="text-text-secondary text-sm line-clamp-2 leading-relaxed min-h-[2.5rem]">
                        {project.description || "No description"}
                      </p>
                      <p className="text-text-tertiary text-xs mt-3 flex items-center justify-between">
                        <span>
                          Created{" "}
                          {new Date(project.createdAt).toLocaleDateString(
                            undefined,
                            { year: "numeric", month: "short", day: "numeric" }
                          )}
                        </span>
                        {isManager && <DeleteProjectButton projectId={project.projectId} projectName={project.projectName} />}
                      </p>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}

/** Returns "morning", "afternoon", or "evening" based on server time. */
function getTimeOfDayGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "morning";
  if (hour < 17) return "afternoon";
  return "evening";
}
