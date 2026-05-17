// lib/aws-config.ts
// ⚠️ SHARED — All team members import from this file
// Values come from environment variables — never hardcode real values here

export const AWS_CONFIG = {
  region: process.env.AWS_REGION || 'us-east-1',
  cognito: {
    userPoolId: process.env.NEXT_PUBLIC_COGNITO_USER_POOL_ID!,
    clientId: process.env.NEXT_PUBLIC_COGNITO_CLIENT_ID!,
  },
  tables: {
    users:     process.env.DYNAMODB_USERS_TABLE    || 'JiraClone-Users',
    teams:     process.env.DYNAMODB_TEAMS_TABLE    || 'JiraClone-Teams',
    projects:  process.env.DYNAMODB_PROJECTS_TABLE || 'JiraClone-Projects',
    tasks:     process.env.DYNAMODB_TASKS_TABLE    || 'JiraClone-Tasks',
    comments:  process.env.DYNAMODB_COMMENTS_TABLE || 'JiraClone-Comments',
    auditLogs: process.env.DYNAMODB_AUDITLOGS_TABLE|| 'JiraClone-AuditLogs',
  },
  s3: {
    uploadsBucket:    process.env.S3_UPLOADS_BUCKET!,
    thumbnailsBucket: process.env.S3_THUMBNAILS_BUCKET!,
  },
  sns: {
    taskAssignmentsTopic: process.env.SNS_TASK_ASSIGNMENTS_TOPIC_ARN!,
  },
} as const;