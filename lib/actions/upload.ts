'use server';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { requireAuth } from '../auth';
import { AWS_CONFIG } from '../aws-config';
import { randomUUID } from 'crypto';

const s3Client = new S3Client({ region: AWS_CONFIG.region });

// Returns a pre-signed URL that lets the browser upload directly to S3
export async function getUploadUrl(
  taskId: string,
  fileName: string,
  contentType: string
): Promise<{ uploadUrl: string; key: string }> {
  await requireAuth();

  const key = `tasks/${taskId}/${randomUUID()}-${fileName}`;

  const command = new PutObjectCommand({
    Bucket: AWS_CONFIG.s3.uploadsBucket,
    Key: key,
    ContentType: contentType,
  });

  const uploadUrl = await getSignedUrl(s3Client, command, { expiresIn: 300 });

  return { uploadUrl, key };
}
