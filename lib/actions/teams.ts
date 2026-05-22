'use server';
import { ScanCommand, PutCommand, GetCommand, DeleteCommand, UpdateCommand, QueryCommand } from '@aws-sdk/lib-dynamodb';
import { randomUUID } from 'crypto';
import { docClient } from '../dynamo-client';
import { AWS_CONFIG } from '../aws-config';
import { requireAuth } from '../auth';
import { Team } from '../types';
import { revalidatePath } from 'next/cache';

// ─── GET ALL TEAMS ────────────────────────────────────────────────────────────
export async function getTeams(): Promise<Team[]> {
  await requireAuth();
  const { Items } = await docClient.send(new ScanCommand({
    TableName: AWS_CONFIG.tables.teams,
  }));
  return (Items || []) as Team[];
}

// ─── GET TEAM MEMBERS ─────────────────────────────────────────────────────────
// Returns all users assigned to a specific team
export async function getTeamMembers(teamId: string): Promise<{
  userId: string;
  fullName: string;
  email: string;
  role: string;
  teamId: string;
}[]> {
  await requireAuth();
  const { Items } = await docClient.send(new ScanCommand({
    TableName: AWS_CONFIG.tables.users,
    FilterExpression: 'teamId = :tid',
    ExpressionAttributeValues: { ':tid': teamId },
  }));
  return (Items || []).map((u: Record<string, string>) => ({
    userId: u.userId,
    fullName: u.fullName || 'Unknown',
    email: u.email || '',
    role: u.role || 'EMPLOYEE',
    teamId: u.teamId || '',
  }));
}

// ─── GET ALL USERS (for assignment dropdowns) ─────────────────────────────────
export async function getAllUsers(): Promise<{
  userId: string;
  fullName: string;
  email: string;
  role: string;
  teamId: string;
}[]> {
  await requireAuth();
  const { Items } = await docClient.send(new ScanCommand({
    TableName: AWS_CONFIG.tables.users,
  }));
  return (Items || []).map((u: Record<string, string>) => ({
    userId: u.userId,
    fullName: u.fullName || 'Unknown',
    email: u.email || '',
    role: u.role || 'EMPLOYEE',
    teamId: u.teamId || '',
  }));
}

// ─── CREATE TEAM ──────────────────────────────────────────────────────────────
export async function createTeam(input: {
  teamName: string;
}): Promise<Team> {
  const user = await requireAuth();

  if (user.role === 'EMPLOYEE') {
    throw new Error('FORBIDDEN: Only managers can create teams');
  }

  const team: Team = {
    teamId: randomUUID(),
    teamName: input.teamName.trim(),
    managerId: user.userId,
  };

  await docClient.send(new PutCommand({
    TableName: AWS_CONFIG.tables.teams,
    Item: team,
  }));

  // eslint-disable-next-line no-console
  console.log('[createTeam] created team:', team.teamId, team.teamName);

  revalidatePath('/teams');
  revalidatePath('/dashboard');
  return team;
}

// ─── UPDATE TEAM ──────────────────────────────────────────────────────────────
export async function updateTeam(
  teamId: string,
  updates: { teamName?: string }
): Promise<void> {
  const user = await requireAuth();

  if (user.role === 'EMPLOYEE') {
    throw new Error('FORBIDDEN: Only managers can update teams');
  }

  const exprs: string[] = [];
  const vals: Record<string, string> = {};

  if (updates.teamName) {
    exprs.push('teamName = :n');
    vals[':n'] = updates.teamName.trim();
  }

  if (exprs.length === 0) return;

  await docClient.send(new UpdateCommand({
    TableName: AWS_CONFIG.tables.teams,
    Key: { teamId },
    UpdateExpression: `SET ${exprs.join(', ')}`,
    ExpressionAttributeValues: vals,
  }));

  revalidatePath('/teams');
  revalidatePath('/dashboard');
}

// ─── DELETE TEAM ──────────────────────────────────────────────────────────────
// Checks that no users are currently assigned before deletion
export async function deleteTeam(teamId: string): Promise<void> {
  const user = await requireAuth();

  if (user.role === 'EMPLOYEE') {
    throw new Error('FORBIDDEN: Only managers can delete teams');
  }

  // Check if any users are still assigned to this team
  const members = await getTeamMembers(teamId);
  if (members.length > 0) {
    throw new Error(`Cannot delete team: ${members.length} member(s) still assigned. Reassign them first.`);
  }

  // Verify team exists
  const { Item } = await docClient.send(new GetCommand({
    TableName: AWS_CONFIG.tables.teams,
    Key: { teamId },
  }));

  if (!Item) throw new Error('Team not found');

  await docClient.send(new DeleteCommand({
    TableName: AWS_CONFIG.tables.teams,
    Key: { teamId },
  }));

  revalidatePath('/teams');
  revalidatePath('/dashboard');
}

// ─── UPDATE USER TEAM (assign/reassign a user to a team) ──────────────────────
export async function updateUserTeam(
  userId: string,
  newTeamId: string
): Promise<void> {
  const user = await requireAuth();

  if (user.role === 'EMPLOYEE') {
    throw new Error('FORBIDDEN: Only managers can assign users to teams');
  }

  // Verify the target team exists
  const { Item: teamItem } = await docClient.send(new GetCommand({
    TableName: AWS_CONFIG.tables.teams,
    Key: { teamId: newTeamId },
  }));

  if (!teamItem) throw new Error('Target team not found');

  // Update the user's teamId in the Users table
  await docClient.send(new UpdateCommand({
    TableName: AWS_CONFIG.tables.users,
    Key: { userId },
    UpdateExpression: 'SET teamId = :tid',
    ExpressionAttributeValues: { ':tid': newTeamId },
  }));

  revalidatePath('/teams');
  revalidatePath('/dashboard');
}
