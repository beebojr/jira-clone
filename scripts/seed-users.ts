// scripts/seed-users.ts
import {
  CognitoIdentityProviderClient,
  AdminCreateUserCommand,
  AdminSetUserPasswordCommand,
} from '@aws-sdk/client-cognito-identity-provider';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand } from '@aws-sdk/lib-dynamodb';

const REGION = 'us-east-1';
const USER_POOL_ID = 'us-east-1_Uni4e0hLN'; // ← REPLACE WITH YOUR REAL POOL ID

const cognitoClient = new CognitoIdentityProviderClient({ region: REGION });
const dynamo = DynamoDBDocumentClient.from(new DynamoDBClient({ region: REGION }));

const users = [
  {
    email: 'ali.manager.demo@gmail.com',
    password: 'Demo1234!',
    fullName: 'Ali Manager',
    role: 'MANAGER',
    teamId: 'all',         // Manager sees all teams
  },
  {
    email: 'sara.frontend.demo@gmail.com',
    password: 'Demo1234!',
    fullName: 'Sara Frontend',
    role: 'EMPLOYEE',
    teamId: 'frontend',   // Sara only sees Frontend tasks
  },
  {
    email: 'omar.backend.demo@gmail.com',
    password: 'Demo1234!',
    fullName: 'Omar Backend',
    role: 'EMPLOYEE',
    teamId: 'backend',    // Omar only sees Backend tasks
  },
];

async function seedUser(user: typeof users[0]) {
  console.log(`\nCreating: ${user.email}...`);

  // 1. Create the user in Cognito
  const createResult = await cognitoClient.send(new AdminCreateUserCommand({
    UserPoolId: USER_POOL_ID,
    Username: user.email,
    TemporaryPassword: user.password,
    MessageAction: 'SUPPRESS', // Don't send a welcome email
    UserAttributes: [
      { Name: 'email',           Value: user.email },
      { Name: 'email_verified',  Value: 'true' },
      { Name: 'name',            Value: user.fullName },
      { Name: 'custom:role',     Value: user.role },
      { Name: 'custom:teamId',   Value: user.teamId },
    ],
  }));

  // 2. Set a permanent password (skips forced password-change on first login)
  await cognitoClient.send(new AdminSetUserPasswordCommand({
    UserPoolId: USER_POOL_ID,
    Username: user.email,
    Password: user.password,
    Permanent: true,
  }));

  const userId = createResult.User!.Username!;
  console.log(`   Cognito userId: ${userId}`);

  // 3. Mirror the user into DynamoDB (the app reads from DynamoDB for profile lookups)
  await dynamo.send(new PutCommand({
    TableName: 'JiraClone-Users',
    Item: {
      userId,
      email: user.email,
      fullName: user.fullName,
      role: user.role,
      teamId: user.teamId,
      createdAt: new Date().toISOString(),
    },
  }));

  console.log(`✅ ${user.fullName} created in Cognito + DynamoDB`);
}

async function seedTeams() {
  console.log('\nCreating teams...');
  const teams = [
    { teamId: 'frontend', teamName: 'Frontend Team', managerId: 'ali-placeholder' },
    { teamId: 'backend',  teamName: 'Backend Team',  managerId: 'ali-placeholder' },
  ];

  for (const team of teams) {
    await dynamo.send(new PutCommand({ TableName: 'JiraClone-Teams', Item: team }));
    console.log(`✅ Team: ${team.teamName}`);
  }
}

async function seedProjects() {
  console.log('\nCreating demo project...');
  await dynamo.send(new PutCommand({
    TableName: 'JiraClone-Projects',
    Item: {
      projectId: 'proj-001',
      projectName: 'Jira Clone MVP',
      description: 'University AWS capstone project',
      createdAt: new Date().toISOString(),
    },
  }));
  console.log('✅ Project: Jira Clone MVP (proj-001)');
}

async function main() {
  console.log('=== Seeding demo users ===');

  for (const user of users) {
    await seedUser(user);
  }

  await seedTeams();
  await seedProjects();

  console.log('\n🎉 Seed complete! Demo credentials:');
  console.log('  Manager Ali:   ali.manager.demo@gmail.com  / Demo1234!');
  console.log('  Employee Sara: sara.frontend.demo@gmail.com / Demo1234!');
  console.log('  Employee Omar: omar.backend.demo@gmail.com  / Demo1234!');
}

main().catch(console.error);