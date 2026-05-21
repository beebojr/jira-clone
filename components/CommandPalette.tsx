"use client";

import React, { useState, useEffect, useRef, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  Search,
  Folder,
  CheckCircle2,
  Clock,
  ArrowRight,
  CornerDownLeft,
  X,
  Layers,
  PlusCircle,
  LayoutDashboard,
} from "lucide-react";
import { Project, Task } from "@/lib/types";

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  projects: Project[];
  myTasks: Task[];
  onCreateTask?: () => void;
  onCreateProject?: () => void;
  userRole: string;
}

type CommandType = "action" | "project" | "task";

interface CommandItem {
  id: string;
  type: CommandType;
  title: string;
  subtitle?: string;
  icon: React.ReactNode;
  action: () => void;
  category: string;
}

export function CommandPalette({
  isOpen,
  onClose,
  projects,
  myTasks,
  onCreateTask,
  onCreateProject,
  userRole,
}: CommandPaletteProps) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Reset search when opening
  useEffect(() => {
    if (isOpen) {
      setSearch("");
      setSelectedIndex(0);
      // Autofocus input
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  // Handle ESC and Arrow navigation
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (!isOpen) return;

      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      } else if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIndex((prev) => (prev + 1) % filteredCommands.length);
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIndex((prev) => (prev - 1 + filteredCommands.length) % filteredCommands.length);
      } else if (e.key === "Enter") {
        e.preventDefault();
        if (filteredCommands[selectedIndex]) {
          filteredCommands[selectedIndex].action();
        }
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, selectedIndex, search, projects, myTasks]);

  // Scroll active item into view
  useEffect(() => {
    if (!listRef.current) return;
    const activeElement = listRef.current.querySelector('[data-active="true"]');
    if (activeElement) {
      activeElement.scrollIntoView({ block: "nearest" });
    }
  }, [selectedIndex]);

  // Close when clicking backdrop
  function handleBackdropClick(e: React.MouseEvent) {
    if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
      onClose();
    }
  }

  // Memoize command items
  const commands = useMemo(() => {
    const list: CommandItem[] = [];

    // ── 1. Actions ──────────────────────────────────────────────────
    list.push({
      id: "nav-dashboard",
      type: "action",
      title: "Go to Dashboard",
      subtitle: "View your workspace analytics and recent activity feed",
      icon: <LayoutDashboard className="w-4 h-4 text-text-secondary" />,
      category: "Navigation",
      action: () => {
        router.push("/dashboard");
        onClose();
      },
    });

    if (userRole !== "EMPLOYEE" && onCreateTask) {
      list.push({
        id: "action-create-task",
        type: "action",
        title: "Create New Task",
        subtitle: "Create and assign a task to a project team",
        icon: <PlusCircle className="w-4 h-4 text-text-secondary" />,
        category: "Actions",
        action: () => {
          onClose();
          onCreateTask();
        },
      });
    }

    if (userRole !== "EMPLOYEE" && onCreateProject) {
      list.push({
        id: "action-create-project",
        type: "action",
        title: "Create New Project",
        subtitle: "Define a new workspace project scope",
        icon: <Folder className="w-4 h-4 text-text-secondary" />,
        category: "Actions",
        action: () => {
          onClose();
          onCreateProject();
        },
      });
    }

    // ── 2. Projects ─────────────────────────────────────────────────
    projects.forEach((proj) => {
      list.push({
        id: `proj-${proj.projectId}`,
        type: "project",
        title: proj.projectName,
        subtitle: proj.description || "Project Board",
        icon: <Layers className="w-4 h-4 text-brand" />,
        category: "Projects Switcher",
        action: () => {
          router.push(`/board/${proj.projectId}`);
          onClose();
        },
      });
    });

    // ── 3. Tasks ────────────────────────────────────────────────────
    myTasks.forEach((task) => {
      list.push({
        id: `task-${task.taskId}`,
        type: "task",
        title: task.title,
        subtitle: `${task.status.replace(/_/g, " ")} · Priority ${task.priority}`,
        icon: (
          <CheckCircle2
            className={`w-4 h-4 ${
              task.status === "DONE" ? "text-success" : "text-text-tertiary"
            }`}
          />
        ),
        category: "Assigned To Me",
        action: () => {
          router.push(`/tasks/${task.taskId}`);
          onClose();
        },
      });
    });

    return list;
  }, [projects, myTasks, userRole, onCreateTask, onCreateProject]);

  // Client-side fuzzy/text filtering
  const filteredCommands = useMemo(() => {
    if (!search.trim()) return commands;
    const query = search.toLowerCase();
    return commands.filter(
      (cmd) =>
        cmd.title.toLowerCase().includes(query) ||
        (cmd.subtitle && cmd.subtitle.toLowerCase().includes(query)) ||
        cmd.category.toLowerCase().includes(query)
    );
  }, [commands, search]);

  // Adjust active selection to bounds when list length changes
  useEffect(() => {
    setSelectedIndex(0);
  }, [search]);

  if (!isOpen) return null;

  // Group items by category to render raycast-style sections
  const groupedCommands = filteredCommands.reduce((groups, item, idx) => {
    const cat = item.category;
    if (!groups[cat]) groups[cat] = [];
    groups[cat].push({ item, originalIndex: idx });
    return groups;
  }, {} as Record<string, { item: CommandItem; originalIndex: number }[]>);

  return (
    <div
      onClick={handleBackdropClick}
      className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-start justify-center p-4 pt-[15vh] overflow-y-auto"
      style={{ zIndex: "var(--z-modal)" }}
    >
      <div
        ref={containerRef}
        className="w-full max-w-lg bg-surface-1 border border-border-default rounded-xl shadow-modal overflow-hidden flex flex-col focus-dim-active"
        style={{
          animation: "animate-fade-in 100ms ease-out",
        }}
      >
        {/* ── Search Input Block ────────────────────────────────────── */}
        <div className="flex items-center gap-3 px-4 py-3.5 border-b border-border-default bg-surface-1">
          <Search className="w-4 h-4 text-text-tertiary flex-shrink-0" />
          <input
            ref={inputRef}
            type="text"
            placeholder="Search projects, tasks, or actions..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1 bg-transparent border-none outline-none text-text-primary placeholder:text-text-tertiary text-sm focus:ring-0 focus:outline-none"
          />
          <button
            onClick={onClose}
            className="text-text-tertiary hover:text-text-primary p-0.5 rounded-lg hover:bg-surface-2 transition-colors cursor-pointer"
            style={{ transitionDuration: "var(--transition-fast)" }}
          >
            <X className="w-4 h-4" />
            <span className="sr-only">Close</span>
          </button>
        </div>

        {/* ── Commands List ─────────────────────────────────────────── */}
        <div
          ref={listRef}
          className="max-h-[350px] overflow-y-auto py-2 flex-1"
          style={{ scrollbarWidth: "thin" }}
        >
          {filteredCommands.length === 0 ? (
            <div className="py-8 text-center text-text-tertiary text-sm">
              No results found for &ldquo;<span className="text-text-secondary font-medium">{search}</span>&rdquo;
            </div>
          ) : (
            Object.entries(groupedCommands).map(([category, items]) => (
              <div key={category} className="mb-3 last:mb-0">
                <h3 className="px-4 py-1 text-[10px] font-semibold text-text-tertiary uppercase tracking-wider">
                  {category}
                </h3>
                <div className="mt-1 space-y-0.5">
                  {items.map(({ item, originalIndex }) => {
                    const isActive = originalIndex === selectedIndex;
                    return (
                      <div
                        key={item.id}
                        data-active={isActive ? "true" : "false"}
                        onClick={item.action}
                        onMouseEnter={() => setSelectedIndex(originalIndex)}
                        className={`flex items-center justify-between px-4 py-2.5 mx-2 rounded-lg cursor-pointer transition-all border-l-2 ${
                          isActive
                            ? "bg-surface-2 text-text-primary border-brand pl-3.5 shadow-sm"
                            : "border-transparent text-text-secondary hover:bg-surface-2/40 hover:text-text-primary"
                        }`}
                        style={{
                          transitionDuration: "var(--transition-fast)",
                        }}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className={`flex-shrink-0 ${isActive ? "scale-105" : ""} transition-transform duration-100`}>
                            {item.icon}
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-medium leading-none truncate">
                              {item.title}
                            </p>
                            {item.subtitle && (
                              <p className="text-xs text-text-tertiary mt-1 truncate max-w-[280px] sm:max-w-[340px]">
                                {item.subtitle}
                              </p>
                            )}
                          </div>
                        </div>

                        {isActive && (
                          <div className="flex items-center gap-1 text-[10px] text-text-tertiary bg-surface-3 px-1.5 py-0.5 rounded font-mono border border-border-subtle flex-shrink-0 animate-fade-in">
                            <span>Open</span>
                            <CornerDownLeft className="w-2.5 h-2.5" />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))
          )}
        </div>

        {/* ── Footer ────────────────────────────────────────────────── */}
        <div className="px-4 py-2.5 bg-surface-0/60 border-t border-border-default flex items-center justify-between text-[11px] text-text-tertiary select-none">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1">
              <kbd className="px-1 bg-surface-2 border border-border-subtle rounded text-[9px] font-mono">↑↓</kbd> Navigate
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 bg-surface-2 border border-border-subtle rounded text-[9px] font-mono">Enter</kbd> Select
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-1 bg-surface-2 border border-border-subtle rounded text-[9px] font-mono">Esc</kbd> Close
            </span>
          </div>
          <div>
            Total {filteredCommands.length} item{filteredCommands.length !== 1 ? "s" : ""}
          </div>
        </div>
      </div>
    </div>
  );
}
