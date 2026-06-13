# AWS Deployment Guide - Diocesan Finance API

This guide walks through deploying the GraphQL API to AWS using RDS (PostgreSQL), ElastiCache (Redis), and ECS with Fargate.

## Architecture on AWS

```
┌─────────────────────────────────────────────────────┐
│           CloudFront CDN (Optional)                 │
└────────────┬────────────────────────────────────────┘
             │
┌────────────┴────────────────────────────────────────┐
│         Application Load Balancer (ALB)             │
│              (Port 80/443)                          │
└────────────┬────────────────────────────────────────┘
             │
┌────────────┴────────────────────────────────────────┐
│    ECS Cluster (Fargate Launch Type)                │
│    ┌─────────────────────────────────────────┐      │
│    │  Task 1: GraphQL API Container (t3.sm) │      │
│    │  Task 2: GraphQL API Container (t3.sm) │      │
│    │  Task 3: GraphQL API Container (t3.sm) │      │
│    └─────────────────────────────────────────┘      │
└────────────┬────────────────────────────────────────┘
             │
       ┌─────┴──────┐
       │            │
    RDS-DB      ElastiCache
   PostgreSQL     (Redis)
   (Multi-AZ)     (Cluster)
```

## Prerequisites

1. **AWS Account** with billing enabled
2. **AWS CLI** installed and configured
   ```bash
   aws --version
   aws configure  # Enter your credentials
   ```
3. **Docker** installed locally
4. **ECR credentials** configured

## Step 1: Create RDS PostgreSQL Database

### Using AWS Console

1. Go to **RDS Dashboard**
2. Click **Create Database**
3. **Engine**: PostgreSQL 15.x
4. **Deployment**: Multi-AZ (for production)
5. **Instance Class**: db.t3.micro (development) or db.t3.small (production)
6. **Storage**: 20GB (gp3)
7. **DB name**: diocesan_finance
8. **Master username**: postgres
9. **Master password**: [Strong password - save it]
10. **VPC**: Default VPC
11. **Publicly accessible**: No
12. **Backup retention**: 30 days
13. Click **Create Database**

### Wait for Database to be Available (~10 minutes)

```bash
# Check status
aws rds describe-db-instances \
  --db-instance-identifier diocesan-finance-db \
  --query 'DBInstances[0].DBInstanceStatus'
```

### Initialize Database Schema

Once available, get the endpoint:

```bash
# Get RDS endpoint
RDS_ENDPOINT=$(aws rds describe-db-instances \
  --db-instance-identifier diocesan-finance-db \
  --query 'DBInstances[0].Endpoint.Address' \
  --output text)

echo $RDS_ENDPOINT  # Should output something like: diocesan-finance-db.xxxxx.us-east-1.rds.amazonaws.com
```

Connect and run schema:

```bash
# Install psql (if not already installed)
# macOS: brew install libpq
# Ubuntu: sudo apt-get install postgresql-client

psql -h $RDS_ENDPOINT \
  -U postgres \
  -d diocesan_finance \
  -f schema.sql
```

When prompted, enter the RDS master password.

## Step 2: Create ElastiCache Redis Cluster

### Using AWS CLI

```bash
aws elasticache create-cache-cluster \
  --cache-cluster-id diocesan-finance-cache \
  --cache-node-type cache.t3.micro \
  --engine redis \
  --engine-version 7.0 \
  --num-cache-nodes 1 \
  --vpc-security-group-ids sg-xxxxxxxxx
```

**Note:** Get security group ID from your VPC:
```bash
aws ec2 describe-security-groups \
  --filters Name=vpc-id,Values=vpc-xxxxxx \
  --query 'SecurityGroups[0].GroupId' \
  --output text
```

### Monitor Cluster Creation

```bash
aws elasticache describe-cache-clusters \
  --cache-cluster-id diocesan-finance-cache \
  --show-cache-node-info
```

Wait until **CacheClusterStatus** is "available" (~10 minutes)

Get the endpoint:

```bash
REDIS_ENDPOINT=$(aws elasticache describe-cache-clusters \
  --cache-cluster-id diocesan-finance-cache \
  --show-cache-node-info \
  --query 'CacheClusters[0].CacheNodes[0].Address' \
  --output text)

echo $REDIS_ENDPOINT
```

## Step 3: Push Docker Image to ECR

### Create ECR Repository

```bash
aws ecr create-repository \
  --repository-name diocesan-finance-api \
  --region us-east-1

# Save the repository URI
ECR_REPO=$(aws ecr describe-repositories \
  --repository-names diocesan-finance-api \
  --query 'repositories[0].repositoryUri' \
  --output text)

echo $ECR_REPO  # e.g., 123456789012.dkr.ecr.us-east-1.amazonaws.com/diocesan-finance-api
```

### Authenticate with ECR

```bash
aws ecr get-login-password --region us-east-1 | \
  docker login --username AWS --password-stdin $ECR_REPO
```

### Build and Push Image

```bash
# Build Docker image
docker build -t diocesan-finance-api:latest .

# Tag image for ECR
docker tag diocesan-finance-api:latest $ECR_REPO:latest

# Push to ECR
docker push $ECR_REPO:latest

# Verify push
aws ecr describe-images --repository-name diocesan-finance-api
```

## Step 4: Create ECS Cluster and Task Definition

### Create ECS Cluster

```bash
aws ecs create-cluster \
  --cluster-name diocesan-finance-cluster \
  --region us-east-1
```

### Create Task Execution Role (IAM)

```bash
# Create trust policy document
cat > trust-policy.json << EOF
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "Service": "ecs-tasks.amazonaws.com"
      },
      "Action": "sts:AssumeRole"
    }
  ]
}
EOF

# Create IAM role
aws iam create-role \
  --role-name ecsTaskExecutionRole \
  --assume-role-policy-document file://trust-policy.json

# Attach policy
aws iam attach-role-policy \
  --role-name ecsTaskExecutionRole \
  --policy-arn arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy

# Get role ARN
TASK_EXEC_ROLE=$(aws iam get-role \
  --role-name ecsTaskExecutionRole \
  --query 'Role.Arn' \
  --output text)

echo $TASK_EXEC_ROLE
```

### Register Task Definition

Create `task-definition.json`:

```json
{
  "family": "diocesan-finance-api",
  "networkMode": "awsvpc",
  "requiresCompatibilities": ["FARGATE"],
  "cpu": "256",
  "memory": "512",
  "executionRoleArn": "YOUR_TASK_EXEC_ROLE_ARN",
  "containerDefinitions": [
    {
      "name": "diocesan-finance-api",
      "image": "YOUR_ECR_REPO:latest",
      "portMappings": [
        {
          "containerPort": 4000,
          "hostPort": 4000,
          "protocol": "tcp"
        }
      ],
      "environment": [
        {
          "name": "NODE_ENV",
          "value": "production"
        },
        {
          "name": "DB_HOST",
          "value": "YOUR_RDS_ENDPOINT"
        },
        {
          "name": "DB_PORT",
          "value": "5432"
        },
        {
          "name": "DB_NAME",
          "value": "diocesan_finance"
        },
        {
          "name": "DB_USER",
          "value": "postgres"
        },
        {
          "name": "REDIS_HOST",
          "value": "YOUR_REDIS_ENDPOINT"
        },
        {
          "name": "REDIS_PORT",
          "value": "6379"
        }
      ],
      "secrets": [
        {
          "name": "DB_PASSWORD",
          "valueFrom": "arn:aws:secretsmanager:us-east-1:ACCOUNT_ID:secret:diocesan/db-password"
        },
        {
          "name": "JWT_SECRET",
          "valueFrom": "arn:aws:secretsmanager:us-east-1:ACCOUNT_ID:secret:diocesan/jwt-secret"
        },
        {
          "name": "REFRESH_SECRET",
          "valueFrom": "arn:aws:secretsmanager:us-east-1:ACCOUNT_ID:secret:diocesan/refresh-secret"
        }
      ],
      "logConfiguration": {
        "logDriver": "awslogs",
        "options": {
          "awslogs-group": "/ecs/diocesan-finance-api",
          "awslogs-region": "us-east-1",
          "awslogs-stream-prefix": "ecs"
        }
      },
      "healthCheck": {
        "command": ["CMD-SHELL", "curl -f http://localhost:4000/health || exit 1"],
        "interval": 30,
        "timeout": 10,
        "retries": 3,
        "startPeriod": 60
      }
    }
  ]
}
```

Replace placeholders:
- `YOUR_TASK_EXEC_ROLE_ARN`: From Step 4.1
- `YOUR_ECR_REPO`: From Step 3.1
- `YOUR_RDS_ENDPOINT`: From Step 1
- `YOUR_REDIS_ENDPOINT`: From Step 2
- `ACCOUNT_ID`: Your AWS Account ID

Register the task:

```bash
aws ecs register-task-definition \
  --cli-input-json file://task-definition.json
```

## Step 5: Store Secrets in AWS Secrets Manager

```bash
# Create secrets
aws secretsmanager create-secret \
  --name diocesan/db-password \
  --secret-string "your-strong-password"

aws secretsmanager create-secret \
  --name diocesan/jwt-secret \
  --secret-string "your-random-jwt-secret"

aws secretsmanager create-secret \
  --name diocesan/refresh-secret \
  --secret-string "your-random-refresh-secret"
```

## Step 6: Create Application Load Balancer

```bash
# Create security group for ALB
ALB_SG=$(aws ec2 create-security-group \
  --group-name diocesan-alb-sg \
  --description "ALB for Diocesan Finance API" \
  --query 'GroupId' \
  --output text)

# Allow HTTP (port 80)
aws ec2 authorize-security-group-ingress \
  --group-id $ALB_SG \
  --protocol tcp \
  --port 80 \
  --cidr 0.0.0.0/0

# Allow HTTPS (port 443)
aws ec2 authorize-security-group-ingress \
  --group-id $ALB_SG \
  --protocol tcp \
  --port 443 \
  --cidr 0.0.0.0/0

# Create ALB
ALB=$(aws elbv2 create-load-balancer \
  --name diocesan-finance-alb \
  --subnets subnet-xxxxxxxx subnet-yyyyyyyy \
  --security-groups $ALB_SG \
  --scheme internet-facing \
  --type application \
  --query 'LoadBalancers[0].LoadBalancerArn' \
  --output text)

echo $ALB
```

Get your subnet IDs:
```bash
aws ec2 describe-subnets \
  --filters Name=vpc-id,Values=vpc-xxxxx \
  --query 'Subnets[*].SubnetId' \
  --output text
```

## Step 7: Create ECS Service

```bash
# Create security group for ECS tasks
ECS_SG=$(aws ec2 create-security-group \
  --group-name diocesan-ecs-sg \
  --description "ECS tasks for Diocesan Finance API" \
  --query 'GroupId' \
  --output text)

# Allow traffic from ALB on port 4000
aws ec2 authorize-security-group-ingress \
  --group-id $ECS_SG \
  --protocol tcp \
  --port 4000 \
  --source-security-group-id $ALB_SG

# Create service
aws ecs create-service \
  --cluster diocesan-finance-cluster \
  --service-name diocesan-finance-service \
  --task-definition diocesan-finance-api \
  --desired-count 3 \
  --launch-type FARGATE \
  --network-configuration "awsvpcConfiguration={subnets=[subnet-xxxxxxxx,subnet-yyyyyyyy],securityGroups=[$ECS_SG],assignPublicIp=DISABLED}" \
  --load-balancers targetGroupArn=arn:aws:elasticloadbalancing:us-east-1:ACCOUNT_ID:targetgroup/diocesan-finance/xxxxx,containerName=diocesan-finance-api,containerPort=4000
```

## Step 8: Configure Auto Scaling

```bash
# Register scalable target
aws application-autoscaling register-scalable-target \
  --service-namespace ecs \
  --resource-id service/diocesan-finance-cluster/diocesan-finance-service \
  --scalable-dimension ecs:service:DesiredCount \
  --min-capacity 2 \
  --max-capacity 10

# Create scaling policy
aws application-autoscaling put-scaling-policy \
  --service-namespace ecs \
  --resource-id service/diocesan-finance-cluster/diocesan-finance-service \
  --scalable-dimension ecs:service:DesiredCount \
  --policy-name diocesan-cpu-scaling \
  --policy-type TargetTrackingScaling \
  --target-tracking-scaling-policy-configuration "TargetValue=70.0,PredefinedMetricSpecification={PredefinedMetricType=ECSServiceAverageCPUUtilization}"
```

## Step 9: Setup CI/CD Pipeline (GitHub Actions)

Create `.github/workflows/deploy.yml`:

```yaml
name: Deploy to AWS ECS

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

env:
  AWS_REGION: us-east-1
  ECR_REPOSITORY: diocesan-finance-api
  ECS_CLUSTER: diocesan-finance-cluster
  ECS_SERVICE: diocesan-finance-service
  ECS_TASK_DEFINITION: diocesan-finance-api

jobs:
  deploy:
    runs-on: ubuntu-latest
    permissions:
      contents: read
      id-token: write

    steps:
      - uses: actions/checkout@v3

      - name: Configure AWS credentials
        uses: aws-actions/configure-aws-credentials@v2
        with:
          role-to-assume: ${{ secrets.AWS_ROLE_ARN }}
          aws-region: ${{ env.AWS_REGION }}

      - name: Login to ECR
        id: login-ecr
        uses: aws-actions/amazon-ecr-login@v1

      - name: Build, tag, and push image
        id: image
        env:
          ECR_REGISTRY: ${{ steps.login-ecr.outputs.registry }}
          IMAGE_TAG: ${{ github.sha }}
        run: |
          docker build -t $ECR_REGISTRY/$ECR_REPOSITORY:$IMAGE_TAG .
          docker push $ECR_REGISTRY/$ECR_REPOSITORY:$IMAGE_TAG
          echo "image=$ECR_REGISTRY/$ECR_REPOSITORY:$IMAGE_TAG" >> $GITHUB_OUTPUT

      - name: Update ECS service
        uses: aws-actions/amazon-ecs-render-task-definition@v1
        with:
          task-definition: ${{ env.ECS_TASK_DEFINITION }}
          container-name: ${{ env.ECS_REPOSITORY }}
          image: ${{ steps.image.outputs.image }}

      - name: Deploy to ECS
        uses: aws-actions/amazon-ecs-deploy-task-definition@v1
        with:
          task-definition: ${{ env.ECS_TASK_DEFINITION }}
          service: ${{ env.ECS_SERVICE }}
          cluster: ${{ env.ECS_CLUSTER }}
          wait-for-service-stability: true
```

## Step 10: Monitor and Test

### Get ALB DNS Name

```bash
aws elbv2 describe-load-balancers \
  --load-balancer-arns YOUR_ALB_ARN \
  --query 'LoadBalancers[0].DNSName' \
  --output text
```

### Test API

```bash
curl http://YOUR_ALB_DNS/health
```

### View Logs

```bash
aws logs tail /ecs/diocesan-finance-api --follow
```

### Monitor Performance

```bash
# CPU Utilization
aws cloudwatch get-metric-statistics \
  --namespace AWS/ECS \
  --metric-name CPUUtilization \
  --dimensions Name=ClusterName,Value=diocesan-finance-cluster Name=ServiceName,Value=diocesan-finance-service \
  --start-time 2024-01-01T00:00:00Z \
  --end-time 2024-01-02T00:00:00Z \
  --period 300 \
  --statistics Average
```

## Cost Optimization Tips

1. **Use Fargate Spot** for non-critical workloads (70% cost savings)
2. **Scale down during off-hours** using scheduled ECS tasks
3. **Use RDS Aurora Serverless** for unpredictable workloads
4. **Enable RDS automated backups** only for 7 days
5. **Use CloudFront** to cache GraphQL responses

## Troubleshooting

### Tasks Keep Stopping

1. Check CloudWatch logs: `aws logs tail /ecs/diocesan-finance-api --follow`
2. Verify RDS connectivity
3. Check security groups

### Database Connection Errors

```bash
# Test RDS connectivity
psql -h $RDS_ENDPOINT -U postgres -d diocesan_finance -c "SELECT 1"
```

### Redis Connection Issues

```bash
# Test Redis connectivity
redis-cli -h $REDIS_ENDPOINT ping
```

## Next Steps

1. Setup custom domain (Route 53)
2. Add SSL/TLS certificate (ACM)
3. Configure CloudFront CDN
4. Setup monitoring (CloudWatch alarms)
5. Configure database backups
6. Setup disaster recovery plan

## Cost Estimation (Monthly)

| Service | Tier | Cost |
|---------|------|------|
| RDS PostgreSQL | t3.micro | $30-50 |
| ElastiCache Redis | t3.micro | $20-30 |
| ECS Fargate | 3 tasks (256 CPU, 512 MB RAM) | $40-60 |
| ALB | 1 LB + data processing | $20-30 |
| **Total** | | **$110-170/month** |

For production, upgrade to t3.small/t3.medium for higher availability.
