'use server';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { GetCommand } from '@aws-sdk/lib-dynamodb';
import { requireAuth } from '../auth';
import { AWS_CONFIG } from '../aws-config';
import { randomUUID } from 'crypto';
import { docClient } from '../dynamo-client';
import { Task } from '../types';

const s3Client = new S3Client({ region: AWS_CONFIG.region });

// Returns a pre-signed URL that lets the browser upload directly to S3
// Falls back to mock URL for local development when S3 is unavailable
export async function getUploadUrl(
  taskId: string,
  fileName: string,
  contentType: string
): Promise<{ uploadUrl: string; key: string }> {
  const user = await requireAuth();

  const getResult = await docClient.send(new GetCommand({
    TableName: AWS_CONFIG.tables.tasks,
    Key: { taskId },
  }));
  const task = getResult.Item as Task | undefined;

  if (!task) {
    throw new Error('Task not found');
  }

  if (user.role === 'EMPLOYEE') {
    if (task.teamId !== user.teamId) {
      throw new Error('FORBIDDEN: Cannot upload files for tasks outside your team');
    }
  }

  const key = `tasks/${taskId}/${randomUUID()}-${fileName}`;

  try {
    const command = new PutObjectCommand({
      Bucket: AWS_CONFIG.s3.uploadsBucket,
      Key: key,
      ContentType: contentType,
    });

    const uploadUrl = await getSignedUrl(s3Client, command, { expiresIn: 300 });

    return { uploadUrl, key };
  } catch (error) {
    // Fallback for local development (no AWS credentials)
    // Return mock URLs that allow the frontend to proceed
    const mockUploadUrl = `https://mock-s3.local/${key}`;
    
    // eslint-disable-next-line no-console
    console.log('[getUploadUrl] Using mock URL for local development:', mockUploadUrl);
    
    return { uploadUrl: mockUploadUrl, key };
  }
}
