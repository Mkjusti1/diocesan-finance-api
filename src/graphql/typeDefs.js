// src/graphql/typeDefs.js
import { gql } from 'apollo-server-express';

export const typeDefs = gql`

  enum Role { ADMIN BISHOP PRIEST }

  type User {
    id: ID!
    name: String!
    email: String
    role: Role!
    parishId: ID
    parish: Parish
    priestToken: String
    createdAt: String!
  }

  type Parish {
    id: ID!
    name: String!
    diocese: String
    location: String
    contactEmail: String
    contactPhone: String
    createdAt: String!
  }

  type RemittanceSource {
    id: ID!
    name: String!
    description: String
    isActive: Boolean!
    createdAt: String!
  }

  type RemittanceLineItem {
    id: ID!
    remittanceSourceId: ID!
    source: RemittanceSource
    amount: Float!
  }

  type RemittanceRecord {
    id: ID!
    parish: Parish!
    year: Int!
    month: Int!
    monthName: String!
    totalAmount: Float!
    lineItems: [RemittanceLineItem!]!
    uploadedBy: User
    notes: String
    createdAt: String!
  }

  type Debtor {
    id: ID!
    parish: Parish!
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

  type MonthlySummary {
    month: Int!
    monthName: String!
    totalCollected: Float!
    parishCount: Int!
  }

  type ParishSummary {
    parish: Parish!
    totalCollected: Float!
    monthsReported: Int!
    lastReported: String
    outstandingBalance: Float!
  }

  type DashboardStats {
    totalCollectedThisYear: Float!
    totalParishes: Int!
    parishesReportedThisMonth: Int!
    totalOutstanding: Float!
    recentActivity: [RemittanceRecord!]!
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

  type Query {
    me: User
    parishes: [Parish!]!
    parish(id: ID!): Parish
    remittanceSources: [RemittanceSource!]!
    remittanceRecords(year: Int, month: Int, parishId: ID): [RemittanceRecord!]!
    remittanceRecord(id: ID!): RemittanceRecord
    myParishRemittances(year: Int): [RemittanceRecord!]!
    debtors(year: Int, overdueOnly: Boolean): [Debtor!]!
    parishDebtors(parishId: ID!, year: Int): [Debtor!]!
    dashboardStats(year: Int!): DashboardStats!
    monthlySummary(year: Int!): [MonthlySummary!]!
    parishSummaries(year: Int!): [ParishSummary!]!
    auditLogs(limit: Int): [AuditLog!]!
    allUsers: [User!]!
  }

  type Mutation {
    login(input: LoginInput!): AuthPayload!
    loginWithToken(token: String!): AuthPayload!
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
    markAsOverdue(parishId: ID!, year: Int!, month: Int!): Debtor!
    adminResetPassword(userId: ID!, newPassword: String!): Boolean!
  }
`;
