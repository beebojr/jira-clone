// scripts/test-gsi.ts
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand, QueryCommand } from '@aws-sdk/lib-dynamodb';
import { randomUUID } from 'crypto';

const dynamo = DynamoDBDocumentClient.from(new DynamoDBClient({ region: 'us-east-1' }));

async function main() {
  const now = new Date().toISOString();
  console.log('Inserting test tasks...');

  // Insert one Frontend task
  await dynamo.send(new PutCommand({
    TableName: 'JiraClone-Tasks',
    Item: {
      taskId: randomUUID(),
      title: 'Frontend Task (GSI test)',
      description: 'Test item — safe to delete',
      status: 'TODO',
      priority: 'MEDIUM',
      deadline: '2026-12-31T00:00:00.000Z',
      teamId: 'frontend',
      assigneeId: 'sara-test',
      projectId: 'proj-001',
      createdBy: 'test-script',
      createdAt: now,
      updatedAt: now,
    },
  }));

  // Insert one Backend task
  await dynamo.send(new PutCommand({
    TableName: 'JiraClone-Tasks',
    Item: {
      taskId: randomUUID(),
      title: 'Backend Task (GSI test)',
      description: 'Test item — safe to delete',
      status: 'TODO',
      priority: 'HIGH',
      deadline: '2026-12-31T00:00:00.000Z',
      teamId: 'backend',
      assigneeId: 'omar-test',
      projectId: 'proj-001',
      createdBy: 'test-script',
      createdAt: now,
      updatedAt: now,
    },
  }));

  console.log('Querying via GSI_Team for teamId=frontend...');

  // Query ONLY frontend tasks via the GSI
  const result = await dynamo.send(new QueryCommand({
    TableName: 'JiraClone-Tasks',
    IndexName: 'GSI_Team',
    KeyConditionExpression: 'teamId = :tid',
    ExpressionAttributeValues: { ':tid': 'frontend' },
  }));

  const frontendCount = result.Items?.length ?? 0;
  const hasBackendItem = result.Items?.some(t => t.teamId === 'backend') ?? false;

  console.log(`\n--- Results ---`);
  console.log(`Frontend tasks returned: ${frontendCount} (expect ≥1)`);
  console.log(`Backend tasks in result: ${hasBackendItem} (expect: false)`);

  if (frontendCount >= 1 && !hasBackendItem) {
    console.log('\n✅ GSI team isolation PASSED — Sara cannot see Omar\'s tasks');
  } else {
    console.log('\n❌ GSI test FAILED — check your table setup');
    process.exit(1);
  }
}

main().catch(console.error);