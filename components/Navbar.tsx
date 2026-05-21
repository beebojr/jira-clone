"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import {
  Layers,
  Search,
  ChevronDown,
  LogOut,
  LayoutDashboard,
  CheckSquare,
  Plus,
  FolderOpen,
  User,
} from "lucide-react";
import { AuthUser } from "@/lib/auth";
import { Project, Task } from "@/lib/types";
import { signOut } from "@/lib/actions/auth";
import { CommandPalette } from "./CommandPalette";
import { CreateTaskModal } from "./tasks/CreateTaskModal";
import { CreateProjectModal } from "./tasks/CreateProjectModal";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface NavbarProps {
  user: AuthUser;
  projects: Project[];
  myTasks: Task[];
  currentProjectId?: string;
  // For global Task creation modal inside Navbar if on a board page
  users?: { userId: string; fullName: string; teamId: string }[];
  teams?: { teamId: string; teamName: string }[];
}

export function Navbar({
  user,
  projects,
  myTasks,
  currentProjectId,
  users = [],
  teams = [],
}: NavbarProps) {
  const router = useRouter();
  const pathname = usePathname();

  const [isCommandOpen, setIsCommandOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isProjectDropdownOpen, setIsProjectDropdownOpen] = useState(false);

  const profileRef = useRef<HTMLDivElement>(null);
  const projectDropdownRef = useRef<HTMLDivElement>(null);

  // Keyboard shortcut for Cmd+K / Ctrl+K
  useEffect(() => {
    function handleGlobalShortcut(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setIsCommandOpen((prev) => !prev);
      }
    }
    window.addEventListener("keydown", handleGlobalShortcut);
    return () => window.removeEventListener("keydown", handleGlobalShortcut);
  }, []);

  // Handle click outside dropdowns
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      const target = e.target as Node;
      if (profileRef.current && !profileRef.current.contains(target)) {
        setIsProfileOpen(false);
      }
      if (projectDropdownRef.current && !projectDropdownRef.current.contains(target)) {
        setIsProjectDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Get active project details
  const activeProject = projects.find((p) => p.projectId === currentProjectId);

  // User initials for Avatar
  const userInitials = user.fullName
    ? user.fullName
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : "U";

  const isManager = user.role === "MANAGER" || user.role === "ADMIN";

  return (
    <>
      <nav
        className="sticky top-0 w-full border-b border-border-default bg-surface-0/85 backdrop-blur-md px-4 sm:px-6 py-2.5 flex items-center justify-between transition-colors"
        style={{ zIndex: "var(--z-nav)" }}
      >
        {/* ── Left Side: Logo & Navigation ──────────────────────────── */}
        <div className="flex items-center gap-6 min-w-0">
          <Link href="/dashboard" className="flex items-center gap-2.5 group flex-shrink-0">
            <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-brand/15 group-hover:bg-brand/25 transition-colors duration-100">
              <Layers className="w-4.5 h-4.5 text-brand" />
            </div>
            <span className="text-base font-semibold tracking-tight text-text-primary group-hover:text-brand transition-colors duration-100 font-sans">
              Jira
            </span>
            <Badge variant="outline" className="text-[10px] py-0 px-1 border-border-default text-text-tertiary">
              Cloud
            </Badge>
          </Link>

          {/* Navigation Links (Desktop) */}
          <div className="hidden md:flex items-center gap-1 text-sm font-medium">
            <Link
              href="/dashboard"
              className={`px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5 ${
                pathname === "/dashboard"
                  ? "bg-surface-2 text-text-primary"
                  : "text-text-secondary hover:text-text-primary hover:bg-surface-1"
              }`}
              style={{ transitionDuration: "var(--transition-fast)" }}
            >
              <LayoutDashboard className="w-3.5 h-3.5" />
              Dashboard
            </Link>

            {/* Project Switcher Dropdown */}
            <div ref={projectDropdownRef} className="relative">
              <button
                onClick={() => setIsProjectDropdownOpen((p) => !p)}
                className={`px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer ${
                  currentProjectId || pathname.startsWith("/board/")
                    ? "bg-surface-2 text-text-primary font-semibold"
                    : "text-text-secondary hover:text-text-primary hover:bg-surface-1"
                }`}
                style={{ transitionDuration: "var(--transition-fast)" }}
              >
                <FolderOpen className="w-3.5 h-3.5" />
                {activeProject ? activeProject.projectName : "Projects"}
                <ChevronDown className={`w-3.5 h-3.5 text-text-tertiary transition-transform duration-150 ${isProjectDropdownOpen ? "rotate-180" : ""}`} />
              </button>

              {isProjectDropdownOpen && (
                <div
                  className="absolute left-0 mt-1.5 w-60 bg-surface-1 border border-border-default rounded-xl shadow-modal py-1.5 text-left text-xs animate-fade-in animate-duration-100"
                  style={{ zIndex: "var(--z-dropdown)" }}
                >
                  <p className="px-3.5 py-1 text-[10px] font-semibold text-text-tertiary uppercase tracking-wider">
                    Recent Projects
                  </p>
                  <div className="mt-1 max-h-[220px] overflow-y-auto space-y-0.5 px-1.5">
                    {projects.length === 0 ? (
                      <p className="px-3 py-4 text-text-tertiary italic text-center">No projects in workspace.</p>
                    ) : (
                      projects.map((proj) => (
                        <Link
                          key={proj.projectId}
                          href={`/board/${proj.projectId}`}
                          onClick={() => setIsProjectDropdownOpen(false)}
                          className={`flex items-center gap-2.5 px-2.5 py-2 rounded-lg transition-all ${
                            proj.projectId === currentProjectId
                              ? "bg-surface-2 text-text-primary font-medium"
                              : "text-text-secondary hover:bg-surface-2/60 hover:text-text-primary"
                          }`}
                          style={{ transitionDuration: "var(--transition-fast)" }}
                        >
                          <Layers className="w-3.5 h-3.5 text-brand" />
                          <span className="truncate">{proj.projectName}</span>
                        </Link>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ── Center: Cmd+K Global Search Trigger ────────────────────── */}
        <div className="flex-1 max-w-sm mx-4 hidden sm:block">
          <button
            onClick={() => setIsCommandOpen(true)}
            className="w-full flex items-center justify-between px-3 py-1.5 bg-surface-1 hover:bg-surface-2 border border-border-default rounded-lg text-xs text-text-tertiary hover:text-text-secondary transition-all shadow-xs cursor-pointer"
            style={{ transitionDuration: "var(--transition-fast)" }}
          >
            <div className="flex items-center gap-2">
              <Search className="w-3.5 h-3.5 text-text-tertiary" />
              <span>Search Jira...</span>
            </div>
            <kbd className="px-1.5 py-0.5 bg-surface-2 border border-border-subtle rounded font-mono text-[9px] font-semibold shadow-xs">
              ⌘K
            </kbd>
          </button>
        </div>

        {/* ── Right Side: Context actions & Profile ────────────────── */}
        <div className="flex items-center gap-3 flex-shrink-0">
          {/* Mobile search button */}
          <button
            onClick={() => setIsCommandOpen(true)}
            className="sm:hidden flex items-center justify-center w-8 h-8 rounded-lg hover:bg-surface-1 text-text-secondary hover:text-text-primary cursor-pointer transition-colors"
            style={{ transitionDuration: "var(--transition-fast)" }}
            title="Search"
          >
            <Search className="w-4 h-4" />
          </button>

          {/* Context-aware Dynamic Create Action Button */}
          {isManager && (
            <div className="flex items-center">
              {currentProjectId && users.length > 0 ? (
                /* Board view: open Create Task for current board */
                <CreateTaskModal
                  projectId={currentProjectId}
                  userRole={user.role}
                  users={users}
                  teams={teams}
                />
              ) : (
                /* Dashboard view: open Create Project if Manager/Admin */
                <CreateProjectModal userRole={user.role} />
              )}
            </div>
          )}

          {/* User Profile initials Avatar Dropdown */}
          <div ref={profileRef} className="relative">
            <button
              onClick={() => setIsProfileOpen((p) => !p)}
              className="flex items-center justify-center w-8 h-8 rounded-full bg-surface-2 border border-border-default text-text-primary hover:border-brand/40 transition-all font-semibold text-xs cursor-pointer select-none"
              style={{
                transitionDuration: "var(--transition-fast)",
                boxShadow: "var(--shadow-xs)",
              }}
            >
              {userInitials}
            </button>

            {isProfileOpen && (
              <div
                className="absolute right-0 mt-2 w-64 bg-surface-1 border border-border-default rounded-xl shadow-modal p-2 animate-fade-in animate-duration-100"
                style={{ zIndex: "var(--z-dropdown)" }}
              >
                {/* User metadata header */}
                <div className="px-3.5 py-3 border-b border-border-subtle mb-1.5">
                  <div className="flex items-center gap-2">
                    <p className="font-semibold text-sm text-text-primary truncate max-w-[140px]">
                      {user.fullName}
                    </p>
                    <Badge variant="outline" className="text-[9px] py-0 px-1 border-border-default text-text-secondary">
                      {user.role}
                    </Badge>
                  </div>
                  <p className="text-text-tertiary text-xs truncate mt-0.5">
                    {user.email}
                  </p>
                </div>

                {/* Sub links */}
                <div className="space-y-0.5">
                  <Link
                    href="/dashboard"
                    onClick={() => setIsProfileOpen(false)}
                    className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs text-text-secondary hover:bg-surface-2 hover:text-text-primary transition-all font-medium"
                    style={{ transitionDuration: "var(--transition-fast)" }}
                  >
                    <LayoutDashboard className="w-3.5 h-3.5 text-text-tertiary" />
                    Dashboard
                  </Link>

                  {currentProjectId && (
                    <Link
                      href="/dashboard"
                      onClick={() => setIsProfileOpen(false)}
                      className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs text-text-secondary hover:bg-surface-2 hover:text-text-primary transition-all font-medium"
                      style={{ transitionDuration: "var(--transition-fast)" }}
                    >
                      <CheckSquare className="w-3.5 h-3.5 text-text-tertiary" />
                      My Assigned Tasks ({myTasks.filter((t) => t.status !== "DONE").length})
                    </Link>
                  )}
                </div>

                <div className="border-t border-border-subtle my-1.5" />

                {/* Sign Out Action */}
                <form action={signOut} className="w-full">
                  <button
                    type="submit"
                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs text-danger hover:bg-danger/10 hover:text-danger transition-all font-medium cursor-pointer"
                    style={{ transitionDuration: "var(--transition-fast)" }}
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    Sign Out
                  </button>
                </form>
              </div>
            )}
          </div>
        </div>
      </nav>

      {/* ── Floating Command Palette dialogue ──────────────────────── */}
      <CommandPalette
        isOpen={isCommandOpen}
        onClose={() => setIsCommandOpen(false)}
        projects={projects}
        myTasks={myTasks}
        onCreateTask={
          currentProjectId && users.length > 0
            ? () => {
                // If on a project page, we can open the createTask modal via DOM or simulation.
                // For direct support, we'll let the user see the modal triggered.
                // We'll search for the DialogTrigger button inside document and click it!
                setTimeout(() => {
                  const triggers = document.querySelectorAll("button");
                  const taskTrigger = Array.from(triggers).find((t) => t.textContent?.includes("New Task"));
                  if (taskTrigger) taskTrigger.click();
                }, 100);
              }
            : undefined
        }
        onCreateProject={
          isManager
            ? () => {
                setTimeout(() => {
                  const triggers = document.querySelectorAll("button");
                  const projTrigger = Array.from(triggers).find((t) => t.textContent?.includes("New Project"));
                  if (projTrigger) projTrigger.click();
                }, 100);
              }
            : undefined
        }
        userRole={user.role}
      />
    </>
  );
}
