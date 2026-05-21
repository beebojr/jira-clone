'use server';
import { QueryCommand, PutCommand, UpdateCommand, GetCommand, DeleteCommand, ScanCommand } from '@aws-sdk/lib-dynamodb';
import { SNSClient, PublishCommand } from '@aws-sdk/client-sns';
import { CloudWatchClient, PutMetricDataCommand } from '@aws-sdk/client-cloudwatch';
import { S3Client, ListObjectsV2Command, ListObjectVersionsCommand, DeleteObjectsCommand } from '@aws-sdk/client-s3';
import { randomUUID } from 'crypto';
import { docClient } from '../dynamo-client';
import { AWS_CONFIG } from '../aws-config';
import { requireAuth } from '../auth';
import { Task, TaskStatus } from '../types';
import { revalidatePath } from 'next/cache';

const snsClient = new SNSClient({ region: AWS_CONFIG.region });
const cwClient = new CloudWatchClient({ region: AWS_CONFIG.region });

// ==========================================
// 🛠️ MOCK MODE — only active when MOCK_AWS=true
// Set MOCK_AWS=true in .env.local to stub out SNS/CloudWatch
// Remove or leave unset for production / real AWS calls
// ==========================================
if (process.env.MOCK_AWS === 'true') {
  snsClient.send = async () => ({}) as any;
  cwClient.send = async () => ({}) as any;
}

// ─── GET TASKS (team-isolated) ────────────────────────────────────────────────
export async function getTasks(projectId: string): Promise<Task[]> {
  const user = await requireAuth();

  if (user.role === 'MANAGER' || user.role === 'ADMIN') {
    // MANAGER sees ALL tasks — scan with project filter
    const { Items } = await docClient.send(new ScanCommand({
      TableName: AWS_CONFIG.tables.tasks,
      FilterExpression: 'projectId = :pid',
      ExpressionAttributeValues: { ':pid': projectId },
    }));

    return (Items || []) as Task[];
  }

  // EMPLOYEE: query ONLY their team's tasks via GSI_Team
  const { Items } = await docClient.send(new QueryCommand({
    TableName: AWS_CONFIG.tables.tasks,
    IndexName: 'GSI_Team',
    KeyConditionExpression: 'teamId = :tid',
    FilterExpression: 'projectId = :pid',
    ExpressionAttributeValues: {
      ':tid': user.teamId,
      ':pid': projectId,
    },
  }));

  return (Items || []) as Task[];
}

// ─── CREATE TASK ──────────────────────────────────────────────────────────────
export async function createTask(input: {
  title: string;
  description: string;
  priority: Task['priority'];
  deadline: string;
  projectId: string;
  assigneeId: string;
  teamId?: string;
}): Promise<Task> {
  const user = await requireAuth();

  if (user.role === 'EMPLOYEE') {
    throw new Error('FORBIDDEN: Only managers can create tasks');
  }

  // Managers pick the team; the EMPLOYEE branch is unreachable (thrown above) — kept for type safety
  const teamId = input.teamId || user.teamId;

  const now = new Date().toISOString();
  const normalizedAssignee = input.assigneeId && input.assigneeId.trim() ? input.assigneeId : 'unassigned';
  const task: Task = {
    taskId: randomUUID(),
    title: input.title,
    description: input.description,
    status: 'TODO',
    priority: input.priority,
    deadline: input.deadline,
    teamId,
    assigneeId: normalizedAssignee,
    projectId: input.projectId,
    createdBy: user.userId,
    createdAt: now,
    updatedAt: now,
  };

  await docClient.send(new PutCommand({
    TableName: AWS_CONFIG.tables.tasks,
    Item: task,
  }));

  // Debug log to help local dev trace created tasks
  try {
    // eslint-disable-next-line no-console
    console.log('[createTask] created task:', task.taskId, 'project:', task.projectId, 'team:', task.teamId, 'assignee:', task.assigneeId);
  } catch (e) {
    // ignore
  }

  // Write audit log
  await writeAuditLog(task.taskId, user.userId, `Task created: "${task.title}"`);

  // Publish metric for CloudWatch dashboard
  await cwClient.send(new PutMetricDataCommand({
    Namespace: 'JiraClone/Tasks',
    MetricData: [{ MetricName: 'TaskCreated', Value: 1, Unit: 'Count' }],
  }));

  revalidatePath('/dashboard');
  revalidatePath(`/board/${input.projectId}`);
  return task;
}

// ─── UPDATE TASK STATUS (Kanban drag-and-drop) ────────────────────────────────
export async function updateTaskStatus(
  taskId: string,
  newStatus: TaskStatus
): Promise<void> {
  const user = await requireAuth();

  // Fetch task to verify team ownership before update
  const result = await docClient.send(new GetCommand({
    TableName: AWS_CONFIG.tables.tasks,
    Key: { taskId },
  }));
  const task = result.Item as Task | undefined;

  if (!task) throw new Error('Task not found');

  // EMPLOYEE: can only update status of tasks in their team
  if (user.role === 'EMPLOYEE') {
    if (task.teamId !== user.teamId) {
      throw new Error('FORBIDDEN: Cannot update tasks outside your team');
    }
  }

  const oldStatus = task.status;
  const now = new Date().toISOString();

  await docClient.send(new UpdateCommand({
    TableName: AWS_CONFIG.tables.tasks,
    Key: { taskId },
    UpdateExpression: 'SET #s = :status, updatedAt = :now',
    ExpressionAttributeNames: { '#s': 'status' },
    ExpressionAttributeValues: { ':status': newStatus, ':now': now },
  }));

  // Write audit log for every status change
  await writeAuditLog(taskId, user.userId, `Moved from ${oldStatus} to ${newStatus}`);

  // Publish metrics if moved to DONE
  if (newStatus === 'DONE') {
    const hoursToClose = (Date.now() - new Date(task.createdAt).getTime()) / 3600000;
    await cwClient.send(new PutMetricDataCommand({
      Namespace: 'JiraClone/Tasks',
      MetricData: [
        { MetricName: 'TaskClosed', Value: 1, Unit: 'Count', Dimensions: [{ Name: 'TeamId', Value: task.teamId }] },
        { MetricName: 'TimeToClose', Value: hoursToClose, Unit: 'Count', Dimensions: [{ Name: 'TeamId', Value: task.teamId }] }
      ],
    }));
  }

  revalidatePath('/dashboard');
  revalidatePath(`/board/${task.projectId}`);
  revalidatePath(`/tasks/${taskId}`);
}

// ─── ASSIGN TASK ──────────────────────────────────────────────────────────────
export async function assignTask(
  taskId: string,
  assigneeId: string
): Promise<void> {
  const user = await requireAuth();

  // Only MANAGER or ADMIN can assign tasks to any user
  if (user.role === 'EMPLOYEE') {
    throw new Error('FORBIDDEN: Only managers can assign tasks');
  }

  const now = new Date().toISOString();

  await docClient.send(new UpdateCommand({
    TableName: AWS_CONFIG.tables.tasks,
    Key: { taskId },
    UpdateExpression: 'SET assigneeId = :aid, updatedAt = :now',
    ExpressionAttributeValues: { ':aid': assigneeId, ':now': now },
  }));

  await writeAuditLog(taskId, user.userId, `Task assigned to userId: ${assigneeId}`);

  // Fetch teamId from the task so the activity-logger can use it as a CloudWatch dimension
  const assignResult = await docClient.send(new GetCommand({
    TableName: AWS_CONFIG.tables.tasks,
    Key: { taskId },
  }));
  const assignedTask = assignResult.Item as Task | undefined;

  // ⚠️ SHARED RESOURCE — SNS Publish (Member 5 creates this topic)
  // Include teamId in message so activity-logger Lambda can emit a per-team CloudWatch metric
  if (AWS_CONFIG.sns.taskAssignmentsTopic) {
    await snsClient.send(new PublishCommand({
      TopicArn: AWS_CONFIG.sns.taskAssignmentsTopic,
      Message: JSON.stringify({
        taskId,
        assigneeId,
        assignedBy: user.userId,
        teamId: assignedTask?.teamId || 'unknown',
      }),
      Subject: 'Task Assignment',
    }));
  }

  if (assignedTask) {
    revalidatePath(`/board/${assignedTask.projectId}`);
  }
  revalidatePath('/dashboard');
  revalidatePath(`/tasks/${taskId}`);
}

// ─── GET SINGLE TASK ──────────────────────────────────────────────────────────
export async function getTask(taskId: string): Promise<Task | null> {
  const user = await requireAuth();

  const getResult = await docClient.send(new GetCommand({
    TableName: AWS_CONFIG.tables.tasks,
    Key: { taskId },
  }));
  const Item = getResult.Item as Task | undefined;

  if (!Item) return null;

  // Team isolation check
  if (user.role === 'EMPLOYEE' && Item.teamId !== user.teamId) {
    throw new Error('FORBIDDEN');
  }

  return Item;
}

// ─── DELETE TASK ──────────────────────────────────────────────────────────────
export async function deleteTask(taskId: string): Promise<void> {
  const user = await requireAuth();

  // Only MANAGER or ADMIN can delete tasks
  if (user.role === 'EMPLOYEE') {
    throw new Error('FORBIDDEN: Only managers can delete tasks');
  }

  // Verify task exists before attempting cleanup
  const delResult = await docClient.send(new GetCommand({
    TableName: AWS_CONFIG.tables.tasks,
    Key: { taskId },
  }));
  const task = delResult.Item as Task | undefined;

  if (!task) throw new Error('Task not found');

  // S3 cleanup — must use ListObjectVersionsCommand (not ListObjectsV2) because the
  // uploads bucket has versioning enabled. ListObjectsV2 only sees current versions;
  // DeleteObjectsCommand without VersionId only adds a delete marker on a versioned bucket.
  // We must enumerate ALL versions + delete markers and delete them explicitly.
  const s3Client = new S3Client({ region: AWS_CONFIG.region });

  // Delete all versions and delete markers for original images
  const versionsOut = await s3Client.send(new ListObjectVersionsCommand({
    Bucket: AWS_CONFIG.s3.uploadsBucket,
    Prefix: `tasks/${taskId}/`,
  }));
  const allVersions = [
    ...(versionsOut.Versions || []).map(v => ({ Key: v.Key!, VersionId: v.VersionId! })),
    ...(versionsOut.DeleteMarkers || []).map(d => ({ Key: d.Key!, VersionId: d.VersionId! })),
  ];
  if (allVersions.length > 0) {
    await s3Client.send(new DeleteObjectsCommand({
      Bucket: AWS_CONFIG.s3.uploadsBucket,
      Delete: { Objects: allVersions },
    }));
  }

  // Delete thumbnails (thumbnails bucket is NOT versioned — ListObjectsV2 is fine here)
  const thumbListOut = await s3Client.send(new ListObjectsV2Command({
    Bucket: AWS_CONFIG.s3.thumbnailsBucket,
    Prefix: `thumbnails/${taskId}/`,
  }));
  if (thumbListOut.Contents && thumbListOut.Contents.length > 0) {
    await s3Client.send(new DeleteObjectsCommand({
      Bucket: AWS_CONFIG.s3.thumbnailsBucket,
      Delete: { Objects: thumbListOut.Contents.map(c => ({ Key: c.Key! })) },
    }));
  }

  await docClient.send(new DeleteCommand({
    TableName: AWS_CONFIG.tables.tasks,
    Key: { taskId },
  }));

  await writeAuditLog(taskId, user.userId, 'Task deleted');

  revalidatePath('/dashboard');
  revalidatePath(`/board/${task.projectId}`);
}

// ─── UPDATE TASK (edit title, description, priority, deadline) ────────────────
export async function updateTask(
  taskId: string,
  updates: { title?: string; description?: string; priority?: Task['priority']; deadline?: string }
): Promise<void> {
  const user = await requireAuth();

  const updResult = await docClient.send(new GetCommand({
    TableName: AWS_CONFIG.tables.tasks,
    Key: { taskId },
  }));
  const task = updResult.Item as Task | undefined;

  if (!task) throw new Error('Task not found');

  // Spec: only managers/admins edit task fields; employees may only update STATUS via updateTaskStatus()
  if (user.role === 'EMPLOYEE') {
    throw new Error('FORBIDDEN: Employees cannot edit task fields');
  }

  const exprs: string[] = [];
  const names: Record<string, string> = {};
  const vals: Record<string, string> = { ':now': new Date().toISOString() };

  if (updates.title) { exprs.push('#t = :t'); names['#t'] = 'title'; vals[':t'] = updates.title; }
  if (updates.description) { exprs.push('description = :d'); vals[':d'] = updates.description; }
  if (updates.priority) { exprs.push('priority = :p'); vals[':p'] = updates.priority; }
  if (updates.deadline) { exprs.push('deadline = :dl'); vals[':dl'] = updates.deadline; }
  exprs.push('updatedAt = :now');

  await docClient.send(new UpdateCommand({
    TableName: AWS_CONFIG.tables.tasks,
    Key: { taskId },
    UpdateExpression: `SET ${exprs.join(', ')}`,
    ExpressionAttributeNames: Object.keys(names).length ? names : undefined,
    ExpressionAttributeValues: vals,
  }));

  await writeAuditLog(taskId, user.userId, `Task updated: ${Object.keys(updates).join(', ')}`);

  revalidatePath('/dashboard');
  revalidatePath(`/board/${task.projectId}`);
  revalidatePath(`/tasks/${taskId}`);
}

// ─── UPDATE TASK IMAGE URLs (called after S3 upload / by image-resizer Lambda) ─
export async function updateTaskImages(
  taskId: string,
  imageOriginalUrl: string,
  imageThumbnailUrl: string
): Promise<void> {
  const user = await requireAuth();

  const getResult = await docClient.send(new GetCommand({
    TableName: AWS_CONFIG.tables.tasks,
    Key: { taskId },
  }));
  const task = getResult.Item as Task | undefined;

  if (!task) throw new Error('Task not found');

  if (user.role === 'EMPLOYEE') {
    if (task.teamId !== user.teamId) {
      throw new Error('FORBIDDEN: Cannot upload files for tasks outside your team');
    }
  }

  await docClient.send(new UpdateCommand({
    TableName: AWS_CONFIG.tables.tasks,
    Key: { taskId },
    UpdateExpression: 'SET imageOriginalUrl = :orig, imageThumbnailUrl = :thumb, updatedAt = :now',
    ExpressionAttributeValues: {
      ':orig': imageOriginalUrl,
      ':thumb': imageThumbnailUrl,
      ':now': new Date().toISOString(),
    },
  }));

  revalidatePath(`/board/${task.projectId}`);
  revalidatePath(`/tasks/${taskId}`);
}

// ─── INTERNAL: Write Audit Log ────────────────────────────────────────────────
async function writeAuditLog(
  taskId: string,
  userId: string,
  action: string
): Promise<void> {
  await docClient.send(new PutCommand({
    TableName: AWS_CONFIG.tables.auditLogs,
    Item: {
      logId: randomUUID(),
      taskId,
      userId,
      action,
      timestamp: new Date().toISOString(),
    },
  }));
}

// ─── GET MY ASSIGNED TASKS (uses GSI_Assignee — spec-required index) ─────────
// ⚠️ Spec mandates a GSI on assigneeId. This is the query that exercises it.
// Shows the current user all tasks assigned specifically to them, across all teams.
export async function getMyTasks(): Promise<Task[]> {
  const user = await requireAuth();

  const { Items } = await docClient.send(new QueryCommand({
    TableName: AWS_CONFIG.tables.tasks,
    IndexName: 'GSI_Assignee',
    KeyConditionExpression: 'assigneeId = :aid',
    ExpressionAttributeValues: { ':aid': user.userId },
  }));

  return (Items || []) as Task[];
}

// ─── GET USERS ────────────────────────────────────────────────────────────────
export async function getUsers(): Promise<{ userId: string; fullName: string; teamId: string }[]> {
  await requireAuth();

  const { Items } = await docClient.send(new ScanCommand({
    TableName: AWS_CONFIG.tables.users,
  }));

  return (Items || []).map((u: Record<string, string>) => ({
    userId: u.userId,
    fullName: u.fullName,
    teamId: u.teamId,
  }));
}
