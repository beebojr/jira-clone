"use client";

import { useState, useCallback } from "react";
import {
  DragDropContext,
  Droppable,
  Draggable,
  type DropResult,
} from "@hello-pangea/dnd";
import { updateTaskStatus } from "@/lib/actions/tasks";
import type { Task, TaskStatus } from "@/lib/types";
import { TaskCard } from "./TaskCard";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Inbox } from "lucide-react";

const COLUMNS: { id: TaskStatus; label: string; dotColor: string }[] = [
  { id: "TODO", label: "To Do", dotColor: "bg-status-todo" },
  { id: "IN_PROGRESS", label: "In Progress", dotColor: "bg-status-progress" },
  { id: "IN_REVIEW", label: "In Review", dotColor: "bg-status-review" },
  { id: "DONE", label: "Done", dotColor: "bg-status-done" },
];

interface KanbanBoardProps {
  initialTasks: Task[];
  userRole: string;
  teams: { teamId: string; teamName: string }[];
}

export function KanbanBoard({
  initialTasks,
  userRole,
  teams,
}: KanbanBoardProps) {
  const [tasks, setTasks] = useState<Task[]>(initialTasks);
  const [teamFilter, setTeamFilter] = useState<string>("all");

  const canFilterByTeam = userRole === "MANAGER" || userRole === "ADMIN";
  const teamFilters = ["all", ...teams.map((t) => t.teamId)];

  const getColumnTasks = useCallback(
    (status: TaskStatus) =>
      tasks.filter(
        (t) =>
          t.status === status &&
          (!canFilterByTeam ||
            teamFilter === "all" ||
            t.teamId === teamFilter)
      ),
    [tasks, teamFilter, canFilterByTeam]
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
      {/* ── Team Filter (Manager/Admin only) — Step 8 ────────────── */}
      {canFilterByTeam && (
        <div
          className="flex items-center gap-2 mb-5 overflow-x-auto pb-1"
          role="group"
          aria-label="Filter tasks by team"
        >
          <span className="text-text-tertiary text-xs font-medium uppercase tracking-wider flex-shrink-0">
            Team
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
                  onClick={() => setTeamFilter(team)}
                  aria-pressed={isActive}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer
                    ${
                      isActive
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

      {/* ── Kanban Columns ──────────────────────────────────────── */}
      <DragDropContext onDragEnd={onDragEnd}>
        <div className="flex gap-4 overflow-x-auto pb-6 -mx-4 px-4 sm:mx-0 sm:px-0">
          {COLUMNS.map((col) => {
            const columnTasks = getColumnTasks(col.id);

            return (
              <div key={col.id} className="flex-shrink-0 w-72">
                {/* Column Header */}
                <div className="flex items-center gap-2 mb-3 px-1">
                  <span
                    className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${col.dotColor}`}
                  />
                  <h3 className="text-sm font-medium text-text-secondary">
                    {col.label}
                  </h3>
                  <Badge
                    variant="outline"
                    className="ml-auto text-text-tertiary border-border-subtle text-xs h-5 min-w-[1.5rem] flex items-center justify-center tabular-nums"
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
                      className={`min-h-[8rem] rounded-xl p-2 transition-colors border ${
                        snapshot.isDraggingOver
                          ? "bg-brand/5 border-brand/20"
                          : "bg-surface-1/50 border-transparent"
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
                              className={`mb-2 ${
                                snapshot.isDragging
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
                          <div className="flex flex-col items-center justify-center py-8 text-text-tertiary">
                            <Inbox className="w-5 h-5 mb-2 opacity-30" />
                            <p className="text-xs opacity-60">No tasks</p>
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
    </div>
  );
}
