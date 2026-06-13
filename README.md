# Diocesan Finance Management System

A production-ready GraphQL API for managing diocesan financial records with role-based access control, bulk spreadsheet uploads, and comprehensive financial dashboards.

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                     React Frontend (Vercel)                  │
│  - Admin Dashboard (all parishes)                            │
│  - Priest Dashboard (own parish only)                        │
│  - Spreadsheet uploader                                      │
└────────────────────────┬────────────────────────────────────┘
                         │
                    Apollo Client
                         │
┌────────────────────────┴────────────────────────────────────┐
│         GraphQL API (Node.js/Apollo/Express)                 │
│                  (AWS EC2/ECS)                               │
│  ├─ Authentication (JWT + refresh tokens)                   │
│  ├─ Role-based access control                               │
│  ├─ Remittance record management                            │
│  ├─ Spreadsheet parser & bulk uploads                       │
│  └─ Financial calculations & aggregations                   │
└────────────────────────┬────────────────────────────────────┘
                         │
         ┌───────────────┼───────────────┐
         │               │               │
    PostgreSQL       Redis Cache      S3 (files)
    (RDS)          (ElastiCache)
```

## Tech Stack

### Backend
- **Runtime:** Node.js 18+
- **API:** Apollo GraphQL Server
- **Database:** PostgreSQL 14+ (AWS RDS)
- **Cache:** Redis (AWS ElastiCache)
- **File Storage:** AWS S3
- **Authentication:** JWT with refresh tokens
- **File Parsing:** ExcelJS, csv-parse

### Frontend (Separate Repo)
- React 18+
- Apollo Client
- Tailwind CSS / Material-UI
- React Router for role-based navigation

### Deployment
- **Backend:** AWS EC2/ECS + RDS + ElastiCache
- **Frontend:** Vercel
- **CDN:** CloudFront (optional)

## Local Development Setup

### Prerequisites
- Node.js 18.x or higher
- PostgreSQL 14+ running locally or remote
- npm 9+

### Installation

1. **Clone the repository**
   ```bash
   git clone <repo-url>
   cd diocesan-finance-api
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure environment variables**
   ```bash
   cp .env.example .env
   # Edit .env with your database credentials
   ```

4. **Initialize the database**
   ```bash
   psql -U postgres -d diocesan_finance -f schema.sql
   ```

5. **Start the development server**
   ```bash
   npm run dev
   ```

   The GraphQL playground will be available at `http://localhost:4000/graphql`

## Database Schema

### Core Tables

#### `users`
- `id`: Primary key
- `email`: Unique user email
- `password_hash`: Bcrypt hashed password
- `role`: ADMIN, PRIEST, or SUPER_ADMIN
- `parish_id`: Foreign key to parishes (nullable for admins)
- `is_active`: Soft delete flag

#### `parishes`
- `id`: Primary key
- `name`: Unique parish name
- `diocese`: Diocese name
- `location`: Physical location
- Contact information

#### `remittance_records`
- `id`: Primary key
- `parish_id`: Foreign key to parishes
- `year`: Year of remittance
- `month`: Month (1-12)
- `uploaded_by`: User ID who uploaded
- `notes`: Optional notes
- Unique constraint on (parish_id, year, month)

#### `remittance_line_items`
- `id`: Primary key
- `remittance_record_id`: Foreign key
- `remittance_source_id`: Foreign key to sources
- `amount`: Decimal amount

#### `remittance_sources`
Pre-populated with:
- First Collection
- Second Collection
- Tithe
- Harvest
- Special Offering
- Donations
- Other Income

#### `audit_logs`
- Tracks all user actions
- Stores before/after values
- User ID and timestamp

## API Documentation

### Authentication

#### Login
```graphql
mutation {
  login(email: "admin@diocese.org", password: "password") {
    token
    refreshToken
    user {
      id
      email
      role
    }
  }
}
```

Include token in request headers:
```
Authorization: Bearer <token>
```

### Remittance Queries

#### Get Diocese Financial Summary
```graphql
query {
  dioceseFinancialSummary(year: 2024) {
    year
    totalRemittance
    parishTotals {
      parish {
        id
        name
      }
      yearTotal
      monthlyTotals {
        month
        monthName
        amount
      }
    }
  }
}
```

#### Get Parish Yearly Remittance
```graphql
query {
  parishYearlyRemittance(parishId: 1, year: 2024) {
    parish {
      name
    }
    yearTotal
    monthlyTotals {
      month
      monthName
      amount
    }
  }
}
```

#### Get Monthly Parish Comparison
```graphql
query {
  parishMonthlyComparison(year: 2024, month: 3) {
    parish {
      name
    }
    month
    monthName
    total
  }
}
```

### Remittance Mutations

#### Create Remittance Record
```graphql
mutation {
  createRemittanceRecord(
    parishId: 1
    year: 2024
    month: 3
    lineItems: [
      { remittanceSourceId: 1, amount: 50000 }
      { remittanceSourceId: 2, amount: 25000 }
      { remittanceSourceId: 3, amount: 10000 }
    ]
    notes: "March 2024 collections"
  ) {
    id
    totalAmount
    createdAt
  }
}
```

### File Upload

#### Upload Spreadsheet (REST endpoint)
```bash
curl -X POST http://localhost:4000/api/upload \
  -H "Authorization: Bearer <token>" \
  -F "file=@remittances.xlsx" \
  -F "year=2024"
```

**Expected Excel Format:**

Each sheet should be named after a month (JAN, FEB, MAR, etc.):

| Parish Name | First Collection | Second Collection | Tithe | Harvest | Special Offering |
|-------------|------------------|-------------------|-------|---------|------------------|
| St. Joseph  | 50000            | 25000             | 10000 | 5000    | 2000             |
| St. Mary    | 45000            | 20000             | 8000  | 4000    | 1500             |

Or use a single sheet with a Month column:

| Parish Name | Month | First Collection | Second Collection | ... |
|-------------|-------|------------------|-------------------|-----|

## User Roles & Permissions

### SUPER_ADMIN
- Manage all users
- View all parishes
- Upload/edit remittance records for all parishes
- Access audit logs
- System configuration

### ADMIN (Financial Administrator)
- Upload spreadsheets with remittance data
- Edit remittance records for all parishes
- View all parishes and their financial data
- Cannot modify user accounts

### PRIEST
- View only their own parish's financial records
- Cannot edit or upload data
- Read-only access to dashboards

## Spreadsheet Upload Format

### Option 1: Month-Based Sheets (Recommended)
- One sheet per month
- Sheet name = month name (JAN, FEB, MAR, etc.)
- First column = Parish Name
- Remaining columns = Remittance sources
- Data rows = Parish data

### Option 2: Single Sheet with Month Column
- One sheet with all data
- Column 1: Parish Name
- Column 2: Month (must match month names)
- Remaining columns = Remittance sources

## Deployment on AWS

### Prerequisites
- AWS Account
- AWS CLI configured
- Docker (for containerization)
- Terraform or CloudFormation (for infrastructure)

### RDS Setup (PostgreSQL)
```bash
# Create RDS instance
aws rds create-db-instance \
  --db-instance-identifier diocesan-finance-db \
  --db-instance-class db.t3.micro \
  --engine postgres \
  --master-username postgres \
  --allocated-storage 20 \
  --region us-east-1
```

### ElastiCache Setup (Redis)
```bash
# Create Redis cluster
aws elasticache create-cache-cluster \
  --cache-cluster-id diocesan-finance-cache \
  --cache-node-type cache.t3.micro \
  --engine redis \
  --region us-east-1
```

### EC2/ECS Deployment
1. Build Docker image:
   ```bash
   docker build -t diocesan-finance-api:latest .
   ```

2. Push to ECR:
   ```bash
   aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin <account-id>.dkr.ecr.us-east-1.amazonaws.com
   docker push <account-id>.dkr.ecr.us-east-1.amazonaws.com/diocesan-finance-api:latest
   ```

3. Deploy to ECS using CloudFormation or Terraform

### Environment Variables on AWS
Set in AWS Systems Manager Parameter Store or ECS task definition:
```
DB_HOST=diocesan-finance-db.xxxxx.us-east-1.rds.amazonaws.com
REDIS_HOST=diocesan-finance-cache.xxxxx.ng.0001.use1.cache.amazonaws.com
JWT_SECRET=<strong-random-secret>
```

## Performance Optimization

### Caching Strategy
- User sessions cached in Redis (1-hour TTL)
- Parish data cached (30-minute TTL)
- Remittance calculations cached (1-hour TTL)
- Clear cache on write operations

### Database Indexes
```sql
CREATE INDEX idx_remittance_records_parish_year_month ON remittance_records(parish_id, year, month);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_audit_logs_user_timestamp ON audit_logs(user_id, timestamp);
```

### Query Optimization
- Use batch queries where possible
- Implement pagination for large result sets
- Lazy-load related data with resolvers

## Security Best Practices

1. **JWT Tokens**
   - Store secrets in AWS Secrets Manager
   - Implement refresh token rotation
   - Short-lived access tokens (1 hour)
   - Long-lived refresh tokens (7 days)

2. **Database Security**
   - Use RDS encryption at rest
   - Enable SSL/TLS for connections
   - Run in private VPC subnet
   - Use security groups to restrict access

3. **Authentication**
   - Bcrypt password hashing (salt rounds: 10)
   - Rate limiting on login endpoint
   - Two-factor authentication (optional enhancement)

4. **Authorization**
   - Role-based access control in resolvers
   - Verify user permissions on every mutation
   - Audit all sensitive operations

5. **File Upload Security**
   - Validate file types (xlsx, csv only)
   - Scan files for malware
   - Store in S3 with restricted access
   - Implement virus scanning (ClamAV)

## Testing

```bash
# Unit tests
npm test

# GraphQL queries in Apollo Sandbox
# Visit http://localhost:4000/graphql
```

### Sample GraphQL Queries for Testing

See `tests/queries.graphql` for comprehensive test queries.

## Troubleshooting

### Database Connection Issues
```bash
# Test PostgreSQL connection
psql -U postgres -h localhost -d diocesan_finance

# Check environment variables
cat .env
```

### JWT Token Errors
- Verify JWT_SECRET is set
- Check token expiration (default: 1 hour)
- Use refresh token to get new access token

### File Upload Failures
- Verify file format (XLSX or CSV)
- Check file size (max 10MB)
- Ensure column names match expected sources

## Contributing

1. Create a feature branch: `git checkout -b feature/your-feature`
2. Commit changes: `git commit -am 'Add feature'`
3. Push to branch: `git push origin feature/your-feature`
4. Create Pull Request

## License

MIT License - See LICENSE file for details

## Support

For issues and questions:
- Email: justice@diocese.org
- GitHub Issues: [Create an issue]

## Roadmap

- [ ] Two-factor authentication
- [ ] Email notifications for uploads
- [ ] Financial forecasting
- [ ] Multi-currency support
- [ ] Mobile app
- [ ] SMS reminders for priests
- [ ] Integration with accounting software
# diocesan-finance-api
