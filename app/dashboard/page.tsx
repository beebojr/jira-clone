import { getProjects, getTeams } from "@/lib/actions/projects";
import { getTasks, getMyTasks, getRecentAuditLogs } from "@/lib/actions/tasks";
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
  Activity,
  BarChart4,
  ArrowRight,
} from "lucide-react";
import { signOut } from "@/lib/actions/auth";
import { CreateProjectModal } from "@/components/tasks/CreateProjectModal";

import { Navbar } from "@/components/Navbar";

export default async function DashboardPage() {
  const user = await getAuthUser();
  if (!user) redirect("/login");

  const projects = await getProjects();

  // ⚠️ Spec: query via GSI_Assignee — "tasks assigned to me" for every role
  const myTasks = await getMyTasks();
  const myOpenTasks = myTasks.filter((t) => t.status !== "DONE");
  const myDoneTasks = myTasks.filter((t) => t.status === "DONE");

  // Fetch recent audit logs from real DynamoDB
  const recentLogs = await getRecentAuditLogs().catch(() => []);

  // Manager/Admin: aggregate team stats across all projects
  const isManager = user.role === "MANAGER" || user.role === "ADMIN";
  let teamStats: Record<string, { open: number; done: number; teamName: string }> = {};

  // Aggregate stats & count all tasks for manager priority charts
  let priorityTasks = [...myTasks];
  if (isManager) {
    const teams = await getTeams();
    const teamMap = Object.fromEntries(
      teams.map((t) => [t.teamId, t.teamName])
    );

    const allTasks: typeof myTasks = [];
    for (const p of projects) {
      const pTasks = await getTasks(p.projectId);
      allTasks.push(...pTasks);
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
    priorityTasks = allTasks;
  }

  const teamEntries = Object.entries(teamStats);

  // Compute priority percentages for visual dashboard widgets
  const lowCount = priorityTasks.filter(t => t.priority === 'LOW').length;
  const mediumCount = priorityTasks.filter(t => t.priority === 'MEDIUM').length;
  const highCount = priorityTasks.filter(t => t.priority === 'HIGH').length;
  const totalPriorityTasks = lowCount + mediumCount + highCount;

  const lowPct = totalPriorityTasks > 0 ? Math.round((lowCount / totalPriorityTasks) * 100) : 0;
  const mediumPct = totalPriorityTasks > 0 ? Math.round((mediumCount / totalPriorityTasks) * 100) : 0;
  const highPct = totalPriorityTasks > 0 ? Math.round((highCount / totalPriorityTasks) * 100) : 0;

  return (
    <div className="min-h-screen bg-surface-0 text-text-primary">
      {/* ── Global Navigation ─────────────────────────────────────── */}
      <Navbar user={user} projects={projects} myTasks={myTasks} />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        {/* ── Greeting ────────────────────────────────────────────── */}
        <div className="mb-8">
          <h2 className="text-2xl font-semibold tracking-tight">
            Good {getTimeOfDayGreeting()},{" "}
            <span className="text-brand">{user.fullName.split(" ")[0]}</span>
          </h2>
          <p className="text-text-tertiary text-sm mt-1">
            {isManager
              ? `You're managing ${projects.length} project${projects.length !== 1 ? "s" : ""} across your workspace.`
              : `You have ${myOpenTasks.length} open task${myOpenTasks.length !== 1 ? "s" : ""} assigned to you.`}
          </p>
        </div>

        {/* ── Stats Row ───────────────────────────────────────────── */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4 mb-8">
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

        {/* ── 3-Column Grid Dashboard ──────────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
          {/* Main workspace (Left - 2 Columns) */}
          <div className="lg:col-span-2 space-y-8">
            {/* ── My Assigned Tasks (GSI_Assignee) ────────────────────── */}
            <section>
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
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
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
                          <CardContent className="py-3.5 px-4 flex flex-col justify-between h-full space-y-3">
                            <div className="flex items-start justify-between gap-2">
                              <p className="text-sm font-medium text-text-primary line-clamp-2 group-hover:text-brand transition-colors leading-snug">
                                {t.title}
                              </p>
                              {isOverdue && (
                                <AlertCircle className="w-4 h-4 text-danger flex-shrink-0 mt-0.5" />
                              )}
                            </div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-xs text-text-tertiary font-medium">
                                {t.status.replace(/_/g, " ")}
                              </span>
                              <span className="text-text-tertiary opacity-30">·</span>
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
                                  <span className="text-text-tertiary opacity-30">·</span>
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
                    <div className="flex items-center justify-center text-text-tertiary text-xs col-span-full pt-1.5 font-medium hover:text-brand transition-colors">
                      <Link href="/dashboard" className="flex items-center gap-1.5">
                        +{myOpenTasks.length - 6} more tasks assigned to you <ArrowRight className="w-3.5 h-3.5" />
                      </Link>
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
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {projects.map((project) => (
                    <Link
                      key={project.projectId}
                      href={`/board/${project.projectId}`}
                      className="h-full block"
                    >
                      <Card
                        className="border-border-subtle bg-surface-1 hover:border-brand/40 transition-all cursor-pointer group h-full"
                        style={{
                          transitionDuration: "var(--transition-fast)",
                          boxShadow: "var(--shadow-xs)",
                        }}
                      >
                        <CardHeader className="pb-2">
                          <CardTitle className="text-base text-text-primary flex items-center gap-2 group-hover:text-brand transition-colors">
                            <div className="w-7 h-7 rounded-lg bg-brand/10 flex items-center justify-center flex-shrink-0 group-hover:bg-brand/20 transition-colors">
                              <Layers className="w-3.5 h-3.5 text-brand" />
                            </div>
                            <span className="line-clamp-1">
                              {project.projectName}
                            </span>
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="pt-0 flex flex-col justify-between min-h-[5.5rem]">
                          <p className="text-text-secondary text-sm line-clamp-2 leading-relaxed mb-3">
                            {project.description || "No description"}
                          </p>
                          <p className="text-text-tertiary text-xs flex items-center justify-between pt-2 border-t border-border-subtle mt-auto">
                            <span>
                              Created{" "}
                              {new Date(project.createdAt).toLocaleDateString(
                                undefined,
                                { year: "numeric", month: "short", day: "numeric" }
                              )}
                            </span>
                            {isManager && (
                              <DeleteProjectButton projectId={project.projectId} projectName={project.projectName} />
                            )}
                          </p>
                        </CardContent>
                      </Card>
                    </Link>
                  ))}
                </div>
              )}
            </section>
          </div>

          {/* Sidebar Area (Right - 1 Column) */}
          <div className="space-y-6">
            {/* ── Task Priority Distribution ───────────────────────── */}
            <Card className="border-border-subtle bg-surface-1">
              <CardHeader className="pb-3 pt-4 px-5">
                <CardTitle className="text-sm font-semibold tracking-tight flex items-center gap-2 text-text-secondary">
                  <BarChart4 className="w-4 h-4 text-brand" />
                  Task Priority Distribution
                </CardTitle>
              </CardHeader>
              <CardContent className="px-5 pb-5 pt-0">
                {totalPriorityTasks === 0 ? (
                  <p className="text-xs text-text-tertiary italic text-center py-4">No tasks found to analyze.</p>
                ) : (
                  <div className="space-y-4">
                    {/* Visual Segmented Progress Bar */}
                    <div className="h-2.5 rounded-full overflow-hidden flex bg-surface-2">
                      {highCount > 0 && (
                        <div
                          className="h-full bg-danger transition-all"
                          style={{ width: `${highPct}%` }}
                          title={`High Priority: ${highCount} tasks (${highPct}%)`}
                        />
                      )}
                      {mediumCount > 0 && (
                        <div
                          className="h-full bg-warning transition-all"
                          style={{ width: `${mediumPct}%` }}
                          title={`Medium Priority: ${mediumCount} tasks (${mediumPct}%)`}
                        />
                      )}
                      {lowCount > 0 && (
                        <div
                          className="h-full bg-brand transition-all"
                          style={{ width: `${lowPct}%` }}
                          title={`Low Priority: ${lowCount} tasks (${lowPct}%)`}
                        />
                      )}
                    </div>

                    {/* Labels Legend & Counts */}
                    <div className="grid grid-cols-3 gap-2 text-center">
                      <div className="bg-surface-0/40 p-2 rounded-lg border border-border-subtle">
                        <div className="w-2 h-2 rounded-full bg-danger mx-auto mb-1" />
                        <span className="text-[10px] text-text-tertiary font-semibold uppercase tracking-wider">High</span>
                        <p className="text-sm font-semibold text-text-primary mt-0.5">{highCount}</p>
                      </div>
                      <div className="bg-surface-0/40 p-2 rounded-lg border border-border-subtle">
                        <div className="w-2 h-2 rounded-full bg-warning mx-auto mb-1" />
                        <span className="text-[10px] text-text-tertiary font-semibold uppercase tracking-wider">Med</span>
                        <p className="text-sm font-semibold text-text-primary mt-0.5">{mediumCount}</p>
                      </div>
                      <div className="bg-surface-0/40 p-2 rounded-lg border border-border-subtle">
                        <div className="w-2 h-2 rounded-full bg-brand mx-auto mb-1" />
                        <span className="text-[10px] text-text-tertiary font-semibold uppercase tracking-wider">Low</span>
                        <p className="text-sm font-semibold text-text-primary mt-0.5">{lowCount}</p>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* ── Team Summary (Manager/Admin only) ─────────────────── */}
            {isManager && teamEntries.length > 0 && (
              <Card className="border-border-subtle bg-surface-1">
                <CardHeader className="pb-3 pt-4 px-5">
                  <CardTitle className="text-sm font-semibold tracking-tight flex items-center gap-2 text-text-secondary">
                    <Users className="w-4 h-4 text-brand" />
                    Team Summary
                  </CardTitle>
                </CardHeader>
                <CardContent className="px-5 pb-4 pt-0 space-y-3.5">
                  {teamEntries.map(([teamId, stats]) => {
                    const total = stats.open + stats.done;
                    const pct = total > 0 ? Math.round((stats.done / total) * 100) : 0;
                    return (
                      <div key={teamId} className="space-y-1.5">
                        <div className="flex items-center justify-between text-xs">
                          <p className="font-medium text-text-primary truncate max-w-[140px]">
                            {stats.teamName}
                          </p>
                          <div className="flex items-center gap-1.5 text-[10px] font-semibold text-text-tertiary">
                            <span>{stats.open} open</span>
                            <span>·</span>
                            <span className="text-success">{stats.done} done</span>
                          </div>
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
                      </div>
                    );
                  })}
                </CardContent>
              </Card>
            )}

            {/* ── Recent Activity Feed (Live Audit Logs) ──────────────── */}
            <Card className="border-border-subtle bg-surface-1">
              <CardHeader className="pb-3 pt-4 px-5">
                <CardTitle className="text-sm font-semibold tracking-tight flex items-center gap-2 text-text-secondary">
                  <Activity className="w-4 h-4 text-brand" />
                  Recent Workspace Activity
                </CardTitle>
              </CardHeader>
              <CardContent className="px-5 pb-5 pt-0">
                {recentLogs.length === 0 ? (
                  <p className="text-xs text-text-tertiary italic text-center py-4">No workspace events recorded yet.</p>
                ) : (
                  <div className="relative border-l border-border-default pl-4 ml-1 space-y-4 pt-1">
                    {recentLogs.map((log) => (
                      <div key={log.logId} className="relative text-xs">
                        {/* Mini Node Icon indicator */}
                        <span className="absolute -left-[21px] top-1 w-2.5 h-2.5 rounded-full bg-surface-1 border-2 border-brand flex-shrink-0" />
                        <div className="space-y-0.5">
                          <p className="text-text-secondary leading-snug">
                            <span className="font-medium text-text-primary">{log.userFullName}</span>{" "}
                            {log.action}
                          </p>
                          <p className="text-[10px] text-text-tertiary font-medium">
                            {getRelativeTimeString(log.timestamp)}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}

/** Helper: Calculate relative time dynamically. */
function getRelativeTimeString(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return "just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

/** Returns "morning", "afternoon", or "evening" based on server time. */
function getTimeOfDayGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "morning";
  if (hour < 17) return "afternoon";
  return "evening";
}
