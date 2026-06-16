// src/graphql/typeDefs.js
import { gql } from 'apollo-server-express';

export const typeDefs = gql`
  enum UserRole {
    ADMIN
    BISHOP
    PRIEST
  }

  enum Month {
    JANUARY
    FEBRUARY
    MARCH
    APRIL
    MAY
    JUNE
    JULY
    AUGUST
    SEPTEMBER
    OCTOBER
    NOVEMBER
    DECEMBER
  }

  type User {
    id: ID!
    email: String
    firstName: String
    lastName: String
    role: UserRole!
    parish: Parish
    isActive: Boolean!
    priestToken: String
    tokenExpiresAt: String
    createdAt: String!
    updatedAt: String!
  }

  type Parish {
    id: ID!
    name: String!
    diocese: String
    location: String
    contactEmail: String
    contactPhone: String
    createdAt: String!
    updatedAt: String!
    remittanceRecords(year: Int!, month: Int): [RemittanceRecord!]!
    yearlyTotal(year: Int!): Decimal!
    monthlyTotal(year: Int!, month: Int!): Decimal
  }

  type Collection {
    id: ID!
    name: String!
    description: String
    createdBy: User!
    isActive: Boolean!
    createdAt: String!
    updatedAt: String!
  }

  type Debtor {
    id: ID!
    parish: Parish!
    collection: Collection!
    year: Int!
    month: Int!
    monthName: String!
    expectedAmount: Decimal!
    actualAmount: Decimal!
    balance: Decimal!
    isPaid: Boolean!
    notes: String
    createdAt: String!
    updatedAt: String!
  }

  type DebtorsSummary {
    parish: Parish!
    collection: Collection!
    year: Int!
    totalExpected: Decimal!
    totalActual: Decimal!
    totalBalance: Decimal!
    monthlyBreakdown: [MonthlyDebtorData!]!
  }

  type MonthlyDebtorData {
    month: Int!
    monthName: String!
    expectedAmount: Decimal!
    actualAmount: Decimal!
    balance: Decimal!
  }

  type RemittanceRecord {
    id: ID!
    parish: Parish!
    year: Int!
    month: Int!
    monthName: String!
    uploadedBy: User!
    lineItems: [RemittanceLineItem!]!
    totalAmount: Decimal!
    notes: String
    createdAt: String!
    updatedAt: String!
  }

  type RemittanceLineItem {
    id: ID!
    collection: Collection!
    amount: Decimal!
  }

  type MonthlyParishTotal {
    parish: Parish!
    month: Int!
    monthName: String!
    total: Decimal!
  }

  type YearlyParishSummary {
    parish: Parish!
    year: Int!
    monthlyTotals: [MonthlyTotal!]!
    yearTotal: Decimal!
  }

  type MonthlyTotal {
    month: Int!
    monthName: String!
    amount: Decimal!
  }

  type DioceseFinancialSummary {
    year: Int!
    totalRemittance: Decimal!
    parishTotals: [YearlyParishSummary!]!
    monthlyDioceseTotals: [MonthlyDioceseTotal!]!
  }

  type MonthlyDioceseTotal {
    month: Int!
    monthName: String!
    total: Decimal!
  }

  scalar Decimal

  type Query {
    # User queries
    me: User!
    users(role: UserRole): [User!]!
    userById(id: ID!): User

    # Parish queries
    parishes: [Parish!]!
    parishById(id: ID!): Parish
    myParish: Parish

    # Collection queries
    collections: [Collection!]!
    collectionById(id: ID!): Collection

    # Remittance queries
    remittanceRecord(id: ID!): RemittanceRecord
    parishMonthlyRemittance(parishId: ID!, year: Int!, month: Int!): RemittanceRecord
    parishYearlyRemittance(parishId: ID!, year: Int!): YearlyParishSummary

    # Debtors queries
    debtors(year: Int!, parishId: ID, collectionId: ID, month: Int): [Debtor!]!
    debtorsSummary(year: Int!, parishId: ID, collectionId: ID): [DebtorsSummary!]!
    debtorsByParishAndCollection(parishId: ID!, collectionId: ID!, year: Int!): DebtorsSummary

    # Dashboard queries
    dioceseFinancialSummary(year: Int!): DioceseFinancialSummary!
    parishMonthlyComparison(year: Int!, month: Int!): [MonthlyParishTotal!]!
    dioceseFinalDebtorsSummary(year: Int!): [DebtorsSummary!]!
  }

  type Mutation {
    # User mutations (ADMIN only)
    registerUser(
      email: String!
      password: String!
      firstName: String!
      lastName: String!
      role: UserRole!
      parishId: ID
    ): User!
    updateUser(id: ID!, firstName: String, lastName: String): User!
    deactivateUser(id: ID!): User!

    # Priest token mutations (ADMIN only)
    generatePriestToken(priestUserId: ID!, expiresIn: Int): User!
    rotatePriestToken(priestUserId: ID!, expiresIn: Int): User!
    revokePriestToken(priestUserId: ID!): User!

    # Authentication mutations
    login(email: String!, password: String!): AuthPayload!
    loginWithPriestToken(token: String!): AuthPayload!

    # Parish mutations (ADMIN only)
    createParish(
      name: String!
      diocese: String
      location: String
      contactEmail: String
      contactPhone: String
    ): Parish!
    updateParish(
      id: ID!
      name: String
      diocese: String
      location: String
      contactEmail: String
      contactPhone: String
    ): Parish!

    # Collection mutations (ADMIN only)
    createCollection(
      name: String!
      description: String
    ): Collection!
    updateCollection(
      id: ID!
      name: String
      description: String
      isActive: Boolean
    ): Collection!
    deleteCollection(id: ID!): Boolean!

    # Remittance mutations
    createRemittanceRecord(
      parishId: ID!
      year: Int!
      month: Int!
      lineItems: [LineItemInput!]!
      notes: String
    ): RemittanceRecord!
    updateRemittanceRecord(
      id: ID!
      lineItems: [LineItemInput!]
      notes: String
    ): RemittanceRecord!
    deleteRemittanceRecord(id: ID!): Boolean!

    # Debtors mutations
    createDebtor(
      parishId: ID!
      collectionId: ID!
      year: Int!
      month: Int!
      expectedAmount: Decimal!
      notes: String
    ): Debtor!
    updateDebtor(
      id: ID!
      actualAmount: Decimal
      notes: String
    ): Debtor!
    markDebtorAsPaid(id: ID!): Debtor!

    # Bulk upload
    uploadRemittanceSpreadsheet(
      parishId: ID!
      file: String!
    ): [RemittanceRecord!]!
  }

  input LineItemInput {
    collectionId: ID!
    amount: Decimal!
  }

  type AuthPayload {
    token: String!
    refreshToken: String!
    user: User!
  }

  type AuditLog {
    id: ID!
    user: User!
    action: String!
    entityType: String!
    entityId: ID
    timestamp: String!
  }
`;
