import { getTeams, getTeamMembers, getAllUsers } from "@/lib/actions/teams";
import { getProjects } from "@/lib/actions/projects";
import { getMyTasks } from "@/lib/actions/tasks";
import { getAuthUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import { Navbar } from "@/components/Navbar";
import { CreateTeamModal } from "@/components/tasks/CreateTeamModal";
import { TeamCard } from "@/components/tasks/TeamCard";
import { Badge } from "@/components/ui/badge";
import { Users } from "lucide-react";

export default async function TeamsPage() {
  const user = await getAuthUser();
  if (!user) redirect("/login");

  // Only Manager/Admin can access team management
  const isManager = user.role === "MANAGER" || user.role === "ADMIN";
  if (!isManager) redirect("/dashboard");

  const [teams, projects, myTasks, allUsers] = await Promise.all([
    getTeams(),
    getProjects(),
    getMyTasks(),
    getAllUsers(),
  ]);

  // Build member lists per team
  const teamMembers: Record<
    string,
    { userId: string; fullName: string; email: string; role: string; teamId: string }[]
  > = {};
  for (const team of teams) {
    teamMembers[team.teamId] = allUsers.filter(
      (u) => u.teamId === team.teamId
    );
  }

  // Users not assigned to any existing team (orphans)
  const teamIds = new Set(teams.map((t) => t.teamId));
  const unassignedUsers = allUsers.filter(
    (u) => u.role !== "MANAGER" && u.role !== "ADMIN" && !teamIds.has(u.teamId)
  );

  // Simple team list for dropdowns
  const teamOptions = teams.map((t) => ({
    teamId: t.teamId,
    teamName: t.teamName,
  }));

  return (
    <div className="min-h-screen bg-surface-0 text-text-primary">
      <Navbar user={user} projects={projects} myTasks={myTasks} />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        {/* ── Header ──────────────────────────────────────────────── */}
        <div className="flex flex-wrap items-center justify-between gap-3 mb-8">
          <div>
            <h2 className="text-2xl font-semibold tracking-tight flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-brand/10 flex items-center justify-center">
                <Users className="w-5 h-5 text-brand" />
              </div>
              Team Management
            </h2>
            <p className="text-text-tertiary text-sm mt-1.5 ml-[52px]">
              Create teams, manage members, and organize your workspace.
            </p>
          </div>
          <CreateTeamModal userRole={user.role} />
        </div>

        {/* ── Teams Grid ──────────────────────────────────────────── */}
        {teams.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-16 h-16 rounded-2xl bg-surface-1 border border-border-subtle flex items-center justify-center mb-4">
              <Users className="w-7 h-7 text-text-tertiary opacity-40" />
            </div>
            <p className="text-text-secondary text-sm font-medium">
              No teams created yet
            </p>
            <p className="text-text-tertiary text-xs mt-1">
              Create your first team to start organizing employees.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {teams.map((team) => (
              <TeamCard
                key={team.teamId}
                teamId={team.teamId}
                teamName={team.teamName}
                members={teamMembers[team.teamId] || []}
                allTeams={teamOptions}
                isManager={isManager}
              />
            ))}
          </div>
        )}

        {/* ── Unassigned Users ─────────────────────────────────────── */}
        {unassignedUsers.length > 0 && (
          <section className="mt-10">
            <div className="flex items-center gap-2 mb-4">
              <h3 className="text-base font-semibold tracking-tight text-text-secondary">
                Unassigned Employees
              </h3>
              <Badge
                variant="outline"
                className="text-[10px] py-0 px-1.5 border-border-default text-warning"
              >
                {unassignedUsers.length}
              </Badge>
            </div>
            <div className="bg-surface-1 border border-border-subtle rounded-xl p-4"
              style={{ boxShadow: "var(--shadow-xs)" }}
            >
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                {unassignedUsers.map((u) => (
                  <div
                    key={u.userId}
                    className="flex items-center justify-between gap-2 px-3 py-2.5 rounded-lg bg-surface-0/50 border border-border-subtle"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-text-primary truncate">
                        {u.fullName}
                      </p>
                      <p className="text-[10px] text-text-tertiary truncate">
                        {u.email} · Team: {u.teamId || "none"}
                      </p>
                    </div>
                    <Badge
                      variant="outline"
                      className="text-[9px] py-0 px-1 border-warning/30 text-warning flex-shrink-0"
                    >
                      Unassigned
                    </Badge>
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}
      </main>
    </div>
  );
}
