import { config } from 'dotenv';
config({ path: '.env.local' });

import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, ScanCommand, DeleteCommand, PutCommand } from '@aws-sdk/lib-dynamodb';
import { randomUUID } from 'crypto';

const REGION = process.env.AWS_REGION || 'us-east-1';
const dynamo = DynamoDBDocumentClient.from(new DynamoDBClient({ region: REGION }));

const TABLES = {
  projects: process.env.DYNAMODB_PROJECTS_TABLE || 'JiraClone-Projects',
  tasks: process.env.DYNAMODB_TASKS_TABLE || 'JiraClone-Tasks',
  comments: process.env.DYNAMODB_COMMENTS_TABLE || 'JiraClone-Comments',
  auditLogs: process.env.DYNAMODB_AUDITLOGS_TABLE || 'JiraClone-AuditLogs',
  users: process.env.DYNAMODB_USERS_TABLE || 'JiraClone-Users',
  teams: process.env.DYNAMODB_TEAMS_TABLE || 'JiraClone-Teams',
};

async function clearTable(tableName: string, keyName: string) {
  console.log(`Scanning and clearing table: ${tableName}`);
  let lastEvaluatedKey = undefined;
  let deletedCount = 0;

  do {
    const response: any = await dynamo.send(new ScanCommand({
      TableName: tableName,
      ExclusiveStartKey: lastEvaluatedKey,
    }));

    const items = response.Items || [];
    for (const item of items) {
      await dynamo.send(new DeleteCommand({
        TableName: tableName,
        Key: { [keyName]: item[keyName] },
      }));
      deletedCount++;
    }
    lastEvaluatedKey = response.LastEvaluatedKey;
  } while (lastEvaluatedKey);

  console.log(`✅ Cleared ${deletedCount} items from ${tableName}`);
}

async function main() {
  console.log('=== Step 1: Clearing Messy Data ===');
  await clearTable(TABLES.auditLogs, 'logId');
  await clearTable(TABLES.comments, 'commentId');
  await clearTable(TABLES.tasks, 'taskId');
  await clearTable(TABLES.projects, 'projectId');

  console.log('\n=== Step 2: Fetching valid users and teams ===');
  const usersRes = await dynamo.send(new ScanCommand({ TableName: TABLES.users }));
  const teamsRes = await dynamo.send(new ScanCommand({ TableName: TABLES.teams }));
  
  const users = usersRes.Items || [];
  const teams = teamsRes.Items || [];
  
  const manager = users.find(u => u.role === 'MANAGER' || u.role === 'ADMIN');
  if (!manager) {
    throw new Error('No MANAGER found in JiraClone-Users. Ensure users are seeded.');
  }

  const frontendTeam = teams.find(t => t.teamId === 'frontend') || teams[0];
  const backendTeam = teams.find(t => t.teamId === 'backend') || teams[1] || teams[0];

  const frontendUser = users.find(u => u.teamId === frontendTeam.teamId && u.role === 'EMPLOYEE');
  const backendUser = users.find(u => u.teamId === backendTeam.teamId && u.role === 'EMPLOYEE');

  console.log(`Found Manager: ${manager.fullName} (${manager.userId})`);
  if (frontendUser) console.log(`Found Frontend Employee: ${frontendUser.fullName} (${frontendUser.userId})`);
  if (backendUser) console.log(`Found Backend Employee: ${backendUser.fullName} (${backendUser.userId})`);

  console.log('\n=== Step 3: Seeding High-Quality Data ===');

  // Seed Projects
  const projects = [
    {
      projectId: 'proj-mobile-001',
      projectName: 'Mobile App Revamp',
      description: 'Complete overhaul of the iOS and Android mobile app utilizing React Native.',
      createdAt: new Date().toISOString(),
    },
    {
      projectId: 'proj-infra-002',
      projectName: 'Serverless Infrastructure Migration',
      description: 'Migrating legacy monolith services to AWS Lambda and DynamoDB.',
      createdAt: new Date().toISOString(),
    },
    {
      projectId: 'proj-marketing-003',
      projectName: 'Q4 Product Launch',
      description: 'Marketing assets, landing pages, and email campaigns for the Q4 launch.',
      createdAt: new Date().toISOString(),
    }
  ];

  for (const p of projects) {
    await dynamo.send(new PutCommand({ TableName: TABLES.projects, Item: p }));
    console.log(`Created Project: ${p.projectName}`);
  }

  // Seed Tasks
  const tasks = [
    // Mobile App Revamp (proj-mobile-001)
    {
      taskId: randomUUID(),
      projectId: 'proj-mobile-001',
      title: 'Design new onboarding flow',
      description: 'Create Figma mockups for the new 3-step onboarding flow.',
      status: 'DONE',
      priority: 'HIGH',
      teamId: frontendTeam.teamId,
      assigneeId: frontendUser?.userId || 'unassigned',
      createdBy: manager.userId,
      createdAt: new Date(Date.now() - 7 * 86400000).toISOString(),
      updatedAt: new Date(Date.now() - 2 * 86400000).toISOString(),
      deadline: new Date(Date.now() - 1 * 86400000).toISOString(),
    },
    {
      taskId: randomUUID(),
      projectId: 'proj-mobile-001',
      title: 'Implement OAuth Apple Sign-In',
      description: 'Integrate Apple Sign-in via AWS Cognito in React Native.',
      status: 'IN_PROGRESS',
      priority: 'HIGH',
      teamId: backendTeam.teamId,
      assigneeId: backendUser?.userId || 'unassigned',
      createdBy: manager.userId,
      createdAt: new Date(Date.now() - 5 * 86400000).toISOString(),
      updatedAt: new Date().toISOString(),
      deadline: new Date(Date.now() + 2 * 86400000).toISOString(),
    },
    {
      taskId: randomUUID(),
      projectId: 'proj-mobile-001',
      title: 'Build UI for Profile Settings',
      description: 'Implement dark mode toggles and account deletion in settings.',
      status: 'TODO',
      priority: 'MEDIUM',
      teamId: frontendTeam.teamId,
      assigneeId: frontendUser?.userId || 'unassigned',
      createdBy: manager.userId,
      createdAt: new Date(Date.now() - 1 * 86400000).toISOString(),
      updatedAt: new Date().toISOString(),
      deadline: new Date(Date.now() + 5 * 86400000).toISOString(),
    },
    // Infra Migration (proj-infra-002)
    {
      taskId: randomUUID(),
      projectId: 'proj-infra-002',
      title: 'Provision DynamoDB Global Tables',
      description: 'Set up multi-region active-active tables for failover.',
      status: 'IN_REVIEW',
      priority: 'HIGH',
      teamId: backendTeam.teamId,
      assigneeId: backendUser?.userId || 'unassigned',
      createdBy: manager.userId,
      createdAt: new Date(Date.now() - 14 * 86400000).toISOString(),
      updatedAt: new Date(Date.now() - 1 * 86400000).toISOString(),
      deadline: new Date(Date.now() + 1 * 86400000).toISOString(),
    },
    {
      taskId: randomUUID(),
      projectId: 'proj-infra-002',
      title: 'Setup API Gateway Custom Domain',
      description: 'Configure Route53 and ACM certificates for api.example.com.',
      status: 'DONE',
      priority: 'MEDIUM',
      teamId: backendTeam.teamId,
      assigneeId: backendUser?.userId || 'unassigned',
      createdBy: manager.userId,
      createdAt: new Date(Date.now() - 20 * 86400000).toISOString(),
      updatedAt: new Date(Date.now() - 5 * 86400000).toISOString(),
    },
    // Marketing Q4 Launch (proj-marketing-003)
    {
      taskId: randomUUID(),
      projectId: 'proj-marketing-003',
      title: 'Develop Landing Page V2',
      description: 'Build the new hero section using Tailwind CSS and Framer Motion.',
      status: 'IN_PROGRESS',
      priority: 'HIGH',
      teamId: frontendTeam.teamId,
      assigneeId: frontendUser?.userId || 'unassigned',
      createdBy: manager.userId,
      createdAt: new Date(Date.now() - 3 * 86400000).toISOString(),
      updatedAt: new Date().toISOString(),
      deadline: new Date(Date.now() + 4 * 86400000).toISOString(),
    },
    {
      taskId: randomUUID(),
      projectId: 'proj-marketing-003',
      title: 'Email Campaign Backend Triggers',
      description: 'Configure SNS and Lambda to fire transactional emails.',
      status: 'TODO',
      priority: 'LOW',
      teamId: backendTeam.teamId,
      assigneeId: backendUser?.userId || 'unassigned',
      createdBy: manager.userId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      deadline: new Date(Date.now() + 10 * 86400000).toISOString(),
    }
  ];

  let taskCount = 0;
  for (const t of tasks) {
    await dynamo.send(new PutCommand({ TableName: TABLES.tasks, Item: t }));
    taskCount++;
    
    // Add realistic Audit logs for this task
    await dynamo.send(new PutCommand({
      TableName: TABLES.auditLogs,
      Item: {
        logId: randomUUID(),
        taskId: t.taskId,
        userId: manager.userId,
        userFullName: manager.fullName,
        action: `created task "${t.title}"`,
        timestamp: t.createdAt,
      }
    }));
    
    if (t.status !== 'TODO') {
      await dynamo.send(new PutCommand({
        TableName: TABLES.auditLogs,
        Item: {
          logId: randomUUID(),
          taskId: t.taskId,
          userId: t.assigneeId,
          userFullName: (users.find(u => u.userId === t.assigneeId) || {fullName: 'System'}).fullName,
          action: `moved task to ${t.status.replace(/_/g, ' ')}`,
          timestamp: t.updatedAt,
        }
      }));
    }
  }
  console.log(`Created ${taskCount} realistic Tasks with corresponding Audit Logs`);

  // Seed Comments
  const comments = [
    {
      commentId: randomUUID(),
      taskId: tasks[1].taskId, // OAuth Apple Sign-in
      userId: frontendUser?.userId || manager.userId,
      userFullName: frontendUser?.fullName || manager.fullName,
      content: 'Can we ensure the callback URL is configured properly in the manifest?',
      createdAt: new Date(Date.now() - 2 * 86400000).toISOString(),
    },
    {
      commentId: randomUUID(),
      taskId: tasks[1].taskId,
      userId: backendUser?.userId || manager.userId,
      userFullName: backendUser?.fullName || manager.fullName,
      content: 'Yes, I added it to the Terraform script yesterday.',
      createdAt: new Date(Date.now() - 1 * 86400000).toISOString(),
    },
    {
      commentId: randomUUID(),
      taskId: tasks[5].taskId, // Landing Page V2
      userId: manager.userId,
      userFullName: manager.fullName,
      content: 'Looks great! Make sure it scores 100 on Lighthouse before merging.',
      createdAt: new Date(Date.now() - 1 * 86400000).toISOString(),
    }
  ];

  for (const c of comments) {
    await dynamo.send(new PutCommand({ TableName: TABLES.comments, Item: c }));
  }
  console.log(`Created ${comments.length} Comments`);

  console.log('\n🎉 Successfully re-seeded high-quality data!');
}

main().catch(console.error);
