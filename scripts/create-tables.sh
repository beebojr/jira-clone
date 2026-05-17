#!/bin/bash
REGION="us-east-1"

echo "=== Creating JiraClone-Users ==="
aws dynamodb create-table \
  --table-name JiraClone-Users \
  --attribute-definitions AttributeName=userId,AttributeType=S \
  --key-schema AttributeName=userId,KeyType=HASH \
  --billing-mode PAY_PER_REQUEST \
  --region $REGION

echo "=== Creating JiraClone-Teams ==="
aws dynamodb create-table \
  --table-name JiraClone-Teams \
  --attribute-definitions AttributeName=teamId,AttributeType=S \
  --key-schema AttributeName=teamId,KeyType=HASH \
  --billing-mode PAY_PER_REQUEST \
  --region $REGION

echo "=== Creating JiraClone-Projects ==="
aws dynamodb create-table \
  --table-name JiraClone-Projects \
  --attribute-definitions AttributeName=projectId,AttributeType=S \
  --key-schema AttributeName=projectId,KeyType=HASH \
  --billing-mode PAY_PER_REQUEST \
  --region $REGION

echo "=== Creating JiraClone-Tasks (with GSI_Team + GSI_Assignee) ==="
aws dynamodb create-table \
  --table-name JiraClone-Tasks \
  --attribute-definitions \
    AttributeName=taskId,AttributeType=S \
    AttributeName=teamId,AttributeType=S \
    AttributeName=assigneeId,AttributeType=S \
    AttributeName=createdAt,AttributeType=S \
  --key-schema AttributeName=taskId,KeyType=HASH \
  --billing-mode PAY_PER_REQUEST \
  --global-secondary-indexes '[
    {
      "IndexName":"GSI_Team",
      "KeySchema":[
        {"AttributeName":"teamId","KeyType":"HASH"},
        {"AttributeName":"createdAt","KeyType":"RANGE"}
      ],
      "Projection":{"ProjectionType":"ALL"}
    },
    {
      "IndexName":"GSI_Assignee",
      "KeySchema":[
        {"AttributeName":"assigneeId","KeyType":"HASH"},
        {"AttributeName":"createdAt","KeyType":"RANGE"}
      ],
      "Projection":{"ProjectionType":"ALL"}
    }
  ]' \
  --region $REGION

echo "=== Creating JiraClone-Comments (with GSI_Task) ==="
aws dynamodb create-table \
  --table-name JiraClone-Comments \
  --attribute-definitions \
    AttributeName=commentId,AttributeType=S \
    AttributeName=taskId,AttributeType=S \
    AttributeName=createdAt,AttributeType=S \
  --key-schema AttributeName=commentId,KeyType=HASH \
  --billing-mode PAY_PER_REQUEST \
  --global-secondary-indexes '[
    {
      "IndexName":"GSI_Task",
      "KeySchema":[
        {"AttributeName":"taskId","KeyType":"HASH"},
        {"AttributeName":"createdAt","KeyType":"RANGE"}
      ],
      "Projection":{"ProjectionType":"ALL"}
    }
  ]' \
  --region $REGION

echo "=== Creating JiraClone-AuditLogs (with GSI_Task) ==="
aws dynamodb create-table \
  --table-name JiraClone-AuditLogs \
  --attribute-definitions \
    AttributeName=logId,AttributeType=S \
    AttributeName=taskId,AttributeType=S \
    AttributeName=timestamp,AttributeType=S \
  --key-schema AttributeName=logId,KeyType=HASH \
  --billing-mode PAY_PER_REQUEST \
  --global-secondary-indexes '[
    {
      "IndexName":"GSI_Task",
      "KeySchema":[
        {"AttributeName":"taskId","KeyType":"HASH"},
        {"AttributeName":"timestamp","KeyType":"RANGE"}
      ],
      "Projection":{"ProjectionType":"ALL"}
    }
  ]' \
  --region $REGION

echo ""
echo "=== All 6 tables created! ==="