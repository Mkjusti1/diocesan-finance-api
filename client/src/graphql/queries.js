import { gql } from '@apollo/client/core';
export const LOGIN = gql`mutation Login($input: LoginInput!) { login(input: $input) { token user { id name email role parishId } } }`;
export const GET_DASHBOARD_STATS = gql`query DashboardStats($year: Int!) {
  dashboardStats(year: $year) {
    totalCollectedThisYear totalParishes parishesReportedThisMonth totalOutstanding
    recentActivity { id monthName totalAmount parish { name } }
  }
  monthlySummary(year: $year) { month monthName totalCollected parishCount }
  parishSummaries(year: $year) {
    parish { id name }
    totalCollected monthsReported lastReported outstandingBalance
  }
  remittanceSources { id name }
}`;
export const GET_PARISHES = gql`query GetParishes { parishes { id name diocese location contactEmail contactPhone } }`;
export const CREATE_PARISH = gql`mutation CreateParish($input: CreateParishInput!) { createParish(input: $input) { id name diocese location contactEmail contactPhone } }`;
export const UPDATE_PARISH = gql`mutation UpdateParish($id: ID!, $input: UpdateParishInput!) { updateParish(id: $id, input: $input) { id name diocese location contactEmail contactPhone } }`;
export const DELETE_PARISH = gql`mutation DeleteParish($id: ID!) { deleteParish(id: $id) }`;
export const GET_REMITTANCE_SOURCES = gql`query GetRemittanceSources { remittanceSources { id name description isActive } }`;
export const GET_REMITTANCE_RECORDS = gql`query GetRemittanceRecords($year: Int, $month: Int, $parishId: ID) {
  remittanceRecords(year: $year, month: $month, parishId: $parishId) { id year month monthName totalAmount parish { id name } lineItems { amount source { name } } uploadedBy { name } createdAt }
}`;
export const CREATE_REMITTANCE = gql`mutation CreateRemittance($input: CreateRemittanceInput!) { createRemittanceRecord(input: $input) { id year month monthName totalAmount parish { name } } }`;
export const GET_PARISH_SUMMARIES = gql`query ParishSummaries($year: Int!) { parishSummaries(year: $year) { parish { id name diocese } totalCollected monthsReported lastReported outstandingBalance } }`;
export const CREATE_USER = gql`mutation CreateUser($input: CreateUserInput!) { createUser(input: $input) { id name email role parishId priestToken } }`;
export const GET_DEBTORS = gql`query GetDebtors($year: Int, $overdueOnly: Boolean) { debtors(year: $year, overdueOnly: $overdueOnly) { id year month monthName expectedAmount actualAmount balance isPaid notes parish { id name } } }`;

export const REGENERATE_DEBTORS = gql`mutation RegenerateDebtors($year: Int) { regenerateDebtors(year: $year) { success years } }`;
