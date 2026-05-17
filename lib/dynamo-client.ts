// lib/dynamo-client.ts
// ⚠️ SHARED — All Server Actions import { docClient } from this file

import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';
import { AWS_CONFIG } from './aws-config';

const client = new DynamoDBClient({
  region: AWS_CONFIG.region,
  // Credentials auto-resolved:
  // → On EC2: from IAM Instance Role (JiraClone-EC2-Role)
  // → Locally: from ~/.aws/credentials (your aws configure)
  // → Never hardcode credentials here
});

export const docClient = DynamoDBDocumentClient.from(client, {
  marshallOptions: {
    removeUndefinedValues: true, // Prevents DynamoDB errors on optional fields like imageOriginalUrl
  },
});