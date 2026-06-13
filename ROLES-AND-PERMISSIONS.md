# Diocesan Finance API - Roles & Permissions Quick Reference

## Role Comparison Matrix

### ADMIN (Finance Officer)
**Full Access - Can do everything**

| Feature | Permission | GraphQL Example |
|---------|-----------|-----------------|
| Login | Email + Password | `login(email, password)` |
| Create Parishes | ✅ | `createParish(name, diocese, location)` |
| Manage Collections | ✅ | `createCollection(name, description)` |
| Upload Remittances | ✅ | `createRemittanceRecord(...)` |
| View Diocese Summary | ✅ | `dioceseFinancialSummary(year)` |
| View Debtors | ✅ | `debtors(year)` |
| Manage Users | ✅ | `registerUser(...)` |
| Generate Priest Tokens | ✅ | `generatePriestToken(priestUserId)` |
| Rotate Priest Tokens | ✅ | `rotatePriestToken(priestUserId)` |
| View All Parishes | ✅ | `parishes` |
| View Individual Parish | ✅ | `parishById(id)` |
| View Audit Logs | ✅ | `auditLogs` |

---

### BISHOP (Diocesan Oversight)
**Read-Only - Can view dashboards and parishes**

| Feature | Permission | GraphQL Example |
|---------|-----------|-----------------|
| Login | Email + Password | `login(email, password)` |
| Create Parishes | ❌ | - |
| Manage Collections | ❌ | - |
| Upload Remittances | ❌ | - |
| View Diocese Summary | ✅ | `dioceseFinancialSummary(year)` |
| View Debtors | ✅ | `debtors(year)` |
| Manage Users | ❌ | - |
| Generate Priest Tokens | ❌ | - |
| View All Parishes | ✅ | `parishes` |
| View Individual Parish | ✅ | `parishById(id)` |
| Export Reports | ✅ | (via remittance queries) |

---

### PRIEST (Parish Leader)
**Restricted - Can view own parish only**

| Feature | Permission | GraphQL Example |
|---------|-----------|-----------------|
| Login | Priest Token | `loginWithPriestToken(token)` |
| Create Parishes | ❌ | - |
| Manage Collections | ❌ | - |
| Upload Remittances | ❌ | - |
| View Diocese Summary | ❌ | - |
| View Debtors | ❌ | - |
| Manage Users | ❌ | - |
| View Own Parish | ✅ | `myParish` |
| View Own Parish Monthly | ✅ | `parishMonthlyRemittance(...)` |
| View Own Parish Yearly | ✅ | `parishYearlyRemittance(...)` |
| View Other Parishes | ❌ | - |

---

## Login Flows

### ADMIN Login (Email + Password)
```graphql
mutation {
  login(
    email: "admin@diocese.org"
    password: "securePassword123"
  ) {
    token       # Use in Authorization header
    refreshToken
    user {
      id
      email
      role
    }
  }
}
```

**Response:**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIs...",
  "user": {
    "id": "1",
    "email": "admin@diocese.org",
    "role": "ADMIN"
  }
}
```

**Then:** Set header `Authorization: Bearer <token>`

---

### BISHOP Login (Email + Password)
Same as ADMIN - use `login` mutation with email/password

```graphql
mutation {
  login(
    email: "bishop@diocese.org"
    password: "securePassword123"
  ) {
    token
    refreshToken
    user {
      id
      role  # Will be "BISHOP"
    }
  }
}
```

---

### PRIEST Login (Token Only)
```graphql
mutation {
  loginWithPriestToken(
    token: "a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6"
  ) {
    token       # JWT for API calls
    refreshToken
    user {
      id
      firstName
      lastName
      role      # Will be "PRIEST"
      parish {
        name
      }
    }
  }
}
```

**Response:**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIs...",
  "user": {
    "id": "5",
    "firstName": "Reverend",
    "lastName": "Obinna",
    "role": "PRIEST",
    "parish": {
      "name": "St. Joseph Parish"
    }
  }
}
```

**Then:** Set header `Authorization: Bearer <token>`

---

## Common Queries by Role

### ADMIN Queries

**View all parishes**
```graphql
query {
  parishes {
    id
    name
    diocese
    location
  }
}
```

**View all collections**
```graphql
query {
  collections {
    id
    name
    description
    isActive
    createdBy { firstName }
  }
}
```

**View diocese financial summary**
```graphql
query {
  dioceseFinancialSummary(year: 2024) {
    year
    totalRemittance
    parishTotals {
      parish { name }
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

**View all debtors**
```graphql
query {
  debtors(year: 2024) {
    parish { name }
    collection { name }
    year
    month
    monthName
    balance
    isPaid
  }
}
```

**View all users**
```graphql
query {
  users {
    id
    firstName
    lastName
    email
    role
    parish { name }
  }
}
```

---

### BISHOP Queries

**View all parishes (read-only)**
```graphql
query {
  parishes {
    id
    name
    diocese
    location
  }
}
```

**View specific parish details**
```graphql
query {
  parishById(id: 1) {
    id
    name
    diocese
    location
    remittanceRecords(year: 2024) {
      month
      monthName
      totalAmount
    }
  }
}
```

**View diocese financial summary**
```graphql
query {
  dioceseFinancialSummary(year: 2024) {
    totalRemittance
    parishTotals {
      parish { name }
      yearTotal
    }
  }
}
```

**View debtors summary**
```graphql
query {
  debtorsSummary(year: 2024) {
    parish { name }
    collection { name }
    totalBalance
    monthlyBreakdown {
      month
      monthName
      balance
    }
  }
}
```

---

### PRIEST Queries

**View my parish**
```graphql
query {
  myParish {
    id
    name
    diocese
    location
    contactEmail
  }
}
```

**View my parish monthly remittance (specific month)**
```graphql
query {
  parishMonthlyRemittance(parishId: 1, year: 2024, month: 3) {
    year
    month
    monthName
    totalAmount
    lineItems {
      collection { name }
      amount
    }
  }
}
```

**View my parish yearly remittance**
```graphql
query {
  parishYearlyRemittance(parishId: 1, year: 2024) {
    parish { name }
    year
    yearTotal
    monthlyTotals {
      month
      monthName
      amount
    }
  }
}
```

---

## Common Mutations by Role

### ADMIN Mutations

**Create a parish**
```graphql
mutation {
  createParish(
    name: "Holy Trinity Parish"
    diocese: "Lagos Diocese"
    location: "Lekki, Lagos"
    contactEmail: "holytrinity@parish.org"
    contactPhone: "+234 800 123 4567"
  ) {
    id
    name
  }
}
```

**Create a collection**
```graphql
mutation {
  createCollection(
    name: "Easter Offering"
    description: "Annual Easter collection"
  ) {
    id
    name
    createdAt
  }
}
```

**Register a priest**
```graphql
mutation {
  registerUser(
    firstName: "Reverend"
    lastName: "Chinedu"
    role: PRIEST
    parishId: 1
  ) {
    id
    firstName
    lastName
    role
  }
}
```

**Generate priest token**
```graphql
mutation {
  generatePriestToken(priestUserId: 5) {
    id
    priestToken      # Give this to the priest
    updatedAt
  }
}
```

**Rotate priest token (for reassignment)**
```graphql
mutation {
  rotatePriestToken(priestUserId: 5) {
    id
    priestToken      # New token for new priest
  }
}
```

**Upload remittance record**
```graphql
mutation {
  createRemittanceRecord(
    parishId: 1
    year: 2024
    month: 3
    lineItems: [
      { collectionId: 1, amount: 50000 }
      { collectionId: 2, amount: 25000 }
      { collectionId: 3, amount: 10000 }
    ]
    notes: "March 2024 collections for St. Joseph"
  ) {
    id
    totalAmount
    createdAt
  }
}
```

**Create debtor record**
```graphql
mutation {
  createDebtor(
    parishId: 2
    collectionId: 1
    year: 2024
    month: 3
    expectedAmount: 50000
    notes: "Missing March First Collection"
  ) {
    id
    balance
  }
}
```

**Record debtor payment**
```graphql
mutation {
  updateDebtor(
    id: 15
    actualAmount: 45000
    notes: "Partial payment received"
  ) {
    id
    balance
  }
}
```

**Mark debtor as paid**
```graphql
mutation {
  markDebtorAsPaid(id: 15) {
    id
    isPaid
    balance  # Will be 0
  }
}
```

---

## BISHOP Mutations

**None** - Bishops are read-only users

---

## PRIEST Mutations

**None** - Priests are read-only users

---

## Error Responses

### Unauthorized (Wrong Role)
```json
{
  "errors": [
    {
      "message": "Unauthorized: requires ADMIN"
    }
  ]
}
```

### Invalid Token
```json
{
  "errors": [
    {
      "message": "Invalid priest token"
    }
  ]
}
```

### Not Authenticated
```json
{
  "errors": [
    {
      "message": "Not authenticated"
    }
  ]
}
```

### Unauthorized Parish Access (Priest)
```json
{
  "errors": [
    {
      "message": "Unauthorized: cannot access other parishes"
    }
  ]
}
```

---

## Token Management Guide

### Generate Token (First Time Priest is Assigned)
```graphql
# 1. Register priest user
mutation {
  registerUser(
    firstName: "Father"
    lastName: "Emeka"
    role: PRIEST
    parishId: 1
  ) { id }  # Returns: 7
}

# 2. Generate token
mutation {
  generatePriestToken(priestUserId: 7) {
    priestToken  # Copy this: "a1b2c3d4..."
  }
}

# 3. Share token with priest (don't email!)
```

### Rotate Token (Priest Reassignment)
```graphql
# Old priest is transferred to another parish
# New priest assigned to same parish

mutation {
  rotatePriestToken(priestUserId: 7) {
    priestToken  # Old token: invalid, New token: valid
  }
}

# Give new token to new priest
```

### Revoke Token (Priest Leaves)
```graphql
# Priest is ordained/transferred/leaves

mutation {
  revokePriestToken(priestUserId: 7) {
    priestToken  # Will be NULL
  }
}

# Priest can no longer login
```

---

## Authorization Rules Summary

| Action | ADMIN | BISHOP | PRIEST |
|--------|-------|--------|---------|
| Create Parish | ✅ | ❌ | ❌ |
| Create Collection | ✅ | ❌ | ❌ |
| Upload Data | ✅ | ❌ | ❌ |
| View All Parishes | ✅ | ✅ | ❌ |
| View Own Parish | ✅ | ✅ | ✅ |
| View Diocese Summary | ✅ | ✅ | ❌ |
| Manage Users | ✅ | ❌ | ❌ |
| Generate Tokens | ✅ | ❌ | ❌ |
| View Debtors | ✅ | ✅ | ❌ |

---

## Quick Cheat Sheet

**For ADMIN:** Use email/password login, access everything
**For BISHOP:** Use email/password login, view-only dashboards
**For PRIEST:** Use priest token login, view own parish only

```bash
# Admin/Bishop
curl -X POST http://localhost:4000/graphql \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <jwt_token>" \
  -d '{"query": "query { dioceseFinancialSummary(year: 2024) { totalRemittance } }"}'

# Priest
curl -X POST http://localhost:4000/graphql \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <jwt_token>" \
  -d '{"query": "query { myParish { name } }"}'
```

---

## Troubleshooting

**"Unauthorized: requires ADMIN"**
→ You're trying to access an admin-only feature with a BISHOP or PRIEST account

**"Invalid priest token"**
→ Token is wrong or revoked. Ask admin for a new one.

**"Unauthorized: cannot access other parishes"**
→ You're a PRIEST trying to view another parish. You can only see your own.

**"Not authenticated"**
→ Missing Authorization header or invalid JWT token

---

For detailed documentation, see MODIFICATIONS-GUIDE.md
