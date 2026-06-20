// src/graphql/resolvers.js
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { pool } from '../db/pool.js';
import { logAuditEvent } from '../utils/auditLog.js';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

const MONTH_NAMES = [
  '', 'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

// ─── Auth Helpers ────────────────────────────────────────────────────────────

function generateToken(user) {
  return jwt.sign(
    { id: user.id, email: user.email, role: user.role, parishId: user.parish_id },
    JWT_SECRET,
    { expiresIn: '7d' }
  );
}

function requireAuth(user) {
  if (!user) throw new Error('UNAUTHENTICATED: Please log in');
}

function requireRole(user, ...roles) {
  requireAuth(user);
  if (!roles.includes(user.role)) {
    throw new Error(`FORBIDDEN: Requires role ${roles.join(' or ')}`);
  }
}

// ─── Row Mappers ─────────────────────────────────────────────────────────────

function mapUser(row) {
  if (!row) return null;
  return {
    id: row.id,
    name: `${row.first_name} ${row.last_name}`.trim(),
    email: row.email,
    role: row.role,
    parishId: row.parish_id,
    priestToken: row.priest_token || null,
    createdAt: row.created_at?.toISOString(),
    // Pre-resolved parish if available from JOIN
    _parish: row.parish_name ? { id: row.parish_id, name: row.parish_name } : null,
  };
}

function mapParish(row) {
  if (!row) return null;
  return {
    id: row.id,
    name: row.name,
    diocese: row.diocese,
    location: row.location,
    contactEmail: row.contact_email,
    contactPhone: row.contact_phone,
    createdAt: row.created_at?.toISOString(),
  };
}

function mapCollection(row) {
  if (!row) return null;
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    isActive: row.is_active,
    createdAt: row.created_at?.toISOString(),
  };
}

function mapRemittanceRecord(row) {
  if (!row) return null;
  return {
    id: row.id,
    year: row.year,
    month: row.month,
    monthName: MONTH_NAMES[row.month],
    totalAmount: parseFloat(row.total_amount || 0),
    notes: row.notes,
    createdAt: row.created_at?.toISOString(),
    // resolved by field resolvers:
    _parishId: row.parish_id,
    _uploadedById: row.uploaded_by,
  };
}

function mapDebtor(row) {
  if (!row) return null;
  return {
    id: row.id,
    year: row.year,
    month: row.month,
    monthName: MONTH_NAMES[row.month],
    expectedAmount: parseFloat(row.expected_amount || 0),
    actualAmount: parseFloat(row.actual_amount || 0),
    balance: parseFloat(row.balance || 0),
    isPaid: row.is_paid,
    notes: row.notes,
    updatedAt: row.updated_at?.toISOString(),
    _parishId: row.parish_id,
    _collectionId: row.collection_id,
  };
}

// ─── Resolvers ───────────────────────────────────────────────────────────────

export const resolvers = {

  // ── Field Resolvers ────────────────────────────────────────────────────────

  User: {
    parish: async (parent) => {
      if (!parent.parishId) return null;
      if (parent._parish) return parent._parish;
      const { rows } = await pool.query('SELECT * FROM parishes WHERE id = $1', [parent.parishId]);
      return mapParish(rows[0]);
    },
  },

  RemittanceRecord: {
    parish: async (parent) => {
      const { rows } = await pool.query('SELECT * FROM parishes WHERE id = $1', [parent._parishId]);
      return mapParish(rows[0]);
    },
    uploadedBy: async (parent) => {
      if (!parent._uploadedById) return null;
      const { rows } = await pool.query('SELECT * FROM users WHERE id = $1', [parent._uploadedById]);
      return mapUser(rows[0]);
    },
    lineItems: async (parent) => {
      const { rows } = await pool.query(
        `SELECT rli.*, c.name as collection_name, c.description as collection_description,
                c.is_active as collection_is_active, c.created_at as collection_created_at
         FROM remittance_line_items rli
         JOIN collections c ON rli.collection_id = c.id
         WHERE rli.remittance_record_id = $1`,
        [parent.id]
      );
      return rows.map(row => ({
        id: row.id,
        remittanceSourceId: row.collection_id,
        amount: parseFloat(row.amount),
        source: {
          id: row.collection_id,
          name: row.collection_name,
          description: row.collection_description,
          isActive: row.collection_is_active,
          createdAt: row.collection_created_at?.toISOString(),
        },
      }));
    },
  },

  Debtor: {
    parish: async (parent) => {
      const { rows } = await pool.query('SELECT * FROM parishes WHERE id = $1', [parent._parishId]);
      return mapParish(rows[0]);
    },
    collection: async (parent) => {
      if (!parent._collectionId) return null;
      const { rows } = await pool.query('SELECT * FROM collections WHERE id = $1', [parent._collectionId]);
      return mapCollection(rows[0]);
    },
  },

  AuditLog: {
    user: async (parent) => {
      const { rows } = await pool.query('SELECT * FROM users WHERE id = $1', [parent.userId]);
      return mapUser(rows[0]);
    },
  },

  // ── Queries ────────────────────────────────────────────────────────────────

  Query: {

    me: async (_, __, { user }) => {
      requireAuth(user);
      const { rows } = await pool.query('SELECT * FROM users WHERE id = $1', [user.id]);
      return mapUser(rows[0]);
    },

    // Parishes
    parishes: async (_, __, { user }) => {
      requireAuth(user);
      const { rows } = await pool.query('SELECT * FROM parishes ORDER BY name');
      return rows.map(mapParish);
    },

    parish: async (_, { id }, { user }) => {
      requireAuth(user);
      // PRIEST can only view their own parish — force to their parish
      if (user.role === 'PRIEST') {
        if (user.parishId !== parseInt(id)) {
          throw new Error('FORBIDDEN: You can only view your own parish');
        }
      }
      const { rows } = await pool.query('SELECT * FROM parishes WHERE id = $1', [id]);
      return mapParish(rows[0]);
    },

    // Collections (remittance sources)
    remittanceSources: async (_, __, { user }) => {
      requireAuth(user);
      const { rows } = await pool.query(
        'SELECT * FROM collections WHERE is_active = true ORDER BY name'
      );
      return rows.map(mapCollection);
    },

    // Remittance Records
    remittanceRecords: async (_, { year, month, parishId }, { user }) => {
      requireAuth(user);

      // PRIEST is always forced to their own parish — ignore any parishId argument
      if (user.role === 'PRIEST') {
        if (!user.parishId) throw new Error('No parish assigned to your account');
        parishId = user.parishId;
        // Remove year/month filters so they see ALL years and months
        year = undefined;
        month = undefined;
      }

      let query = `
        SELECT rr.*,
               COALESCE(SUM(rli.amount), 0) as total_amount
        FROM remittance_records rr
        LEFT JOIN remittance_line_items rli ON rr.id = rli.remittance_record_id
        WHERE 1=1
      `;
      const params = [];

      if (year) { params.push(year); query += ` AND rr.year = $${params.length}`; }
      if (month) { params.push(month); query += ` AND rr.month = $${params.length}`; }
      if (parishId) { params.push(parishId); query += ` AND rr.parish_id = $${params.length}`; }

      query += ' GROUP BY rr.id ORDER BY rr.year DESC, rr.month DESC, rr.parish_id';

      const { rows } = await pool.query(query, params);
      return rows.map(mapRemittanceRecord);
    },

    remittanceRecord: async (_, { id }, { user }) => {
      requireAuth(user);
      const { rows } = await pool.query(
        `SELECT rr.*, COALESCE(SUM(rli.amount), 0) as total_amount
         FROM remittance_records rr
         LEFT JOIN remittance_line_items rli ON rr.id = rli.remittance_record_id
         WHERE rr.id = $1
         GROUP BY rr.id`,
        [id]
      );
      if (!rows[0]) return null;

      // PRIEST guard
      if (user.role === 'PRIEST' && rows[0].parish_id !== user.parishId) {
        throw new Error('FORBIDDEN: You can only view your own parish records');
      }
      return mapRemittanceRecord(rows[0]);
    },

    myParishRemittances: async (_, { year }, { user }) => {
      requireRole(user, 'PRIEST');
      if (!user.parishId) throw new Error('No parish assigned to your account');

      let query = `
        SELECT rr.*, COALESCE(SUM(rli.amount), 0) as total_amount
        FROM remittance_records rr
        LEFT JOIN remittance_line_items rli ON rr.id = rli.remittance_record_id
        WHERE rr.parish_id = $1
      `;
      const params = [user.parishId];

      if (year) { params.push(year); query += ` AND rr.year = $${params.length}`; }

      query += ' GROUP BY rr.id ORDER BY rr.year DESC, rr.month DESC';

      const { rows } = await pool.query(query, params);
      return rows.map(mapRemittanceRecord);
    },

    // Debtors
    debtors: async (_, { year, overdueOnly }, { user }) => {
      requireRole(user, 'ADMIN', 'BISHOP');

      let query = 'SELECT * FROM debtors WHERE 1=1';
      const params = [];

      if (year) { params.push(year); query += ` AND year = $${params.length}`; }
      if (overdueOnly) { query += ' AND is_paid = false AND balance > 0'; }

      query += ' ORDER BY year DESC, month DESC, parish_id';

      const { rows } = await pool.query(query, params);
      return rows.map(mapDebtor);
    },

    parishDebtors: async (_, { parishId, year }, { user }) => {
      requireAuth(user);
      if (user.role === 'PRIEST' && user.parishId !== parseInt(parishId)) {
        throw new Error('FORBIDDEN: You can only view your own parish debtors');
      }

      let query = 'SELECT * FROM debtors WHERE parish_id = $1';
      const params = [parishId];

      if (year) { params.push(year); query += ` AND year = $${params.length}`; }

      query += ' ORDER BY year DESC, month DESC';

      const { rows } = await pool.query(query, params);
      return rows.map(mapDebtor);
    },

    // Dashboard
    dashboardStats: async (_, { year }, { user }) => {
      requireRole(user, 'ADMIN', 'BISHOP');

      const currentMonth = new Date().getMonth() + 1;

      const [collected, parishes, reportedThisMonth, outstanding, recent] = await Promise.all([
        pool.query(
          `SELECT COALESCE(SUM(rli.amount), 0) as total
           FROM remittance_line_items rli
           JOIN remittance_records rr ON rli.remittance_record_id = rr.id
           WHERE rr.year = $1`,
          [year]
        ),
        pool.query('SELECT COUNT(*) as count FROM parishes'),
        pool.query(
          `SELECT COUNT(DISTINCT parish_id) as count
           FROM remittance_records
           WHERE year = $1 AND month = $2`,
          [year, currentMonth]
        ),
        pool.query(
          `SELECT COALESCE(SUM(balance), 0) as total
           FROM debtors
           WHERE year = $1 AND is_paid = false`,
          [year]
        ),
        pool.query(
          `SELECT rr.*, COALESCE(SUM(rli.amount), 0) as total_amount
           FROM remittance_records rr
           LEFT JOIN remittance_line_items rli ON rr.id = rli.remittance_record_id
           WHERE rr.year = $1
           GROUP BY rr.id
           ORDER BY rr.created_at DESC
           LIMIT 5`,
          [year]
        ),
      ]);

      return {
        totalCollectedThisYear: parseFloat(collected.rows[0].total),
        totalParishes: parseInt(parishes.rows[0].count),
        parishesReportedThisMonth: parseInt(reportedThisMonth.rows[0].count),
        totalOutstanding: parseFloat(outstanding.rows[0].total),
        recentActivity: recent.rows.map(mapRemittanceRecord),
      };
    },

    monthlySummary: async (_, { year }, { user }) => {
      requireRole(user, 'ADMIN', 'BISHOP');

      const { rows } = await pool.query(
        `SELECT rr.month,
                COALESCE(SUM(rli.amount), 0) as total_collected,
                COUNT(DISTINCT rr.parish_id) as parish_count
         FROM remittance_records rr
         LEFT JOIN remittance_line_items rli ON rr.id = rli.remittance_record_id
         WHERE rr.year = $1
         GROUP BY rr.month
         ORDER BY rr.month`,
        [year]
      );

      return rows.map(row => ({
        month: row.month,
        monthName: MONTH_NAMES[row.month],
        totalCollected: parseFloat(row.total_collected),
        parishCount: parseInt(row.parish_count),
      }));
    },

    parishSummaries: async (_, { year }, { user }) => {
      requireRole(user, 'ADMIN', 'BISHOP');

      const { rows } = await pool.query(
        `SELECT p.*,
                COALESCE(SUM(rli.amount), 0) as total_collected,
                COUNT(DISTINCT rr.month) as months_reported,
                MAX(rr.created_at) as last_reported,
                COALESCE(SUM(d.balance), 0) as outstanding_balance
         FROM parishes p
         LEFT JOIN remittance_records rr ON p.id = rr.parish_id AND rr.year = $1
         LEFT JOIN remittance_line_items rli ON rr.id = rli.remittance_record_id
         LEFT JOIN debtors d ON p.id = d.parish_id AND d.year = $1 AND d.is_paid = false
         GROUP BY p.id
         ORDER BY p.name`,
        [year]
      );

      return rows.map(row => ({
        parish: mapParish(row),
        totalCollected: parseFloat(row.total_collected),
        monthsReported: parseInt(row.months_reported),
        lastReported: row.last_reported?.toISOString() || null,
        outstandingBalance: parseFloat(row.outstanding_balance),
      }));
    },

    allUsers: async (_, __, { user }) => {
      requireRole(user, 'ADMIN');
      const { rows } = await pool.query(
        `SELECT u.*, p.name as parish_name
         FROM users u
         LEFT JOIN parishes p ON u.parish_id = p.id
         ORDER BY u.role, u.first_name`
      );
      return rows.map(row => ({
        ...mapUser(row),
        parish: row.parish_name ? { id: row.parish_id, name: row.parish_name } : null
      }));
    },

    auditLogs: async (_, { limit = 100 }, { user }) => {
      requireRole(user, 'ADMIN');
      const { rows } = await pool.query(
        'SELECT * FROM audit_logs ORDER BY timestamp DESC LIMIT $1',
        [limit]
      );
      return rows.map(row => ({
        id: row.id,
        userId: row.user_id,
        action: row.action,
        entityType: row.entity_type,
        entityId: row.entity_id,
        oldValues: row.old_values ? JSON.stringify(row.old_values) : null,
        newValues: row.new_values ? JSON.stringify(row.new_values) : null,
        timestamp: row.timestamp?.toISOString(),
      }));
    },
  },

  // ── Mutations ──────────────────────────────────────────────────────────────

  Mutation: {

    // Auth
    login: async (_, { input }) => {
      const { email, password } = input;

      // Try email/password login (ADMIN and BISHOP)
      const { rows } = await pool.query(
        'SELECT * FROM users WHERE email = $1 AND is_active = true',
        [email]
      );

      if (rows.length === 0) {
        throw new Error('Invalid credentials');
      }

      const dbUser = rows[0];

      if (!dbUser.password_hash) {
        throw new Error('This account uses token-based login');
      }

      const valid = await bcrypt.compare(password, dbUser.password_hash);
      if (!valid) throw new Error('Invalid credentials');

      const token = generateToken(dbUser);
      return { token, user: mapUser(dbUser) };
    },

    loginWithToken: async (_, { token: priestToken }) => {
      const { rows } = await pool.query(
        `SELECT * FROM users
         WHERE priest_token = $1
           AND is_active = true
           AND role = 'PRIEST'
           AND (token_expires_at IS NULL OR token_expires_at > NOW())`,
        [priestToken]
      );

      if (rows.length === 0) {
        throw new Error('Invalid or expired token');
      }

      const dbUser = rows[0];
      const jwtToken = generateToken(dbUser);
      return { token: jwtToken, user: mapUser(dbUser) };
    },

    changePassword: async (_, { currentPassword, newPassword }, { user }) => {
      requireAuth(user);

      const { rows } = await pool.query('SELECT * FROM users WHERE id = $1', [user.id]);
      const dbUser = rows[0];

      if (!dbUser.password_hash) {
        throw new Error('This account does not use password login');
      }

      const valid = await bcrypt.compare(currentPassword, dbUser.password_hash);
      if (!valid) throw new Error('Current password is incorrect');

      const hash = await bcrypt.hash(newPassword, 12);
      await pool.query('UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2', [hash, user.id]);

      await logAuditEvent(user.id, 'CHANGE_PASSWORD', 'users', user.id, null, null);
      return true;
    },

    // Users
    createUser: async (_, { input }, { user }) => {
      requireRole(user, 'ADMIN');
      const { name, email, password, role, parishId } = input;

      // Split name into first/last
      const parts = name.trim().split(' ');
      const firstName = parts[0];
      const lastName = parts.slice(1).join(' ') || '';

      let passwordHash = null;
      let priestToken = null;

      if (role === 'PRIEST') {
        // Generate a random token for priest login
        const { randomBytes } = await import('crypto');
        priestToken = randomBytes(32).toString('hex');
      } else {
        if (!password) throw new Error('Password is required for ADMIN and BISHOP roles');
        passwordHash = await bcrypt.hash(password, 12);
      }

      const { rows } = await pool.query(
        `INSERT INTO users (first_name, last_name, email, password_hash, priest_token,
                            token_generated_by, role, parish_id)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         RETURNING *`,
        [firstName, lastName, email, passwordHash, priestToken,
         role === 'PRIEST' ? user.id : null, role, parishId || null]
      );

      const newUser = rows[0];
      await logAuditEvent(user.id, 'CREATE_USER', 'users', newUser.id, null, {
        name, email, role, parishId
      });

      // Include priest token in response if just created
      const mapped = mapUser(newUser);
      if (priestToken) mapped.priestToken = priestToken;
      return mapped;
    },

    deleteUser: async (_, { id }, { user }) => {
      requireRole(user, 'ADMIN');
      if (parseInt(id) === user.id) throw new Error('Cannot delete your own account');

      const { rows } = await pool.query('SELECT * FROM users WHERE id = $1', [id]);
      if (!rows[0]) throw new Error('User not found');

      await pool.query('UPDATE users SET is_active = false, updated_at = NOW() WHERE id = $1', [id]);
      await logAuditEvent(user.id, 'DELETE_USER', 'users', id, rows[0], null);
      return true;
    },

    // Parishes
    createParish: async (_, { input }, { user }) => {
      requireRole(user, 'ADMIN');
      const { name, location, diocese, contactEmail, contactPhone } = input;

      const { rows } = await pool.query(
        `INSERT INTO parishes (name, location, diocese, contact_email, contact_phone)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING *`,
        [name, location || null, diocese || null, contactEmail || null, contactPhone || null]
      );

      await logAuditEvent(user.id, 'CREATE_PARISH', 'parishes', rows[0].id, null, input);
      return mapParish(rows[0]);
    },

    updateParish: async (_, { id, input }, { user }) => {
      requireRole(user, 'ADMIN');

      const { rows: existing } = await pool.query('SELECT * FROM parishes WHERE id = $1', [id]);
      if (!existing[0]) throw new Error('Parish not found');

      const { name, location, diocese, contactEmail, contactPhone } = input;
      const updated = {
        name: name ?? existing[0].name,
        location: location ?? existing[0].location,
        diocese: diocese ?? existing[0].diocese,
        contact_email: contactEmail ?? existing[0].contact_email,
        contact_phone: contactPhone ?? existing[0].contact_phone,
      };

      const { rows } = await pool.query(
        `UPDATE parishes
         SET name = $1, location = $2, diocese = $3,
             contact_email = $4, contact_phone = $5, updated_at = NOW()
         WHERE id = $6
         RETURNING *`,
        [updated.name, updated.location, updated.diocese,
         updated.contact_email, updated.contact_phone, id]
      );

      await logAuditEvent(user.id, 'UPDATE_PARISH', 'parishes', id, existing[0], input);
      return mapParish(rows[0]);
    },

    deleteParish: async (_, { id }, { user }) => {
      requireRole(user, 'ADMIN');

      const { rows } = await pool.query('SELECT * FROM parishes WHERE id = $1', [id]);
      if (!rows[0]) throw new Error('Parish not found');

      await pool.query('DELETE FROM parishes WHERE id = $1', [id]);
      await logAuditEvent(user.id, 'DELETE_PARISH', 'parishes', id, rows[0], null);
      return true;
    },

    // Collections (remittance sources)
    createRemittanceSource: async (_, { input }, { user }) => {
      requireRole(user, 'ADMIN');
      const { name, description } = input;

      const { rows } = await pool.query(
        `INSERT INTO collections (name, description, created_by)
         VALUES ($1, $2, $3)
         RETURNING *`,
        [name, description || null, user.id]
      );

      await logAuditEvent(user.id, 'CREATE_COLLECTION', 'collections', rows[0].id, null, input);
      return mapCollection(rows[0]);
    },

    toggleRemittanceSource: async (_, { id }, { user }) => {
      requireRole(user, 'ADMIN');

      const { rows } = await pool.query(
        `UPDATE collections
         SET is_active = NOT is_active, updated_at = NOW()
         WHERE id = $1
         RETURNING *`,
        [id]
      );

      if (!rows[0]) throw new Error('Collection not found');
      await logAuditEvent(user.id, 'TOGGLE_COLLECTION', 'collections', id, null, { isActive: rows[0].is_active });
      return mapCollection(rows[0]);
    },

    // Remittance Records
    createRemittanceRecord: async (_, { input }, { user }) => {
      requireRole(user, 'ADMIN');
      const { parishId, year, month, lineItems } = input;

      if (!lineItems || lineItems.length === 0) {
        throw new Error('At least one line item is required');
      }

      const client = await pool.connect();
      try {
        await client.query('BEGIN');

        const { rows } = await client.query(
          `INSERT INTO remittance_records (parish_id, year, month, uploaded_by)
           VALUES ($1, $2, $3, $4)
           RETURNING *`,
          [parishId, year, month, user.id]
        );

        const record = rows[0];
        let totalAmount = 0;

        for (const item of lineItems) {
          await client.query(
            `INSERT INTO remittance_line_items (remittance_record_id, collection_id, amount)
             VALUES ($1, $2, $3)`,
            [record.id, item.remittanceSourceId, item.amount]
          );
          totalAmount += item.amount;
        }

        await client.query('COMMIT');

        await logAuditEvent(user.id, 'CREATE_REMITTANCE', 'remittance_records', record.id, null, input);

        return {
          ...mapRemittanceRecord(record),
          totalAmount,
        };
      } catch (error) {
        await client.query('ROLLBACK');
        if (error.code === '23505') {
          throw new Error('A remittance record already exists for this parish/month/year');
        }
        throw error;
      } finally {
        client.release();
      }
    },

    deleteRemittanceRecord: async (_, { id }, { user }) => {
      requireRole(user, 'ADMIN');

      const { rows } = await pool.query('SELECT * FROM remittance_records WHERE id = $1', [id]);
      if (!rows[0]) throw new Error('Record not found');

      await pool.query('DELETE FROM remittance_records WHERE id = $1', [id]);
      await logAuditEvent(user.id, 'DELETE_REMITTANCE', 'remittance_records', id, rows[0], null);
      return true;
    },

    // Debtors
    updateDebtor: async (_, { id, input }, { user }) => {
      requireRole(user, 'ADMIN');

      const { rows: existing } = await pool.query('SELECT * FROM debtors WHERE id = $1', [id]);
      if (!existing[0]) throw new Error('Debtor record not found');

      const prev = existing[0];
      const expectedAmount = input.expectedAmount ?? parseFloat(prev.expected_amount);
      const actualAmount = input.actualAmount ?? parseFloat(prev.actual_amount);
      const balance = expectedAmount - actualAmount;
      const isPaid = input.isPaid ?? (balance <= 0);

      const { rows } = await pool.query(
        `UPDATE debtors
         SET expected_amount = $1, actual_amount = $2, balance = $3,
             is_paid = $4, notes = $5, updated_at = NOW()
         WHERE id = $6
         RETURNING *`,
        [expectedAmount, actualAmount, balance, isPaid, input.notes ?? prev.notes, id]
      );

      await logAuditEvent(user.id, 'UPDATE_DEBTOR', 'debtors', id, prev, input);
      return mapDebtor(rows[0]);
    },

    adminResetPassword: async (_, { userId, newPassword }, { user }) => {
      requireRole(user, 'ADMIN');
      if (newPassword.length < 6) throw new Error('Password must be at least 6 characters');
      const hash = await bcrypt.hash(newPassword, 12);
      await pool.query(
        'UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2',
        [hash, userId]
      );
      await logAuditEvent(user.id, 'ADMIN_RESET_PASSWORD', 'users', userId, null, null);
      return true;
    },

    markAsOverdue: async (_, { parishId, year, month }, { user }) => {
      requireRole(user, 'ADMIN');

      // Upsert a debtor record marking this parish/month as unpaid
      const { rows } = await pool.query(
        `INSERT INTO debtors (parish_id, collection_id, year, month, expected_amount, actual_amount, balance, is_paid)
         VALUES ($1, 1, $2, $3, 0, 0, 0, false)
         ON CONFLICT (parish_id, collection_id, year, month)
         DO UPDATE SET is_paid = false, updated_at = NOW()
         RETURNING *`,
        [parishId, year, month]
      );

      await logAuditEvent(user.id, 'MARK_OVERDUE', 'debtors', rows[0].id, null, { parishId, year, month });
      return mapDebtor(rows[0]);
    },
  },
};