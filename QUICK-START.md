# Diocesan Finance API - Quick Start Guide

## Project Structure

```
diocesan-finance-api/
├── src/
│   ├── server.js                 # Express + Apollo GraphQL setup
│   ├── graphql/
│   │   ├── typeDefs.js           # GraphQL schema
│   │   └── resolvers.js          # Query and mutation resolvers
│   ├── services/
│   │   └── spreadsheetParser.js  # Excel/CSV parsing logic
│   ├── db/
│   │   └── pool.js               # PostgreSQL connection pool
│   └── utils/
│       └── auditLog.js           # Audit logging
├── schema.sql                     # Database schema
├── package.json                   # Dependencies
├── docker-compose.yml             # Local dev environment
├── Dockerfile                     # Production container
├── .env.example                   # Environment variables template
├── README.md                      # Full documentation
└── AWS-DEPLOYMENT.md              # AWS deployment guide
```

## 5-Minute Setup

### Option 1: Using Docker Compose (Recommended for quick start)

```bash
# Clone repo
git clone <your-repo-url>
cd diocesan-finance-api

# Start everything
docker-compose up

# In another terminal, initialize the database
docker exec diocesan-finance-db psql -U postgres -d diocesan_finance -f /docker-entrypoint-initdb.d/schema.sql
```

**Access the API:**
- GraphQL Playground: http://localhost:4000/graphql
- Health Check: http://localhost:4000/health

### Option 2: Manual Setup (For more control)

#### 1. Install Dependencies
```bash
npm install
```

#### 2. Setup PostgreSQL
```bash
# macOS
brew install postgresql@15
brew services start postgresql@15

# Ubuntu
sudo apt-get install postgresql postgresql-contrib
sudo service postgresql start

# Create database
createdb diocesan_finance
psql diocesan_finance < schema.sql
```

#### 3. Setup Redis
```bash
# macOS
brew install redis
brew services start redis

# Ubuntu
sudo apt-get install redis-server
sudo service redis-server start
```

#### 4. Configure Environment
```bash
cp .env.example .env

# Edit .env and set:
# DB_USER=your_local_postgres_user
# DB_PASSWORD=your_password
# DB_HOST=localhost
# REDIS_HOST=localhost
```

#### 5. Start Server
```bash
npm run dev
```

## Testing the API

### 1. Open GraphQL Playground
Visit: http://localhost:4000/graphql

### 2. Create a User (Super Admin first)
```graphql
mutation {
  registerUser(
    email: "admin@diocese.org"
    password: "securePassword123"
    firstName: "John"
    lastName: "Doe"
    role: SUPER_ADMIN
  ) {
    id
    email
    role
  }
}
```

### 3. Login
```graphql
mutation {
  login(email: "admin@diocese.org", password: "securePassword123") {
    token
    user {
      id
      email
      role
    }
  }
}
```

Copy the token and add to Headers in GraphQL Playground:
```json
{
  "authorization": "Bearer YOUR_TOKEN_HERE"
}
```

### 4. Create a Parish
```graphql
mutation {
  createParish(
    name: "St. Joseph's Catholic Church"
    diocese: "Lagos Diocese"
    location: "Lagos, Nigeria"
    contactEmail: "st.joseph@diocese.org"
    contactPhone: "+234 800 123 4567"
  ) {
    id
    name
  }
}
```

### 5. Create a Financial Admin User
```graphql
mutation {
  registerUser(
    email: "finance@diocese.org"
    password: "securePassword123"
    firstName: "Mary"
    lastName: "Smith"
    role: ADMIN
  ) {
    id
    email
  }
}
```

### 6. Create a Remittance Record
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

### 7. Query Diocese Summary
```graphql
query {
  dioceseFinancialSummary(year: 2024) {
    year
    totalRemittance
    parishTotals {
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
}
```

## Upload Spreadsheet

### Sample Excel Format

Create an Excel file with sheets named after months (JAN, FEB, MAR, etc.):

**JAN Sheet:**
| Parish Name | First Collection | Second Collection | Tithe | Harvest | Special Offering | Donations |
|---|---|---|---|---|---|---|
| St. Joseph | 50000 | 25000 | 10000 | 5000 | 2000 | 1000 |
| St. Mary | 45000 | 20000 | 8000 | 4000 | 1500 | 800 |

### Upload via curl

```bash
curl -X POST http://localhost:4000/api/upload \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "file=@remittances_2024.xlsx" \
  -F "year=2024"
```

## Database Schema Overview

### Core Tables

**users**
- id, email, password_hash, role (ADMIN|PRIEST|SUPER_ADMIN), parish_id

**parishes**
- id, name, diocese, location, contact_email, contact_phone

**remittance_records**
- id, parish_id, year, month, uploaded_by, notes

**remittance_line_items**
- id, remittance_record_id, remittance_source_id, amount

**remittance_sources** (Pre-populated)
- First Collection, Second Collection, Tithe, Harvest, Special Offering, Donations, Other Income

**audit_logs**
- id, user_id, action, entity_type, entity_id, old_values, new_values, timestamp

## Common Tasks

### Add a New Parish
```graphql
mutation {
  createParish(
    name: "Parish Name"
    diocese: "Diocese Name"
    location: "Location"
    contactEmail: "email@parish.org"
    contactPhone: "+234..."
  ) {
    id
  }
}
```

### Query Parish Yearly Summary
```graphql
query {
  parishYearlyRemittance(parishId: 1, year: 2024) {
    parish { name }
    yearTotal
    monthlyTotals {
      month
      monthName
      amount
    }
  }
}
```

### Get All Users
```graphql
query {
  users {
    id
    email
    role
    parish { name }
  }
}
```

## Development Workflow

1. **Make code changes** in `src/`
2. **Test in GraphQL Playground** (http://localhost:4000/graphql)
3. **Check database** with psql:
   ```bash
   psql diocesan_finance
   SELECT * FROM parishes;
   ```
4. **Commit and push** to GitHub

## Environment Variables Explained

| Variable | Purpose | Example |
|----------|---------|---------|
| `DB_HOST` | PostgreSQL host | localhost |
| `DB_USER` | PostgreSQL username | postgres |
| `DB_PASSWORD` | PostgreSQL password | password123 |
| `DB_NAME` | Database name | diocesan_finance |
| `REDIS_HOST` | Redis server host | localhost |
| `JWT_SECRET` | JWT signing key | your-secret-key |
| `NODE_ENV` | Environment | development/production |

## Troubleshooting

### "Cannot connect to database"
```bash
# Check PostgreSQL is running
psql -U postgres -c "SELECT 1"

# Check database exists
psql -l | grep diocesan_finance
```

### "EADDRINUSE: address already in use :4000"
```bash
# Kill process on port 4000
lsof -ti:4000 | xargs kill -9
```

### GraphQL errors
1. Check browser console for errors
2. Look at server logs: `npm run dev` output
3. Verify JWT token is in headers

## Building for Production

### Create Production Build
```bash
npm install --production
```

### Build Docker Image
```bash
docker build -t diocesan-finance-api:v1.0.0 .
```

### Deploy to AWS
See [AWS-DEPLOYMENT.md](./AWS-DEPLOYMENT.md) for full instructions

## Key API Features

✅ **Authentication**: JWT with refresh tokens  
✅ **Authorization**: Role-based access control (Admin, Priest, Super Admin)  
✅ **File Upload**: Excel/CSV spreadsheet parsing  
✅ **Financial Calculations**: Monthly and yearly totals  
✅ **Audit Logging**: Track all user actions  
✅ **Performance**: Redis caching, optimized queries  
✅ **Security**: Bcrypt passwords, SQL injection protection  

## Next Steps

1. **Build Frontend**: React + Apollo Client (see src/frontend-starter.jsx)
2. **Deploy to AWS**: Follow AWS-DEPLOYMENT.md
3. **Setup CI/CD**: GitHub Actions for automated testing/deployment
4. **Add Tests**: Unit tests for resolvers and services
5. **Monitor**: CloudWatch logs and metrics

## File Upload Examples

### Download Sample Excel Template
```bash
# Create sample data
cat > sample-remittances.csv << 'EOF'
Parish Name,Month,First Collection,Second Collection,Tithe,Harvest
St. Joseph,JANUARY,50000,25000,10000,5000
St. Mary,JANUARY,45000,20000,8000,4000
St. Joseph,FEBRUARY,52000,26000,11000,5500
St. Mary,FEBRUARY,46000,21000,8500,4200
EOF
```

Then upload using the curl command above.

## Important Notes

- **Tokens expire in 1 hour** - Use refresh token to get new token
- **Password hashing** uses bcrypt with 10 salt rounds
- **Database backups** should be configured before production
- **Redis cache** automatically expires old data
- **Audit logs** track all financial transactions

## Support & Resources

- **GraphQL Docs**: Open Apollo Sandbox (http://localhost:4000/graphql)
- **Database**: psql connection to localhost:5432
- **Logs**: Check `npm run dev` output or ECS CloudWatch logs (production)
- **Issues**: Check GitHub issues or contact team

## Performance Tips

- Use `year` parameter in queries for filtering
- Avoid querying all parishes when you only need one
- Enable Redis caching for frequently accessed data
- Use pagination for large result sets (coming soon)

## Security Checklist

- [ ] Change JWT_SECRET and REFRESH_SECRET in production
- [ ] Use strong database password
- [ ] Enable HTTPS on load balancer
- [ ] Configure security groups to restrict access
- [ ] Enable RDS encryption
- [ ] Setup automated database backups
- [ ] Monitor CloudWatch logs for suspicious activity

---

**Ready to deploy?** Follow [AWS-DEPLOYMENT.md](./AWS-DEPLOYMENT.md) for production setup.

**Questions?** Check the full [README.md](./README.md) for comprehensive documentation.
