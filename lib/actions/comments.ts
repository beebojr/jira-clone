'use server';
import { QueryCommand, PutCommand } from '@aws-sdk/lib-dynamodb';
import { randomUUID } from 'crypto';
import { docClient } from '../dynamo-client';
import { AWS_CONFIG } from '../aws-config';
import { requireAuth } from '../auth';
import { Comment } from '../types';
import { revalidatePath } from 'next/cache';

export async function getComments(taskId: string): Promise<Comment[]> {
  await requireAuth();

  const { Items } = await docClient.send(new QueryCommand({
    TableName: AWS_CONFIG.tables.comments,
    IndexName: 'GSI_Task',
    KeyConditionExpression: 'taskId = :tid',
    ExpressionAttributeValues: { ':tid': taskId },
    ScanIndexForward: true, // oldest first
  }));

  return (Items || []) as Comment[];
}

export async function addComment(input: {
  taskId: string;
  content: string;
}): Promise<Comment> {
  const user = await requireAuth();

  const comment: Comment = {
    commentId: randomUUID(),
    taskId: input.taskId,
    userId: user.userId,
    userFullName: user.fullName,
    content: input.content,
    createdAt: new Date().toISOString(),
  };

  await docClient.send(new PutCommand({
    TableName: AWS_CONFIG.tables.comments,
    Item: comment,
  }));

  revalidatePath(`/tasks/${input.taskId}`);

  return comment;
}
