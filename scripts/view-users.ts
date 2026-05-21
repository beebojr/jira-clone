import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, ScanCommand } from '@aws-sdk/lib-dynamodb';

const REGION = 'us-east-1';
const dynamo = DynamoDBDocumentClient.from(new DynamoDBClient({ region: REGION }));

async function main() {
  const users = await dynamo.send(new ScanCommand({ TableName: 'JiraClone-Users' }));
  console.log("=== USERS ===");
  console.log(JSON.stringify(users.Items, null, 2));

  const teams = await dynamo.send(new ScanCommand({ TableName: 'JiraClone-Teams' }));
  console.log("\n=== TEAMS ===");
  console.log(JSON.stringify(teams.Items, null, 2));
}

main().catch(console.error);
