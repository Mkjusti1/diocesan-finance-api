// src/graphql/resolvers.js
// Updated resolvers with three-role architecture, priest tokens, collections CRUD, and debtors dashboard
import jwt from 'jsonwebtoken';
import bcryptjs from 'bcryptjs';
import crypto from 'crypto';
import { pool } from '../db/pool.js';
import { logAuditEvent } from '../utils/auditLog.js';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';
const REFRESH_SECRET = process.env.REFRESH_SECRET || 'your-refresh-secret';

// Helper: Get current user from context
const getCurrentUser = (context) => {
  if (!context.user) {
    throw new Error('Not authenticated');
  }
  return context.user;
};

// Helper: Check authorization
const requireRole = (user, allowedRoles) => {
  if (!allowedRoles.includes(user.role)) {
    throw new Error(`Unauthorized: requires ${allowedRoles.join(' or ')}`);
  }
};

// Helper: Month number to name
const monthNames = [
  '', 'JANUARY', 'FEBRUARY', 'MARCH', 'APRIL', 'MAY', 'JUNE',
  'JULY', 'AUGUST', 'SEPTEMBER', 'OCTOBER', 'NOVEMBER', 'DECEMBER'
];
const monthToName = (month) => monthNames[month];

// Helper: Generate secure priest token
const generatePriestTokenString = () => {
  return crypto.randomBytes(32).toString('hex');
};

export const resolvers = {

  Query: {
    // ============================================
    // AUTHENTICATION QUERIES
    // ============================================
    me: async (_, __, context) => {
      const user = getCurrentUser(context);
      const result = await pool.query('SELECT * FROM users WHERE id = $1', [user.id]);
      return result.rows[0];
    },

    // Get all users (ADMIN only)
    users: async (_, { role }, context) => {
      const user = getCurrentUser(context);
      requireRole(user, ['ADMIN']);

      let query = 'SELECT * FROM users';
      const params = [];

      if (role) {
        query += ' WHERE role = $1';
        params.push(role);
      }

      const result = await pool.query(query, params);
      return result.rows;
    },

    // Get user by ID (ADMIN only)
    userById: async (_, { id }, context) => {
      const user = getCurrentUser(context);
      requireRole(user, ['ADMIN']);

      const result = await pool.query('SELECT * FROM users WHERE id = $1', [id]);
      return result.rows[0] || null;
    },

    // ============================================
    // PARISH QUERIES
    // ============================================

    // Get current user's parish (for priests and bishops)
    myParish: async (_, __, context) => {
      const user = getCurrentUser(context);
      if (!user.parish_id) {
        throw new Error('No parish assigned to this user');
      }

      const result = await pool.query('SELECT * FROM parishes WHERE id = $1', [user.parish_id]);
      return result.rows[0];
    },

    // Get all parishes
    parishes: async (_, __, context) => {
      const user = getCurrentUser(context);

      // Priests can only see their own parish
      if (user.role === 'PRIEST') {
        const result = await pool.query('SELECT * FROM parishes WHERE id = $1', [user.parish_id]);
        return result.rows;
      }

      // Admins and Bishops can see all parishes
      const result = await pool.query('SELECT * FROM parishes ORDER BY name');
      return result.rows;
    },

    // Get parish by ID
    parishById: async (_, { id }, context) => {
      const user = getCurrentUser(context);

      // Priests can only access their own parish
      if (user.role === 'PRIEST' && user.parish_id !== parseInt(id)) {
        throw new Error('Unauthorized: cannot access other parishes');
      }

      const result = await pool.query('SELECT * FROM parishes WHERE id = $1', [id]);
      return result.rows[0] || null;
    },

    // ============================================
    // COLLECTION QUERIES
    // ============================================

    // Get all collections
    collections: async (_, __, context) => {
      const user = getCurrentUser(context);
      // All authenticated users can view collections
      const result = await pool.query(
        'SELECT * FROM collections WHERE is_active = true ORDER BY name'
      );
      return result.rows;
    },

    // Get collection by ID
    collectionById: async (_, { id }, context) => {
      const user = getCurrentUser(context);
      const result = await pool.query('SELECT * FROM collections WHERE id = $1', [id]);
      return result.rows[0] || null;
    },

    // ============================================
    // REMITTANCE QUERIES
    // ============================================

    // Get remittance for specific month
    parishMonthlyRemittance: async (_, { parishId, year, month }, context) => {
      const user = getCurrentUser(context);

      if (user.role === 'PRIEST' && user.parish_id !== parseInt(parishId)) {
        throw new Error('Unauthorized');
      }

      const result = await pool.query(
        'SELECT * FROM remittance_records WHERE parish_id = $1 AND year = $2 AND month = $3',
        [parishId, year, month]
      );
      return result.rows[0] || null;
    },

    // Get yearly remittance summary
    parishYearlyRemittance: async (_, { parishId, year }, context) => {
      const user = getCurrentUser(context);

      if (user.role === 'PRIEST' && user.parish_id !== parseInt(parishId)) {
        throw new Error('Unauthorized');
      }

      const parishResult = await pool.query('SELECT * FROM parishes WHERE id = $1', [parishId]);
      const parish = parishResult.rows[0];

      const monthlyResult = await pool.query(`
        SELECT 
          rr.month,
          COALESCE(SUM(rli.amount), 0) as total
        FROM remittance_records rr
        LEFT JOIN remittance_line_items rli ON rr.id = rli.remittance_record_id
        WHERE rr.parish_id = $1 AND rr.year = $2
        GROUP BY rr.month
        ORDER BY rr.month
      `, [parishId, year]);

      const monthlyTotals = monthlyResult.rows.map(row => ({
        month: row.month,
        monthName: monthToName(row.month),
        amount: row.total
      }));

      const yearTotal = monthlyTotals.reduce((sum, m) => sum + parseFloat(m.amount), 0);

      return { parish, year, monthlyTotals, yearTotal };
    },

    // ============================================
    // DEBTORS QUERIES
    // ============================================

    // Get debtors (those missing remittance data)
    debtors: async (_, { year, parishId, collectionId, month }, context) => {
      const user = getCurrentUser(context);
      requireRole(user, ['ADMIN', 'BISHOP']);

      let query = `
        SELECT d.*, p.name as parish_name, c.name as collection_name
        FROM debtors d
        JOIN parishes p ON d.parish_id = p.id
        JOIN collections c ON d.collection_id = c.id
        WHERE d.year = $1
      `;
      const params = [year];
      let paramIndex = 2;

      if (parishId) {
        query += ` AND d.parish_id = $${paramIndex}`;
        params.push(parishId);
        paramIndex++;
      }

      if (collectionId) {
        query += ` AND d.collection_id = $${paramIndex}`;
        params.push(collectionId);
        paramIndex++;
      }

      if (month) {
        query += ` AND d.month = $${paramIndex}`;
        params.push(month);
        paramIndex++;
      }

      query += ' ORDER BY p.name, c.name, d.month';

      const result = await pool.query(query, params);
      return result.rows;
    },

    // Get debtors summary (aggregated by parish and collection)
    debtorsSummary: async (_, { year, parishId, collectionId }, context) => {
      const user = getCurrentUser(context);
      requireRole(user, ['ADMIN', 'BISHOP']);

      let query = `
        SELECT 
          d.parish_id,
          d.collection_id,
          d.year,
          SUM(COALESCE(d.expected_amount, 0)) as total_expected,
          SUM(COALESCE(d.actual_amount, 0)) as total_actual,
          SUM(COALESCE(d.balance, 0)) as total_balance
        FROM debtors d
        WHERE d.year = $1
      `;
      const params = [year];
      let paramIndex = 2;

      if (parishId) {
        query += ` AND d.parish_id = $${paramIndex}`;
        params.push(parishId);
        paramIndex++;
      }

      if (collectionId) {
        query += ` AND d.collection_id = $${paramIndex}`;
        params.push(collectionId);
        paramIndex++;
      }

      query += ' GROUP BY d.parish_id, d.collection_id, d.year ORDER BY d.parish_id, d.collection_id';

      const result = await pool.query(query, params);

      // Build detailed summaries with monthly breakdown
      const summaries = [];
      for (const row of result.rows) {
        const parishResult = await pool.query('SELECT * FROM parishes WHERE id = $1', [row.parish_id]);
        const collectionResult = await pool.query('SELECT * FROM collections WHERE id = $1', [row.collection_id]);

        const monthlyResult = await pool.query(
          `SELECT month, expected_amount, actual_amount, balance FROM debtors 
           WHERE parish_id = $1 AND collection_id = $2 AND year = $3
           ORDER BY month`,
          [row.parish_id, row.collection_id, row.year]
        );

        const monthlyBreakdown = monthlyResult.rows.map(m => ({
          month: m.month,
          monthName: monthToName(m.month),
          expectedAmount: m.expected_amount,
          actualAmount: m.actual_amount,
          balance: m.balance
        }));

        summaries.push({
          parish: parishResult.rows[0],
          collection: collectionResult.rows[0],
          year: row.year,
          totalExpected: row.total_expected,
          totalActual: row.total_actual,
          totalBalance: row.total_balance,
          monthlyBreakdown
        });
      }

      return summaries;
    },

    // Get debtors for specific parish and collection
    debtorsByParishAndCollection: async (_, { parishId, collectionId, year }, context) => {
      const user = getCurrentUser(context);
      requireRole(user, ['ADMIN', 'BISHOP']);

      const results = await resolvers.Query.debtorsSummary(
        _, 
        { year, parishId, collectionId }, 
        context
      );

      return results[0] || null;
    },

    // Diocese financial summary
    dioceseFinancialSummary: async (_, { year }, context) => {
      const user = getCurrentUser(context);
      // Admins and Bishops can view summary (not priests)
      if (user.role === 'PRIEST') {
        throw new Error('Priests cannot view diocese-wide summaries');
      }

      const parishesResult = await pool.query('SELECT id FROM parishes ORDER BY name');

      const parishTotals = await Promise.all(
        parishesResult.rows.map(async (parish) => {
          const monthlyResult = await pool.query(`
            SELECT 
              rr.month,
              COALESCE(SUM(rli.amount), 0) as total
            FROM remittance_records rr
            LEFT JOIN remittance_line_items rli ON rr.id = rli.remittance_record_id
            WHERE rr.parish_id = $1 AND rr.year = $2
            GROUP BY rr.month
            ORDER BY rr.month
          `, [parish.id, year]);

          const monthlyTotals = monthlyResult.rows.map(row => ({
            month: row.month,
            monthName: monthToName(row.month),
            amount: row.total
          }));

          const yearTotal = monthlyTotals.reduce((sum, m) => sum + parseFloat(m.amount), 0);

          const parishData = await pool.query('SELECT * FROM parishes WHERE id = $1', [parish.id]);

          return {
            parish: parishData.rows[0],
            year,
            monthlyTotals,
            yearTotal
          };
        })
      );

      const dioceseMonthlyResult = await pool.query(`
        SELECT 
          rr.month,
          COALESCE(SUM(rli.amount), 0) as total
        FROM remittance_records rr
        LEFT JOIN remittance_line_items rli ON rr.id = rli.remittance_record_id
        WHERE rr.year = $1
        GROUP BY rr.month
        ORDER BY rr.month
      `, [year]);

      const monthlyDioceseTotals = dioceseMonthlyResult.rows.map(row => ({
        month: row.month,
        monthName: monthToName(row.month),
        total: row.total
      }));

      const totalRemittance = monthlyDioceseTotals.reduce((sum, m) => sum + parseFloat(m.total), 0);

      return { year, totalRemittance, parishTotals, monthlyDioceseTotals };
    },

    // Diocese final debtors summary
    dioceseFinalDebtorsSummary: async (_, { year }, context) => {
      const user = getCurrentUser(context);
      requireRole(user, ['ADMIN', 'BISHOP']);

      const results = await resolvers.Query.debtorsSummary(_, { year }, context);
      return results;
    }
  },

  Mutation: {
    // ============================================
    // AUTHENTICATION MUTATIONS
    // ============================================

    // Login with email/password (ADMIN or BISHOP)
    login: async (_, { email, password }) => {
      const result = await pool.query(
        'SELECT * FROM users WHERE email = $1 AND is_active = true AND role IN ($2, $3)',
        [email, 'ADMIN', 'BISHOP']
      );

      const user = result.rows[0];
      if (!user) {
        throw new Error('Invalid credentials');
      }

      const isValid = await bcrypt.compare(password, user.password_hash);
      if (!isValid) {
        throw new Error('Invalid credentials');
      }

      const token = jwt.sign(
        { id: user.id, email: user.email, role: user.role },
        JWT_SECRET,
        { expiresIn: '1h' }
      );

      const refreshToken = jwt.sign(
        { id: user.id },
        REFRESH_SECRET,
        { expiresIn: '7d' }
      );

      return { token, refreshToken, user };
    },

    // Login with priest token (PRIEST only)
    loginWithPriestToken: async (_, { token }) => {
      const result = await pool.query(
        'SELECT * FROM users WHERE priest_token = $1 AND is_active = true AND role = $2',
        [token, 'PRIEST']
      );

      const user = result.rows[0];
      if (!user) {
        throw new Error('Invalid priest token');
      }

      const jwtToken = jwt.sign(
        { id: user.id, role: user.role, parish_id: user.parish_id },
        JWT_SECRET,
        { expiresIn: '24h' }
      );

      const refreshToken = jwt.sign(
        { id: user.id },
        REFRESH_SECRET,
        { expiresIn: '30d' }
      );

      return { token: jwtToken, refreshToken, user };
    },

    // ============================================
    // USER MANAGEMENT MUTATIONS
    // ============================================

    // Register user (ADMIN only)
    registerUser: async (_, { email, password, firstName, lastName, role, parishId }, context) => {
      const user = getCurrentUser(context);
      requireRole(user, ['ADMIN']);

      // Priests don't need email/password
      let passwordHash = null;
      if (role !== 'PRIEST') {
        if (!email || !password) {
          throw new Error('Email and password required for non-priest users');
        }
        passwordHash = await bcrypt.hash(password, 10);
      }

      const result = await pool.query(
        `INSERT INTO users (email, password_hash, first_name, last_name, role, parish_id)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING *`,
        [email || null, passwordHash, firstName, lastName, role, parishId || null]
      );

      const newUser = result.rows[0];
      await logAuditEvent(user.id, 'CREATE_USER', 'users', newUser.id, null, newUser);

      return newUser;
    },

    // ============================================
    // PRIEST TOKEN MUTATIONS
    // ============================================

    // Generate priest token (ADMIN only)
    generatePriestToken: async (_, { priestUserId, expiresIn }, context) => {
      const user = getCurrentUser(context);
      requireRole(user, ['ADMIN']);

      const priestResult = await pool.query('SELECT * FROM users WHERE id = $1', [priestUserId]);
      const priest = priestResult.rows[0];

      if (!priest) {
        throw new Error('Priest user not found');
      }

      if (priest.role !== 'PRIEST') {
        throw new Error('Can only generate tokens for PRIEST users');
      }

      const token = generatePriestTokenString();
      const tokenExpiresAt = expiresIn ? new Date(Date.now() + expiresIn * 1000) : null;

      const updateResult = await pool.query(
        `UPDATE users 
         SET priest_token = $1, token_expires_at = $2, updated_at = CURRENT_TIMESTAMP
         WHERE id = $3
         RETURNING *`,
        [token, tokenExpiresAt, priestUserId]
      );

      await logAuditEvent(
        user.id,
        'GENERATE_PRIEST_TOKEN',
        'users',
        priestUserId,
        { priest_token: null },
        { priest_token: '***hidden***' }
      );

      return updateResult.rows[0];
    },

    // Rotate priest token (ADMIN only)
    rotatePriestToken: async (_, { priestUserId, expiresIn }, context) => {
      const user = getCurrentUser(context);
      requireRole(user, ['ADMIN']);

      const priestResult = await pool.query('SELECT * FROM users WHERE id = $1', [priestUserId]);
      const priest = priestResult.rows[0];

      if (!priest || priest.role !== 'PRIEST') {
        throw new Error('Invalid priest user');
      }

      const newToken = generatePriestTokenString();
      const tokenExpiresAt = expiresIn ? new Date(Date.now() + expiresIn * 1000) : null;

      const updateResult = await pool.query(
        `UPDATE users 
         SET priest_token = $1, token_expires_at = $2, updated_at = CURRENT_TIMESTAMP
         WHERE id = $3
         RETURNING *`,
        [newToken, tokenExpiresAt, priestUserId]
      );

      await logAuditEvent(
        user.id,
        'ROTATE_PRIEST_TOKEN',
        'users',
        priestUserId,
        { priest_token: '***old***' },
        { priest_token: '***new***' }
      );

      return updateResult.rows[0];
    },

    // Revoke priest token (ADMIN only)
    revokePriestToken: async (_, { priestUserId }, context) => {
      const user = getCurrentUser(context);
      requireRole(user, ['ADMIN']);

      const result = await pool.query(
        `UPDATE users 
         SET priest_token = NULL, token_expires_at = NULL, updated_at = CURRENT_TIMESTAMP
         WHERE id = $1 AND role = $2
         RETURNING *`,
        [priestUserId, 'PRIEST']
      );

      if (result.rows.length === 0) {
        throw new Error('Priest user not found');
      }

      await logAuditEvent(
        user.id,
        'REVOKE_PRIEST_TOKEN',
        'users',
        priestUserId,
        { priest_token: '***revoked***' },
        { priest_token: null }
      );

      return result.rows[0];
    },

    // ============================================
    // PARISH MUTATIONS
    // ============================================

    // Create parish (ADMIN only)
    createParish: async (_, { name, diocese, location, contactEmail, contactPhone }, context) => {
      const user = getCurrentUser(context);
      requireRole(user, ['ADMIN']);

      const result = await pool.query(
        `INSERT INTO parishes (name, diocese, location, contact_email, contact_phone)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING *`,
        [name, diocese, location, contactEmail, contactPhone]
      );

      const parish = result.rows[0];
      await logAuditEvent(user.id, 'CREATE_PARISH', 'parishes', parish.id, null, parish);

      return parish;
    },

    // Update parish (ADMIN only)
    updateParish: async (_, { id, name, diocese, location, contactEmail, contactPhone }, context) => {
      const user = getCurrentUser(context);
      requireRole(user, ['ADMIN']);

      const result = await pool.query(
        `UPDATE parishes 
         SET name = COALESCE($1, name),
             diocese = COALESCE($2, diocese),
             location = COALESCE($3, location),
             contact_email = COALESCE($4, contact_email),
             contact_phone = COALESCE($5, contact_phone),
             updated_at = CURRENT_TIMESTAMP
         WHERE id = $6
         RETURNING *`,
        [name, diocese, location, contactEmail, contactPhone, id]
      );

      if (result.rows.length === 0) {
        throw new Error('Parish not found');
      }

      await logAuditEvent(user.id, 'UPDATE_PARISH', 'parishes', id, null, result.rows[0]);

      return result.rows[0];
    },

    // ============================================
    // COLLECTION MUTATIONS
    // ============================================

    // Create collection (ADMIN only)
    createCollection: async (_, { name, description }, context) => {
      const user = getCurrentUser(context);
      requireRole(user, ['ADMIN']);

      const result = await pool.query(
        `INSERT INTO collections (name, description, created_by, is_active)
         VALUES ($1, $2, $3, true)
         RETURNING *`,
        [name, description, user.id]
      );

      const collection = result.rows[0];
      await logAuditEvent(user.id, 'CREATE_COLLECTION', 'collections', collection.id, null, collection);

      return collection;
    },

    // Update collection (ADMIN only)
    updateCollection: async (_, { id, name, description, isActive }, context) => {
      const user = getCurrentUser(context);
      requireRole(user, ['ADMIN']);

      const result = await pool.query(
        `UPDATE collections 
         SET name = COALESCE($1, name),
             description = COALESCE($2, description),
             is_active = COALESCE($3, is_active),
             updated_at = CURRENT_TIMESTAMP
         WHERE id = $4
         RETURNING *`,
        [name, description, isActive, id]
      );

      if (result.rows.length === 0) {
        throw new Error('Collection not found');
      }

      await logAuditEvent(user.id, 'UPDATE_COLLECTION', 'collections', id, null, result.rows[0]);

      return result.rows[0];
    },

    // Delete collection (ADMIN only - soft delete)
    deleteCollection: async (_, { id }, context) => {
      const user = getCurrentUser(context);
      requireRole(user, ['ADMIN']);

      const result = await pool.query(
        'UPDATE collections SET is_active = false, updated_at = CURRENT_TIMESTAMP WHERE id = $1',
        [id]
      );

      await logAuditEvent(user.id, 'DELETE_COLLECTION', 'collections', id, null, { is_active: false });

      return result.rowCount > 0;
    },

    // ============================================
    // REMITTANCE MUTATIONS
    // ============================================

    // Create remittance record (ADMIN only)
    createRemittanceRecord: async (_, { parishId, year, month, lineItems, notes }, context) => {
      const user = getCurrentUser(context);
      requireRole(user, ['ADMIN']);

      const client = await pool.connect();
      try {
        await client.query('BEGIN');

        const recordResult = await client.query(
          `INSERT INTO remittance_records (parish_id, year, month, uploaded_by, notes)
           VALUES ($1, $2, $3, $4, $5)
           RETURNING *`,
          [parishId, year, month, user.id, notes || null]
        );

        const record = recordResult.rows[0];

        for (const item of lineItems) {
          await client.query(
            `INSERT INTO remittance_line_items (remittance_record_id, collection_id, amount)
             VALUES ($1, $2, $3)`,
            [record.id, item.collectionId, item.amount]
          );
        }

        await logAuditEvent(user.id, 'CREATE_REMITTANCE', 'remittance_records', record.id, null, record);
        await client.query('COMMIT');

        return record;
      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      } finally {
        client.release();
      }
    },

    // ============================================
    // DEBTOR MUTATIONS
    // ============================================

    // Create debtor record (ADMIN only)
    createDebtor: async (_, { parishId, collectionId, year, month, expectedAmount, notes }, context) => {
      const user = getCurrentUser(context);
      requireRole(user, ['ADMIN']);

      const result = await pool.query(
        `INSERT INTO debtors (parish_id, collection_id, year, month, expected_amount, balance, notes)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         RETURNING *`,
        [parishId, collectionId, year, month, expectedAmount, expectedAmount, notes]
      );

      const debtor = result.rows[0];
      await logAuditEvent(user.id, 'CREATE_DEBTOR', 'debtors', debtor.id, null, debtor);

      return debtor;
    },

    // Update debtor record (ADMIN only)
    updateDebtor: async (_, { id, actualAmount, notes }, context) => {
      const user = getCurrentUser(context);
      requireRole(user, ['ADMIN']);

      const currentResult = await pool.query('SELECT * FROM debtors WHERE id = $1', [id]);
      const current = currentResult.rows[0];

      if (!current) {
        throw new Error('Debtor record not found');
      }

      const newBalance = current.expected_amount - (actualAmount || current.actual_amount);

      const result = await pool.query(
        `UPDATE debtors 
         SET actual_amount = COALESCE($1, actual_amount),
             balance = $2,
             notes = COALESCE($3, notes),
             updated_at = CURRENT_TIMESTAMP
         WHERE id = $4
         RETURNING *`,
        [actualAmount, newBalance, notes, id]
      );

      await logAuditEvent(user.id, 'UPDATE_DEBTOR', 'debtors', id, current, result.rows[0]);

      return result.rows[0];
    },

    // Mark debtor as paid (ADMIN only)
    markDebtorAsPaid: async (_, { id }, context) => {
      const user = getCurrentUser(context);
      requireRole(user, ['ADMIN']);

      const result = await pool.query(
        `UPDATE debtors 
         SET is_paid = true, balance = 0, updated_at = CURRENT_TIMESTAMP
         WHERE id = $1
         RETURNING *`,
        [id]
      );

      if (result.rows.length === 0) {
        throw new Error('Debtor record not found');
      }

      await logAuditEvent(user.id, 'MARK_DEBTOR_PAID', 'debtors', id, null, { is_paid: true });

      return result.rows[0];
    }
  },

  // ============================================
  // FIELD RESOLVERS
  // ============================================

  Parish: {
    remittanceRecords: async (parish, { year, month }) => {
      let query = 'SELECT * FROM remittance_records WHERE parish_id = $1';
      const params = [parish.id];

      if (year) {
        query += ' AND year = $' + (params.length + 1);
        params.push(year);
      }

      if (month) {
        query += ' AND month = $' + (params.length + 1);
        params.push(month);
      }

      const result = await pool.query(query, params);
      return result.rows;
    },

    yearlyTotal: async (parish, { year }) => {
      const result = await pool.query(`
        SELECT COALESCE(SUM(rli.amount), 0) as total
        FROM remittance_records rr
        LEFT JOIN remittance_line_items rli ON rr.id = rli.remittance_record_id
        WHERE rr.parish_id = $1 AND rr.year = $2
      `, [parish.id, year]);

      return result.rows[0].total;
    }
  },

  RemittanceRecord: {
    uploadedBy: async (record) => {
      const result = await pool.query('SELECT * FROM users WHERE id = $1', [record.uploaded_by]);
      return result.rows[0];
    },

    lineItems: async (record) => {
      const result = await pool.query(`
        SELECT rli.*, c.name, c.description
        FROM remittance_line_items rli
        JOIN collections c ON rli.collection_id = c.id
        WHERE rli.remittance_record_id = $1
      `, [record.id]);

      return result.rows.map(row => ({
        id: row.id,
        collection: {
          id: row.collection_id,
          name: row.name,
          description: row.description
        },
        amount: row.amount
      }));
    },

    totalAmount: async (record) => {
      const result = await pool.query(
        'SELECT COALESCE(SUM(amount), 0) as total FROM remittance_line_items WHERE remittance_record_id = $1',
        [record.id]
      );
      return result.rows[0].total;
    },

    monthName: (record) => monthToName(record.month)
  },

  Debtor: {
    parish: async (debtor) => {
      const result = await pool.query('SELECT * FROM parishes WHERE id = $1', [debtor.parish_id]);
      return result.rows[0];
    },

    collection: async (debtor) => {
      const result = await pool.query('SELECT * FROM collections WHERE id = $1', [debtor.collection_id]);
      return result.rows[0];
    },

    monthName: (debtor) => monthToName(debtor.month)
  },

  Collection: {
    createdBy: async (collection) => {
      if (!collection.created_by) return null;
      const result = await pool.query('SELECT * FROM users WHERE id = $1', [collection.created_by]);
      return result.rows[0] || null;
    }
  },

  User: {
    parish: async (user) => {
      if (!user.parish_id) return null;
      const result = await pool.query('SELECT * FROM parishes WHERE id = $1', [user.parish_id]);
      return result.rows[0] || null;
    }
  }
};
