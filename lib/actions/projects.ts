'use server';
import { ScanCommand, PutCommand, GetCommand, DeleteCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';
import { randomUUID } from 'crypto';
import { docClient } from '../dynamo-client';
import { AWS_CONFIG } from '../aws-config';
import { requireAuth } from '../auth';
import { Project } from '../types';
import { revalidatePath } from 'next/cache';

export async function getProjects(): Promise<Project[]> {
  await requireAuth(); // Any authenticated user can list projects

  const { Items } = await docClient.send(new ScanCommand({
    TableName: AWS_CONFIG.tables.projects,
  }));

  return (Items || []) as Project[];
}

export async function getProject(projectId: string): Promise<Project | null> {
  await requireAuth();

  const { Item } = await docClient.send(new GetCommand({
    TableName: AWS_CONFIG.tables.projects,
    Key: { projectId },
  }));

  return (Item || null) as Project | null;
}

export async function createProject(input: {
  projectName: string;
  description: string;
}): Promise<Project> {
  const user = await requireAuth();

  if (user.role === 'EMPLOYEE') {
    throw new Error('FORBIDDEN: Only managers can create projects');
  }

  const project: Project = {
    projectId: randomUUID(),
    projectName: input.projectName,
    description: input.description,
    createdAt: new Date().toISOString(),
  };

  await docClient.send(new PutCommand({
    TableName: AWS_CONFIG.tables.projects,
    Item: project,
  }));

  // Debug log to help local dev trace created projects
  try {
    // eslint-disable-next-line no-console
    console.log('[createProject] created project:', project.projectId, project.projectName);
  } catch (e) {
    // ignore
  }

  revalidatePath('/dashboard');
  return project;
}

export async function updateProject(
  projectId: string,
  updates: { projectName?: string; description?: string }
): Promise<void> {
  const user = await requireAuth();

  if (user.role === 'EMPLOYEE') {
    throw new Error('FORBIDDEN: Only managers can update projects');
  }

  const exprs: string[] = [];
  const vals: Record<string, string> = {};

  if (updates.projectName) { exprs.push('projectName = :n'); vals[':n'] = updates.projectName; }
  if (updates.description) { exprs.push('description = :d'); vals[':d'] = updates.description; }

  if (exprs.length === 0) return;

  await docClient.send(new UpdateCommand({
    TableName: AWS_CONFIG.tables.projects,
    Key: { projectId },
    UpdateExpression: `SET ${exprs.join(', ')}`,
    ExpressionAttributeValues: vals,
  }));

  revalidatePath('/dashboard');
}

export async function deleteProject(projectId: string): Promise<void> {
  const user = await requireAuth();

  if (user.role === 'EMPLOYEE') {
    throw new Error('FORBIDDEN: Only managers can delete projects');
  }

  await docClient.send(new DeleteCommand({
    TableName: AWS_CONFIG.tables.projects,
    Key: { projectId },
  }));

  revalidatePath('/dashboard');
}

export async function getTeams(): Promise<{ teamId: string; teamName: string; managerId: string }[]> {
  await requireAuth();
  const { Items } = await docClient.send(new ScanCommand({
    TableName: AWS_CONFIG.tables.teams,
  }));
  return (Items || []) as { teamId: string; teamName: string; managerId: string }[];
}
