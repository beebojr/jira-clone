/**
 * Seed script: Creates teams in DynamoDB and assigns demo users to them.
 *
 * Usage:  node scripts/seed-teams.mjs
 *
 * Reads credentials from ../.env.local (same as the Next.js app).
 */

import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand, ScanCommand } from '@aws-sdk/lib-dynamodb';
import {
  CognitoIdentityProviderClient,
  ListUsersCommand,
  AdminGetUserCommand,
} from '@aws-sdk/client-cognito-identity-provider';
import { randomUUID } from 'crypto';
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

// ── Load .env.local ───────────────────────────────────────────────────────────
const __dirname = dirname(fileURLToPath(import.meta.url));
const envPath = resolve(__dirname, '..', '.env.local');
const envContent = readFileSync(envPath, 'utf-8');
const env = {};
for (const line of envContent.split('\n')) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith('#')) continue;
  const eqIdx = trimmed.indexOf('=');
  if (eqIdx === -1) continue;
  env[trimmed.slice(0, eqIdx)] = trimmed.slice(eqIdx + 1);
}

const REGION = env.AWS_REGION || 'us-east-1';
const USER_POOL_ID = env.NEXT_PUBLIC_COGNITO_USER_POOL_ID;
const TEAMS_TABLE = env.DYNAMODB_TEAMS_TABLE || 'JiraClone-Teams';
const USERS_TABLE = env.DYNAMODB_USERS_TABLE || 'JiraClone-Users';

const credentials = {
  accessKeyId: env.AWS_ACCESS_KEY_ID,
  secretAccessKey: env.AWS_SECRET_ACCESS_KEY,
};

const dynamoClient = DynamoDBDocumentClient.from(
  new DynamoDBClient({ region: REGION, credentials }),
  { marshallOptions: { removeUndefinedValues: true } }
);

const cognitoClient = new CognitoIdentityProviderClient({
  region: REGION,
  credentials,
});

// ── Demo users definition ─────────────────────────────────────────────────────
const DEMO_USERS = [
  {
    email: 'ali.manager.demo@gmail.com',
    fullName: 'Ali Manager',
    role: 'MANAGER',
    teamSlug: 'all', // managers see everything
  },
  {
    email: 'sara.frontend.demo@gmail.com',
    fullName: 'Sara Frontend',
    role: 'EMPLOYEE',
    teamSlug: 'frontend',
  },
  {
    email: 'omar.backend.demo@gmail.com',
    fullName: 'Omar Backend',
    role: 'EMPLOYEE',
    teamSlug: 'backend',
  },
];

// ── Teams to create ───────────────────────────────────────────────────────────
const TEAMS = [
  { teamId: 'frontend', teamName: 'Frontend Team' },
  { teamId: 'backend', teamName: 'Backend Team' },
];

// ── Helper: look up Cognito sub for a user by email ───────────────────────────
async function getCognitoSub(email) {
  try {
    const result = await cognitoClient.send(
      new ListUsersCommand({
        UserPoolId: USER_POOL_ID,
        Filter: `email = "${email}"`,
        Limit: 1,
      })
    );
    const user = result.Users?.[0];
    if (!user) {
      console.warn(`  ⚠ Cognito user not found for ${email}`);
      return null;
    }
    const subAttr = user.Attributes?.find((a) => a.Name === 'sub');
    return subAttr?.Value || null;
  } catch (err) {
    console.error(`  ✗ Error looking up ${email}:`, err.message);
    return null;
  }
}

// ── Main ──────────────────────────────────────────────────────────────────────
async function main() {
  console.log('╔═══════════════════════════════════════════════╗');
  console.log('║   Jira Clone — Seed Teams & Users             ║');
  console.log('╚═══════════════════════════════════════════════╝');
  console.log();

  // 1. Create teams
  console.log('── Creating teams ──────────────────────────────');
  for (const team of TEAMS) {
    try {
      await dynamoClient.send(
        new PutCommand({
          TableName: TEAMS_TABLE,
          Item: {
            teamId: team.teamId,
            teamName: team.teamName,
            managerId: 'system-seed',
          },
        })
      );
      console.log(`  ✓ Team "${team.teamName}" (${team.teamId})`);
    } catch (err) {
      console.error(`  ✗ Failed to create team ${team.teamId}:`, err.message);
    }
  }
  console.log();

  // 2. Look up Cognito subs and upsert users in DynamoDB
  console.log('── Syncing users ───────────────────────────────');
  for (const demoUser of DEMO_USERS) {
    const sub = await getCognitoSub(demoUser.email);
    if (!sub) {
      console.warn(`  ⚠ Skipping ${demoUser.email} — no Cognito sub found`);
      continue;
    }

    try {
      await dynamoClient.send(
        new PutCommand({
          TableName: USERS_TABLE,
          Item: {
            userId: sub,
            email: demoUser.email,
            fullName: demoUser.fullName,
            role: demoUser.role,
            teamId: demoUser.teamSlug,
          },
        })
      );
      console.log(
        `  ✓ ${demoUser.fullName} (${demoUser.email}) → team: ${demoUser.teamSlug}, sub: ${sub}`
      );
    } catch (err) {
      console.error(`  ✗ Failed to upsert ${demoUser.email}:`, err.message);
    }
  }
  console.log();

  // 3. Verify
  console.log('── Verification ────────────────────────────────');
  const { Items: teamItems } = await dynamoClient.send(
    new ScanCommand({ TableName: TEAMS_TABLE })
  );
  console.log(`  Teams in DB: ${teamItems?.length || 0}`);
  for (const t of teamItems || []) {
    console.log(`    • ${t.teamName} (${t.teamId})`);
  }

  const { Items: userItems } = await dynamoClient.send(
    new ScanCommand({ TableName: USERS_TABLE })
  );
  console.log(`  Users in DB: ${userItems?.length || 0}`);
  for (const u of userItems || []) {
    console.log(`    • ${u.fullName} — ${u.email} — team: ${u.teamId} — role: ${u.role}`);
  }

  console.log();
  console.log('Done! ✓');
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
