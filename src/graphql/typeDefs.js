// src/graphql/typeDefs.js
import { gql } from 'apollo-server-express';

export const typeDefs = gql`

  enum Role { ADMIN BISHOP }

  type User {
    id: ID!
    name: String!
    email: String
    role: Role!
    parishId: ID
    parish: Parish
    createdYear: Int\n  createdAt: String!
  }

  type Parish {
    id: ID!
    name: String!
    diocese: String
    location: String
    contactEmail: String
    contactPhone: String
    createdYear: Int\n  createdAt: String!
  }

  type RemittanceSource {
    id: ID!
    name: String!
    description: String
    isActive: Boolean!
    createdYear: Int\n  createdAt: String!
    category: String!
  }

  type RemittanceLineItem {
    id: ID!
    remittanceSourceId: ID!
    source: RemittanceSource
    amount: Float!
  }

  type RemittanceRecord {
    id: ID!
    parish: Parish
    year: Int!
    month: Int!
    monthName: String!
    totalAmount: Float!
    lineItems: [RemittanceLineItem!]!
    uploadedBy: User
    notes: String
    createdYear: Int\n  createdAt: String!
  }

  type Debtor {
    id: ID!
    parish: Parish
    collection: RemittanceSource
    year: Int!
    month: Int!
    monthName: String!
    expectedAmount: Float!
    actualAmount: Float!
    balance: Float!
    isPaid: Boolean!
    notes: String
    updatedAt: String!
  }

  type AuditLog {
    id: ID!
    user: User
    action: String!
    entityType: String!
    entityId: ID!
    oldValues: String
    newValues: String
    timestamp: String!
  }

  type AuthPayload {
    token: String!
    user: User!
  }

  type RegenerateDebtorsPayload {
    success: Boolean!
    years: [Int!]!
  }

  type MonthlySummary {
    month: Int!
    monthName: String!
    totalCollected: Float!
    parishCount: Int!
  }

  type ParishSummary {
    parish: Parish
    totalCollected: Float!
    monthsReported: Int!
    lastReported: String
    outstandingBalance: Float!
  }

  type CollectionSummary {
    collection: RemittanceSource!
    totalCollected: Float!
  }

  type DashboardStats {
    totalCollectedThisYear: Float!
    totalParishes: Int!
    parishesReportedThisMonth: Int!
    totalOutstanding: Float!
    recentActivity: [RemittanceRecord!]!
    collectionSummaries: [CollectionSummary!]!
  }

  input LoginInput {
    email: String!
    password: String!
  }

  input CreateUserInput {
    name: String!
    email: String
    password: String
    role: Role!
    parishId: ID
  }

  input CreateParishInput {
    name: String!
    diocese: String
    location: String
    contactEmail: String
    contactPhone: String
  }

  input UpdateParishInput {
    name: String
    diocese: String
    location: String
    contactEmail: String
    contactPhone: String
  }

  input CreateRemittanceSourceInput {
    name: String!
    description: String
  }

  input RemittanceLineItemInput {
    remittanceSourceId: ID!
    amount: Float!
  }

  input CreateRemittanceInput {
    parishId: ID!
    year: Int!
    month: Int!
    lineItems: [RemittanceLineItemInput!]!
    notes: String
  }

  input UpdateDebtorInput {
    expectedAmount: Float
    actualAmount: Float
    isPaid: Boolean
    notes: String
  }

  input RecordPaymentInput {
    parishId: ID!
    collectionId: ID!
    year: Int!
    month: Int!
    amount: Float!
  }

  type BulkDeleteResult {
 success: Boolean!
 deletedCount: Int!
 message: String!
 }


input BulkRecordEntryInput {
  parishId: ID!
  amount: Float!
}

input BulkRecordRemittancesInput {
  year: Int!
  month: Int!
  collectionCategory: String!
  entries: [BulkRecordEntryInput!]!
}

type BulkRecordResult {
  success: Boolean!
  createdCount: Int!
  updatedCount: Int!
  collectionName: String!
  message: String!
}

 type Query {
    me: User
    parishes: [Parish!]!
    parish(id: ID!): Parish
    remittanceSources: [RemittanceSource!]!
    remittanceRecords(year: Int, month: Int, parishId: ID): [RemittanceRecord!]!
    remittanceRecord(id: ID!): RemittanceRecord
    debtors(year: Int, month: Int, overdueOnly: Boolean): [Debtor!]!
    parishDebtors(parishId: ID!, year: Int): [Debtor!]!
    dashboardStats(year: Int!): DashboardStats!
    monthlySummary(year: Int!): [MonthlySummary!]!
    parishSummaries(year: Int!): [ParishSummary!]!
    auditLogs(limit: Int): [AuditLog!]!
    allUsers: [User!]!
  }

  type Mutation {
    login(input: LoginInput!): AuthPayload!
    regenerateDebtors(year: Int): RegenerateDebtorsPayload!
    changePassword(currentPassword: String!, newPassword: String!): Boolean!
    createUser(input: CreateUserInput!): User!
    deleteUser(id: ID!): Boolean!
    createParish(input: CreateParishInput!): Parish!
    updateParish(id: ID!, input: UpdateParishInput!): Parish!
    deleteParish(id: ID!): Boolean!
    createRemittanceSource(input: CreateRemittanceSourceInput!): RemittanceSource!
    toggleRemittanceSource(id: ID!): RemittanceSource!
    createRemittanceRecord(input: CreateRemittanceInput!): RemittanceRecord!
    deleteRemittanceRecord(id: ID!): Boolean!
    updateDebtor(id: ID!, input: UpdateDebtorInput!): Debtor!
    recordPayment(input: RecordPaymentInput!): Debtor!
    markAsOverdue(parishId: ID!, year: Int!, month: Int!): Debtor!
    adminResetPassword(userId: ID!, newPassword: String!): Boolean!
 bulkRecordRemittances(input: BulkRecordRemittancesInput!): BulkRecordResult!
 deleteRemittanceRecordsByCollectionAndYear(collectionName: String!, year: Int!): BulkDeleteResult!
  }
`;
