// lib/types.ts
// ⚠️ SHARED — Do not modify without notifying the team

export type TaskStatus = 'TODO' | 'IN_PROGRESS' | 'IN_REVIEW' | 'DONE';
export type TaskPriority = 'LOW' | 'MEDIUM' | 'HIGH';
export type UserRole = 'MANAGER' | 'EMPLOYEE' | 'ADMIN';

export interface Task {
  taskId: string;
  title: string;
  description: string;
  status: TaskStatus;
  priority: TaskPriority;
  deadline: string;          // ISO 8601 e.g. "2026-05-22T00:00:00.000Z"
  teamId: string;            // GSI_Team partition key — critical for isolation
  assigneeId: string;        // GSI_Assignee partition key
  projectId: string;
  imageOriginalUrl?: string; // S3 URL — optional
  imageThumbnailUrl?: string;// S3 URL of resized version — optional
  createdBy: string;         // userId of the manager who created it
  createdAt: string;         // ISO 8601
  updatedAt: string;         // ISO 8601
}

export interface User {
  userId: string;            // Matches Cognito sub claim
  email: string;
  fullName: string;
  role: UserRole;
  teamId: string;            // 'all' for MANAGER, team slug for EMPLOYEE
  profileImageUrl?: string;
}

export interface Team {
  teamId: string;            // e.g. 'frontend', 'backend'
  teamName: string;          // e.g. 'Frontend Team'
  managerId: string;
}

export interface Project {
  projectId: string;
  projectName: string;
  description: string;
  createdAt: string;
}

export interface Comment {
  commentId: string;
  taskId: string;            // Links to Task
  userId: string;
  userFullName: string;
  content: string;
  createdAt: string;
}

export interface AuditLog {
  logId: string;
  taskId: string;
  userId: string;
  action: string;            // e.g. "Moved from TODO to IN_PROGRESS"
  timestamp: string;         // ISO 8601
}