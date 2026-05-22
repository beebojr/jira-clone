"use client";

import { useState, useCallback, useMemo, useEffect } from "react";
import {
  DragDropContext,
  Droppable,
  Draggable,
  type DropResult,
} from "@hello-pangea/dnd";
import { updateTaskStatus } from "@/lib/actions/tasks";
import type { Task, TaskStatus } from "@/lib/types";
import { TaskCard, PriorityIcon } from "./TaskCard";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  Inbox,
  Search,
  SlidersHorizontal,
  LayoutGrid,
  List,
  User,
  Clock,
  AlertCircle
} from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import Link from "next/link";

const COLUMNS: { id: TaskStatus; label: string; dotColor: string }[] = [
  { id: "TODO", label: "To Do", dotColor: "bg-status-todo" },
  { id: "IN_PROGRESS", label: "In Progress", dotColor: "bg-status-progress" },
  { id: "IN_REVIEW", label: "In Review", dotColor: "bg-status-review" },
  { id: "DONE", label: "Done", dotColor: "bg-status-done" },
];

const STATUS_DOT: Record<string, string> = {
  TODO: "bg-status-todo",
  IN_PROGRESS: "bg-status-progress",
  IN_REVIEW: "bg-status-review",
  DONE: "bg-status-done",
};

interface KanbanBoardProps {
  initialTasks: Task[];
  userRole: string;
  teams: { teamId: string; teamName: string }[];
  users: { userId: string; fullName: string; teamId: string }[];
}

export function KanbanBoard({
  initialTasks,
  userRole,
  teams,
  users,
}: KanbanBoardProps) {
  const [tasks, setTasks] = useState<Task[]>(initialTasks);
  const [teamFilter, setTeamFilter] = useState<string>("all");

  // Sync state when props change due to Next.js server action revalidation
  useEffect(() => {
    setTasks(initialTasks);
  }, [initialTasks]);


  // ─── FILTER STATES ──────────────────────────────────────────────────────────
  const [searchQuery, setSearchQuery] = useState("");
  const [assigneeFilter, setAssigneeFilter] = useState("all");
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [viewMode, setViewMode] = useState<"board" | "list">("board");

  const canFilterByTeam = userRole === "MANAGER" || userRole === "ADMIN";
  const teamFilters = ["all", ...teams.map((t) => t.teamId)];

  // ─── FILTER USERS BASED ON TEAM ─────────────────────────────────────────────
  const filteredUsers = useMemo(() => {
    return users.filter(
      (u) => teamFilter === "all" || u.teamId === teamFilter
    );
  }, [users, teamFilter]);

  // ─── DERIVED FILTERED TASKS (§14 State Management) ─────────────────────────
  const filteredTasks = useMemo(() => {
    return tasks.filter((t) => {
      // 1. Team filter
      if (canFilterByTeam && teamFilter !== "all" && t.teamId !== teamFilter) {
        return false;
      }

      // 2. Search query (fuzzy match title & description)
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const titleMatch = t.title?.toLowerCase().includes(q);
        const descMatch = t.description?.toLowerCase().includes(q);
        if (!titleMatch && !descMatch) return false;
      }

      // 3. Priority filter
      if (priorityFilter !== "all" && t.priority !== priorityFilter) {
        return false;
      }

      // 4. Assignee filter
      if (assigneeFilter !== "all" && t.assigneeId !== assigneeFilter) {
        return false;
      }

      return true;
    });
  }, [tasks, teamFilter, canFilterByTeam, searchQuery, priorityFilter, assigneeFilter]);

  const getColumnTasks = useCallback(
    (status: TaskStatus) => filteredTasks.filter((t) => t.status === status),
    [filteredTasks]
  );

  async function onDragEnd(result: DropResult) {
    if (!result.destination) return;

    const taskId = result.draggableId;
    const newStatus = result.destination.droppableId as TaskStatus;
    const oldStatus = result.source.droppableId as TaskStatus;

    if (oldStatus === newStatus) return;

    // §20 — Optimistic UI: reflect immediately, revert on failure
    setTasks((prev) =>
      prev.map((t) =>
        t.taskId === taskId ? { ...t, status: newStatus } : t
      )
    );

    try {
      await updateTaskStatus(taskId, newStatus);
      toast.success(`Moved to ${newStatus.replace(/_/g, " ")}`);
    } catch {
      // Rollback on failure
      setTasks((prev) =>
        prev.map((t) =>
          t.taskId === taskId ? { ...t, status: oldStatus } : t
        )
      );
      toast.error("Failed to update task status. Changes reverted.");
    }
  }

  return (
    <div>
      {/* ── Team Filter (Manager/Admin only) ─────────────────────── */}
      {canFilterByTeam && (
        <div
          className="flex items-center gap-2 mb-4 overflow-x-auto pb-1"
          role="group"
          aria-label="Filter tasks by team"
        >
          <span className="text-text-tertiary text-xs font-semibold uppercase tracking-wider flex-shrink-0">
            Team Workspace
          </span>
          <div className="flex items-center gap-1.5 flex-wrap">
            {teamFilters.map((team) => {
              const isActive = teamFilter === team;
              const label =
                team === "all"
                  ? "All Teams"
                  : teams.find((t) => t.teamId === team)?.teamName || team;
              return (
                <button
                  key={team}
                  type="button"
                  onClick={() => {
                    setTeamFilter(team);
                    // Reset assignee filter when team changes to prevent invalid assignee select states
                    setAssigneeFilter("all");
                  }}
                  aria-pressed={isActive}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer
                    ${isActive
                      ? "bg-brand text-white shadow-sm"
                      : "bg-surface-2 text-text-secondary hover:bg-surface-3 hover:text-text-primary"
                    }`}
                  style={{ transitionDuration: "var(--transition-fast)" }}
                >
                  {label}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Filter Toolbar ─────────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-center gap-3 justify-between mb-6 pb-4 border-b border-border-default/40">
        {/* Left: filters and search */}
        <div className="flex flex-wrap items-center gap-2 flex-1 min-w-0">
          {/* Search bar */}
          <div className="relative w-full sm:w-60 flex-shrink-0">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-text-tertiary" />
            <Input
              type="text"
              placeholder="Search tasks..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 bg-surface-1 border-border-default hover:border-border-default/80 focus-visible:border-brand/50 transition-all h-8 text-xs rounded-lg placeholder:text-text-tertiary"
            />
          </div>

          {/* Assignee Filter Dropdown */}
          <div className="flex items-center gap-1.5 flex-shrink-0">
            <Select value={assigneeFilter} onValueChange={(val) => setAssigneeFilter(val || "all")}>
              <SelectTrigger className="h-8 text-xs bg-surface-1 hover:bg-surface-2/40 border-border-default font-medium text-text-secondary min-w-[8rem] flex items-center gap-1">
                <User className="w-3.5 h-3.5 text-text-tertiary" />
                <SelectValue placeholder="Assignee">
                  {(value) => {
                    if (!value || value === "all") return "All Assignees";
                    const u = users.find((user) => user.userId === value);
                    return u ? u.fullName : "Assignee";
                  }}
                </SelectValue>
              </SelectTrigger>
              <SelectContent className="bg-surface-1 border-border-default max-h-60 overflow-y-auto z-50 shadow-md">
                <SelectItem value="all">
                  <span className="font-medium text-text-secondary">All Assignees</span>
                </SelectItem>
                {filteredUsers.map((u) => (
                  <SelectItem key={u.userId} value={u.userId}>
                    <span className="font-medium text-text-primary">{u.fullName}</span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Priority Filter Dropdown */}
          <div className="flex items-center gap-1.5 flex-shrink-0">
            <Select value={priorityFilter} onValueChange={(val) => setPriorityFilter(val || "all")}>
              <SelectTrigger className="h-8 text-xs bg-surface-1 hover:bg-surface-2/40 border-border-default font-medium text-text-secondary min-w-[7.5rem] flex items-center gap-1">
                <SlidersHorizontal className="w-3.5 h-3.5 text-text-tertiary" />
                <SelectValue placeholder="Priority">
                  {(value) => {
                    if (!value || value === "all") return "All Priorities";
                    return value.charAt(0) + value.slice(1).toLowerCase();
                  }}
                </SelectValue>
              </SelectTrigger>
              <SelectContent className="bg-surface-1 border-border-default z-50 shadow-md">
                <SelectItem value="all">
                  <span className="font-medium text-text-secondary">All Priorities</span>
                </SelectItem>
                <SelectItem value="LOW">
                  <span className="font-medium text-text-primary flex items-center gap-1.5">
                    <PriorityIcon priority="LOW" className="w-3.5 h-3.5" />
                    Low
                  </span>
                </SelectItem>
                <SelectItem value="MEDIUM">
                  <span className="font-medium text-text-primary flex items-center gap-1.5">
                    <PriorityIcon priority="MEDIUM" className="w-3.5 h-3.5" />
                    Medium
                  </span>
                </SelectItem>
                <SelectItem value="HIGH">
                  <span className="font-medium text-text-primary flex items-center gap-1.5">
                    <PriorityIcon priority="HIGH" className="w-3.5 h-3.5" />
                    High
                  </span>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Clear Filters Button (Visible only when filters are active) */}
          {(searchQuery || assigneeFilter !== "all" || priorityFilter !== "all") && (
            <button
              onClick={() => {
                setSearchQuery("");
                setAssigneeFilter("all");
                setPriorityFilter("all");
              }}
              className="text-[11px] font-semibold text-brand hover:text-brand/80 transition-colors px-2 py-1 rounded hover:bg-brand/5 cursor-pointer"
            >
              Clear filters
            </button>
          )}
        </div>

        {/* Right: view layout toggle */}
        <div className="flex items-center gap-1 bg-surface-2/40 border border-border-default/60 p-0.5 rounded-lg self-end md:self-auto flex-shrink-0">
          <button
            type="button"
            onClick={() => setViewMode("board")}
            aria-pressed={viewMode === "board"}
            title="Kanban Board View"
            className={`p-1.5 rounded-md transition-all cursor-pointer ${viewMode === "board"
                ? "bg-surface-1 text-text-primary shadow-xs border border-border-default/30"
                : "text-text-tertiary hover:text-text-secondary"
              }`}
            style={{ transitionDuration: "var(--transition-fast)" }}
          >
            <LayoutGrid className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => setViewMode("list")}
            aria-pressed={viewMode === "list"}
            title="High Density List View"
            className={`p-1.5 rounded-md transition-all cursor-pointer ${viewMode === "list"
                ? "bg-surface-1 text-text-primary shadow-xs border border-border-default/30"
                : "text-text-tertiary hover:text-text-secondary"
              }`}
            style={{ transitionDuration: "var(--transition-fast)" }}
          >
            <List className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* ── Layout Render Mode ────────────────────────────────────── */}
      {viewMode === "board" ? (
        /* ── Kanban Columns Mode ── */
        <DragDropContext onDragEnd={onDragEnd}>
          <div className="flex gap-4 overflow-x-auto pb-6 -mx-4 px-4 sm:mx-0 sm:px-0">
            {COLUMNS.map((col) => {
              const columnTasks = getColumnTasks(col.id);

              return (
                <div key={col.id} className="flex-shrink-0 w-72">
                  {/* Column Header */}
                  <div className="flex items-center gap-2 mb-3 px-1">
                    <span
                      className={`w-2 h-2 rounded-full flex-shrink-0 ${col.dotColor}`}
                    />
                    <h3 className="text-xs font-semibold text-text-secondary tracking-tight">
                      {col.label}
                    </h3>
                    <Badge
                      variant="outline"
                      className="ml-auto text-text-tertiary border-border-subtle text-[10px] h-5 min-w-[1.25rem] flex items-center justify-center font-medium tabular-nums"
                    >
                      {columnTasks.length}
                    </Badge>
                  </div>

                  {/* Droppable Area */}
                  <Droppable droppableId={col.id}>
                    {(provided, snapshot) => (
                      <div
                        ref={provided.innerRef}
                        {...provided.droppableProps}
                        className={`min-h-[12rem] rounded-xl p-1.5 transition-all border ${snapshot.isDraggingOver
                            ? "bg-brand/[0.03] border-brand/25 shadow-md shadow-brand/5 ring-1 ring-brand/10"
                            : "bg-surface-1/40 border-transparent"
                          }`}
                        style={{
                          transitionDuration: "var(--transition-fast)",
                        }}
                      >
                        {columnTasks.map((task, index) => (
                          <Draggable
                            key={task.taskId}
                            draggableId={task.taskId}
                            index={index}
                          >
                            {(provided, snapshot) => (
                              <div
                                ref={provided.innerRef}
                                {...provided.draggableProps}
                                {...provided.dragHandleProps}
                                className={`mb-2 ${snapshot.isDragging
                                    ? "rotate-[1deg] scale-[1.02]"
                                    : ""
                                  }`}
                                style={{
                                  ...provided.draggableProps.style,
                                  // Only animate when not dragging (library controls position when dragging)
                                  transition: snapshot.isDragging
                                    ? provided.draggableProps.style?.transition
                                    : `transform var(--transition-fast)`,
                                }}
                              >
                                <TaskCard
                                  task={task}
                                  isDragging={snapshot.isDragging}
                                />
                              </div>
                            )}
                          </Draggable>
                        ))}
                        {provided.placeholder}

                        {/* §9 — Empty state per column */}
                        {columnTasks.length === 0 &&
                          !snapshot.isDraggingOver && (
                            <div className="flex flex-col items-center justify-center py-10 text-text-tertiary">
                              <Inbox className="w-5 h-5 mb-2 opacity-25 text-text-tertiary" />
                              <p className="text-xs opacity-60 font-medium">No tasks in view</p>
                            </div>
                          )}
                      </div>
                    )}
                  </Droppable>
                </div>
              );
            })}
          </div>
        </DragDropContext>
      ) : (
        /* ── High Density List View Mode ── */
        <div className="space-y-6">
          {COLUMNS.map((col) => {
            const columnTasks = getColumnTasks(col.id);

            return (
              <div key={col.id} className="space-y-2">
                {/* Column header stack */}
                <div className="flex items-center gap-2 px-1 py-1">
                  <span className={`w-2 h-2 rounded-full flex-shrink-0 ${col.dotColor}`} />
                  <h3 className="text-xs font-semibold text-text-secondary tracking-tight">
                    {col.label}
                  </h3>
                  <Badge
                    variant="outline"
                    className="text-text-tertiary border-border-subtle text-[10px] h-4.5 px-1.5 flex items-center justify-center font-medium tabular-nums"
                  >
                    {columnTasks.length}
                  </Badge>
                </div>

                {/* List Container */}
                {columnTasks.length === 0 ? (
                  <div className="border border-border-subtle border-dashed bg-surface-1/25 rounded-lg py-6 flex flex-col items-center justify-center text-text-tertiary text-xs">
                    <Inbox className="w-4 h-4 mb-1 opacity-20" />
                    <span className="opacity-60 font-medium">No tasks in this state</span>
                  </div>
                ) : (
                  <div className="border border-border-default bg-surface-1 rounded-xl overflow-hidden divide-y divide-border-default/60 shadow-xs">
                    {columnTasks.map((task) => {
                      const assignee = users.find((u) => u.userId === task.assigneeId);
                      const isOverdue =
                        task.deadline &&
                        new Date(task.deadline) < new Date() &&
                        task.status !== "DONE";
                      const priorityLabel =
                        task.priority.charAt(0) + task.priority.slice(1).toLowerCase();

                      return (
                        <Link
                          key={task.taskId}
                          href={`/tasks/${task.taskId}`}
                          className="group flex items-center justify-between gap-4 px-4 py-2.5 hover:bg-surface-2/30 transition-all duration-100 ease-in-out cursor-pointer"
                        >
                          {/* Left section: priority, status dot, title */}
                          <div className="flex items-center gap-3 min-w-0 flex-1">
                            {/* Priority Icon */}
                            <div
                              className="flex items-center justify-center w-5 h-5 rounded border border-border-subtle bg-surface-2/40 text-text-secondary flex-shrink-0"
                              title={`${priorityLabel} Priority`}
                            >
                              <PriorityIcon priority={task.priority} className="w-3.5 h-3.5" />
                            </div>

                            {/* Title */}
                            <span className="text-sm font-medium text-text-primary group-hover:text-brand transition-colors truncate max-w-lg sm:max-w-xl md:max-w-2xl">
                              {task.title}
                            </span>

                            {isOverdue && (
                              <AlertCircle className="w-3.5 h-3.5 text-danger flex-shrink-0" />
                            )}
                          </div>

                          {/* Right section: assignee, deadline, thumbnail */}
                          <div className="flex items-center gap-3.5 flex-shrink-0">
                            {/* Assignee Badge */}
                            {assignee ? (
                              <div className="flex items-center gap-1 text-[11px] text-text-secondary font-medium bg-surface-2/40 px-2 py-0.5 rounded-full border border-border-subtle/80">
                                <User className="w-2.5 h-2.5 text-text-tertiary" />
                                <span>{assignee.fullName}</span>
                              </div>
                            ) : (
                              <span className="text-[11px] text-text-tertiary italic font-medium">Unassigned</span>
                            )}
                            {/* Deadline */}
                            {task.deadline && (
                              <div
                                className={`flex items-center gap-1 text-[11px] font-medium ${isOverdue ? "text-danger" : "text-text-tertiary"
                                  }`}
                              >
                                <Clock className="w-2.5 h-2.5" />
                                <span>
                                  {new Date(task.deadline).toLocaleDateString(undefined, {
                                    month: "short",
                                    day: "numeric",
                                  })}
                                </span>
                              </div>
                            )}

                            {/* Thumbnail */}
                            {task.imageThumbnailUrl && (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img
                                src={task.imageThumbnailUrl}
                                alt="thumbnail"
                                className="w-5 h-5 rounded object-cover ring-1 ring-border-default flex-shrink-0"
                                loading="lazy"
                              />
                            )}
                          </div>
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
