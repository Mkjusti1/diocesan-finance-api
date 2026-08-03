// src/graphql/resolvers.js
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { pool } from '../db/pool.js';
import { logAuditEvent } from '../utils/auditLog.js';
import { generateDebtors } from '../services/spreadsheetParser.js';

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  console.error('FATAL: JWT_SECRET environment variable is not set');
  process.exit(1);
}

const MONTH_NAMES = [
  'Annual', 'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const CATEGORY_ORDER = [
  'Rectory',
  'National Collections',
  'Harvest & Bazaar',
  'Cathedraticum',
  'Project Sunday',
  'Seminary Collections',
];

const CATEGORY_MATCHERS = [
  { name: 'Rectory', matchers: ['rectory'] },
  { name: 'Harvest & Bazaar', matchers: ['harvest', 'bazaar'] },
  { name: 'Cathedraticum', matchers: ['cathedraticum'] },
  { name: 'Project Sunday', matchers: ['project sunday'] },
  { name: 'Seminary Collections', matchers: ['bigard', 'ciwa', 'mina', 'seminary'] },
];

function getCollectionCategory(collectionName) {
  const lower = collectionName.toLowerCase();
  for (const cat of CATEGORY_MATCHERS) {
    if (cat.matchers.some(m => lower.includes(m))) return cat.name;
  }
  return 'National Collections';
}

function generateToken(user) {
  return jwt.sign(
    { id: user.id, email: user.email, role: user.role, parishId: user.parish_id },
    JWT_SECRET,
    { expiresIn: '7d' }
  );
}

function validatePassword(password) {
  if (!password || password.length < 8) {
    throw new Error('Password must be at least 8 characters long');
  }
  if (!/[A-Z]/.test(password)) {
    throw new Error('Password must contain at least one uppercase letter');
  }
  if (!/[a-z]/.test(password)) {
    throw new Error('Password must contain at least one lowercase letter');
  }
  if (!/[0-9]/.test(password)) {
    throw new Error('Password must contain at least one number');
  }
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

function mapUser(row) {
  if (!row) return null;
  return {
    id: row.id,
    name: `${row.first_name} ${row.last_name}`.trim(),
    email: row.email,
    role: row.role,
    parishId: row.parish_id,
    createdAt: row.created_at?.toISOString(),
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
    createdYear: row.created_year || new Date(row.created_at).getFullYear(),
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

export const resolvers = {

  User: {
    parish: async (parent) => {
      if (parent._parishObj !== undefined) return parent._parishObj;
      if (!parent.parishId) return null;
      if (parent._parish) return parent._parish;
      const { rows } = await pool.query('SELECT * FROM parishes WHERE id = $1', [parent.parishId]);
      return mapParish(rows[0]);
    },
  },

  RemittanceRecord: {
    parish: async (parent) => {
      if (parent._parishObj !== undefined) return parent._parishObj;
      const { rows } = await pool.query('SELECT * FROM parishes WHERE id = $1', [parent._parishId]);
      return mapParish(rows[0]);
    },
    uploadedBy: async (parent) => {
      if (!parent._uploadedById) return null;
      const { rows } = await pool.query('SELECT * FROM users WHERE id = $1', [parent._uploadedById]);
      return mapUser(rows[0]);
    },
    lineItems: async (parent) => {
      if (parent._lineItems !== undefined) return parent._lineItems;
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
      if (parent._parishObj !== undefined) return parent._parishObj;
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

  Query: {

    me: async (_, __, { user }) => {
      requireAuth(user);
      const { rows } = await pool.query('SELECT * FROM users WHERE id = $1', [user.id]);
      return mapUser(rows[0]);
    },

    parishes: async (_, __, { user }) => {
      requireAuth(user);
      const { rows } = await pool.query(`SELECT * FROM parishes ORDER BY CASE WHEN LOWER(name) LIKE '%aguleri%joseph%' THEN 0 ELSE 1 END, name`);
      return rows.map(mapParish);
    },

    parish: async (_, { id }, { user }) => {
      requireAuth(user);
      const { rows } = await pool.query('SELECT * FROM parishes WHERE id = $1', [id]);
      return mapParish(rows[0]);
    },

    remittanceSources: async (_, __, { user }) => {
      requireAuth(user);
      const { rows } = await pool.query(
        'SELECT * FROM collections WHERE is_active = true ORDER BY name'
      );
      return rows.map(mapCollection);
    },

    remittanceRecords: async (_, { year, month, parishId }, { user }) => {
      requireAuth(user);

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
      const records = rows.map(mapRemittanceRecord);
      if (records.length === 0) return records;

      const parishIds = [...new Set(records.map(r => r._parishId))];
      const recordIds = records.map(r => r.id);

      const [{ rows: parishRows }, { rows: lineItemRows }] = await Promise.all([
        pool.query('SELECT * FROM parishes WHERE id = ANY($1)', [parishIds]),
        pool.query(
          `SELECT rli.*, rli.remittance_record_id, c.name as collection_name,
           c.description as collection_description,
           c.is_active as collection_is_active, c.created_at as collection_created_at
           FROM remittance_line_items rli
           JOIN collections c ON rli.collection_id = c.id
           WHERE rli.remittance_record_id = ANY($1)`,
          [recordIds]
        ),
      ]);

      const parishById = {};
      for (const row of parishRows) parishById[row.id] = mapParish(row);

      const lineItemsByRecordId = {};
      for (const row of lineItemRows) {
        if (!lineItemsByRecordId[row.remittance_record_id]) lineItemsByRecordId[row.remittance_record_id] = [];
        lineItemsByRecordId[row.remittance_record_id].push({
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
        });
      }

      for (const r of records) {
        r._parishObj = parishById[r._parishId] || null;
        r._lineItems = lineItemsByRecordId[r.id] || [];
      }

      records.sort((a, b) => {
        if (a._parishObj?.name === 'Aguleri: St. Joseph') return -1;
        if (b._parishObj?.name === 'Aguleri: St. Joseph') return 1;
        return 0;
      });

      return records;
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
      return mapRemittanceRecord(rows[0]);
    },

    debtors: async (_, { year, overdueOnly }, { user }) => {
      requireRole(user, 'ADMIN', 'BISHOP');

      let query = 'SELECT * FROM debtors WHERE 1=1';
      const params = [];

      if (year) { params.push(year); query += ` AND year = $${params.length}`; }
      if (overdueOnly) { query += ' AND is_paid = false'; }

      query += ' ORDER BY year DESC, month DESC, parish_id';

      const { rows } = await pool.query(query, params);
      const debtorRows = rows.map(mapDebtor);
      if (debtorRows.length === 0) return debtorRows;

      const parishIds = [...new Set(debtorRows.map(d => d._parishId))];
      const { rows: parishRows } = await pool.query('SELECT * FROM parishes WHERE id = ANY($1)', [parishIds]);
      const parishById = {};
      for (const row of parishRows) parishById[row.id] = mapParish(row);
      for (const d of debtorRows) d._parishObj = parishById[d._parishId] || null;

      debtorRows.sort((a, b) => {
        if (a._parishObj?.name === 'Aguleri: St. Joseph') return -1;
        if (b._parishObj?.name === 'Aguleri: St. Joseph') return 1;
        return 0;
      });

      return debtorRows;
    },

    parishDebtors: async (_, { parishId, year }, { user }) => {
      requireAuth(user);

      let query = 'SELECT * FROM debtors WHERE parish_id = $1';
      const params = [parishId];

      if (year) { params.push(year); query += ` AND year = $${params.length}`; }

      query += ' ORDER BY year DESC, month DESC';

      const { rows } = await pool.query(query, params);
      return rows.map(mapDebtor);
    },

    dashboardStats: async (_, { year }, { user }) => {
      requireRole(user, 'ADMIN', 'BISHOP');

      const currentMonth = new Date().getMonth() + 1;

      const [collected, parishes, reportedThisMonth, outstanding, recent, collectionData] = await Promise.all([
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
        pool.query(
          `SELECT c.id, c.name, c.description, c.is_active, c.created_at, COALESCE(SUM(rli.amount), 0) as total
           FROM collections c
           LEFT JOIN remittance_line_items rli ON rli.collection_id = c.id
           LEFT JOIN remittance_records rr ON rr.id = rli.remittance_record_id AND rr.year = $1
           WHERE c.is_active = true
           GROUP BY c.id, c.name, c.description, c.is_active, c.created_at
           ORDER BY c.name`,
          [year]
        ),
      ]);

      const categoryTotals = {};
      for (const cat of CATEGORY_ORDER) categoryTotals[cat] = 0;

      for (const row of collectionData.rows) {
        const category = getCollectionCategory(row.name);
        categoryTotals[category] = (categoryTotals[category] || 0) + parseFloat(row.total);
      }

      const collectionSummaries = CATEGORY_ORDER.map((name, idx) => ({
        collection: {
          id: `cat-${idx}`,
          name,
          description: null,
          isActive: true,
          createdAt: new Date().toISOString(),
        },
        totalCollected: categoryTotals[name] || 0,
      }));

      return {
        totalCollectedThisYear: parseFloat(collected.rows[0].total),
        totalParishes: parseInt(parishes.rows[0].count),
        parishesReportedThisMonth: parseInt(reportedThisMonth.rows[0].count),
        totalOutstanding: parseFloat(outstanding.rows[0].total),
        recentActivity: recent.rows.map(mapRemittanceRecord),
        collectionSummaries,
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
         WHERE rr.year = $1 AND rr.month BETWEEN 1 AND 12
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
         COUNT(DISTINCT CASE WHEN rr.month BETWEEN 1 AND 12 THEN rr.month END) as months_reported,
         MAX(rr.created_at) as last_reported,
         COALESCE(SUM(d.balance), 0) as outstanding_balance
         FROM parishes p
         LEFT JOIN remittance_records rr ON p.id = rr.parish_id AND rr.year = $1
         LEFT JOIN remittance_line_items rli ON rr.id = rli.remittance_record_id
         LEFT JOIN debtors d ON p.id = d.parish_id AND d.year = $1 AND d.is_paid = false
         GROUP BY p.id
         ORDER BY total_collected DESC`,
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

  Mutation: {

    login: async (_, { input }) => {
      const { email, password } = input;

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

    regenerateDebtors: async (_, { year }, { user }) => {
      requireRole(user, 'ADMIN');

      let years;
      if (year) {
        years = [year];
      } else {
        const { rows } = await pool.query('SELECT DISTINCT year FROM remittance_records ORDER BY year');
        years = rows.map(r => r.year);
      }

      for (const y of years) {
        await generateDebtors(y, user.id);
      }

      await logAuditEvent(user.id, 'REGENERATE_DEBTORS', 'debtors', null, null, { years });

      return { success: true, years };
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

    createUser: async (_, { input }, { user }) => {
      requireRole(user, 'ADMIN');
      const { name, email, password, role, parishId } = input;

      const parts = name.trim().split(' ');
      const firstName = parts[0];
      const lastName = parts.slice(1).join(' ') || '';

      if (!password) throw new Error('Password is required');
      const passwordHash = await bcrypt.hash(password, 12);

      const { rows } = await pool.query(
        `INSERT INTO users (first_name, last_name, email, password_hash, role, parish_id)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING *`,
        [firstName, lastName, email, passwordHash, role, parishId || null]
      );

      const newUser = rows[0];
      await logAuditEvent(user.id, 'CREATE_USER', 'users', newUser.id, null, {
        name, email, role, parishId
      });

      return mapUser(newUser);
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

    createParish: async (_, { input }, { user }) => {
      requireRole(user, 'ADMIN');
      const { name, location, diocese, contactEmail, contactPhone, createdYear } = input;

      const yearToUse = createdYear || new Date().getFullYear();

      const { rows } = await pool.query(
        `INSERT INTO parishes (name, location, diocese, contact_email, contact_phone, created_year)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING *`,
        [name, location || null, diocese || null, contactEmail || null, contactPhone || null, yearToUse]
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
    deleteRemittanceRecordsByCollectionAndYear: async (_, { collectionName, year }, { user }) => {
      requireRole(user, 'ADMIN');

      const client = await pool.connect();
      try {
        await client.query('BEGIN');

        // Find the collection ID by name
        const { rows: collectionRows } = await client.query(
          'SELECT id FROM collections WHERE LOWER(name) = LOWER($1)',
          [collectionName]
        );

        if (collectionRows.length === 0) {
          throw new Error(`Collection "${collectionName}" not found`);
        }

        const collectionId = collectionRows[0].id;

        // Find all line items for this collection in this year
        const { rows: lineItemsToDelete } = await client.query(
          `SELECT rli.id, rli.remittance_record_id
           FROM remittance_line_items rli
           JOIN remittance_records rr ON rli.remittance_record_id = rr.id
           WHERE rli.collection_id = $1 AND rr.year = $2`,
          [collectionId, year]
        );

        if (lineItemsToDelete.length === 0) {
          throw new Error(`No records found for collection "${collectionName}" in ${year}`);
        }

        const lineItemIds = lineItemsToDelete.map(li => li.id);
        const recordIds = [...new Set(lineItemsToDelete.map(li => li.remittance_record_id))];

        // Delete the line items
        await client.query(
          'DELETE FROM remittance_line_items WHERE id = ANY($1)',
          [lineItemIds]
        );

        // Delete records that now have no line items left
        const { rows: emptyRecords } = await client.query(
          `SELECT rr.id FROM remittance_records rr
           WHERE rr.id = ANY($1)
           AND NOT EXISTS (
             SELECT 1 FROM remittance_line_items rli WHERE rli.remittance_record_id = rr.id
           )`,
          [recordIds]
        );

        let deletedRecordsCount = 0;
        if (emptyRecords.length > 0) {
          const emptyRecordIds = emptyRecords.map(r => r.id);
          const { rowCount } = await client.query(
            'DELETE FROM remittance_records WHERE id = ANY($1)',
            [emptyRecordIds]
          );
          deletedRecordsCount = rowCount;
        }

        await client.query('COMMIT');

        await logAuditEvent(user.id, 'BULK_DELETE_COLLECTION', 'remittance_records', null, null, {
          collectionName,
          year,
          deletedLineItems: lineItemsToDelete.length,
          deletedRecords: deletedRecordsCount
        });

        return {
          success: true,
          deletedCount: lineItemsToDelete.length,
          message: `${lineItemsToDelete.length} collection entries deleted for "${collectionName}" in ${year}. ${deletedRecordsCount} empty record(s) removed.`
        };
      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      } finally {
        client.release();
      }
    },

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

    recordPayment: async (_, { input }, { user }) => {
      requireRole(user, 'ADMIN');
      const { parishId, collectionId, year, month, amount } = input;

      if (amount == null || isNaN(amount) || amount < 0) {
        throw new Error('Amount must be a positive number');
      }
      if (month < 0 || month > 12) {
        throw new Error('Month must be between 0 (annual) and 12');
      }

      const client = await pool.connect();
      try {
        await client.query('BEGIN');

        let { rows: recRows } = await client.query(
          `SELECT * FROM remittance_records WHERE parish_id = $1 AND year = $2 AND month = $3`,
          [parishId, year, month]
        );
        let record = recRows[0];
        if (!record) {
          const { rows } = await client.query(
            `INSERT INTO remittance_records (parish_id, year, month, uploaded_by)
             VALUES ($1, $2, $3, $4)
             RETURNING *`,
            [parishId, year, month, user.id]
          );
          record = rows[0];
        }

        await client.query(
          `INSERT INTO remittance_line_items (remittance_record_id, collection_id, amount)
           VALUES ($1, $2, $3)
           ON CONFLICT (remittance_record_id, collection_id)
           DO UPDATE SET amount = EXCLUDED.amount, updated_at = NOW()`,
          [record.id, collectionId, amount]
        );

        const isPaid = amount > 0;
        const { rows: debtorRows } = await client.query(
          `INSERT INTO debtors (parish_id, collection_id, year, month, expected_amount, actual_amount, balance, is_paid)
           VALUES ($1, $2, $3, $4, $5, $5, 0, $6)
           ON CONFLICT (parish_id, collection_id, year, month)
           DO UPDATE SET
           expected_amount = EXCLUDED.expected_amount,
           actual_amount = EXCLUDED.actual_amount,
           balance = 0,
           is_paid = EXCLUDED.is_paid,
           updated_at = NOW()
           RETURNING *`,
          [parishId, collectionId, year, month, amount, isPaid]
        );

        await client.query('COMMIT');
        await logAuditEvent(user.id, 'RECORD_PAYMENT', 'debtors', debtorRows[0].id, null, input);
        return mapDebtor(debtorRows[0]);
      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      } finally {
        client.release();
      }
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
    bulkRecordRemittances: async (_, { input }, { user }) => {
      requireRole(user, 'ADMIN');
      const { year, month, collectionCategory, entries } = input;
      if (!entries || entries.length === 0) throw new Error('No entries provided');

      // Find collections matching the selected category
      const { rows: allCollections } = await pool.query(
        'SELECT id, name FROM collections WHERE is_active = true'
      );

      const matchingCollections = allCollections.filter(c => {
        const cat = getCollectionCategory(c.name);
        return cat.toLowerCase() === collectionCategory.toLowerCase();
      });

      if (matchingCollections.length === 0) {
        throw new Error(`No active collections found for category "${collectionCategory}"`);
      }

      // Use the first matching collection for line items
      const targetCollection = matchingCollections[0];

      const client = await pool.connect();
      let createdCount = 0;
      let updatedCount = 0;

      try {
        await client.query('BEGIN');

        for (const entry of entries) {
          if (!entry.amount || entry.amount <= 0) continue;

          // Find or create remittance record
          let { rows: recRows } = await client.query(
            'SELECT id FROM remittance_records WHERE parish_id = $1 AND year = $2 AND month = $3',
            [entry.parishId, year, month]
          );

          let recordId;
          if (recRows.length === 0) {
            const { rows } = await client.query(
              `INSERT INTO remittance_records (parish_id, year, month, uploaded_by)
               VALUES ($1, $2, $3, $4) RETURNING id`,
              [entry.parishId, year, month, user.id]
            );
            recordId = rows[0].id;
            createdCount++;
          } else {
            recordId = recRows[0].id;
            updatedCount++;
          }

          // Upsert line item
          await client.query(
            `INSERT INTO remittance_line_items (remittance_record_id, collection_id, amount)
             VALUES ($1, $2, $3)
             ON CONFLICT (remittance_record_id, collection_id)
             DO UPDATE SET amount = EXCLUDED.amount, updated_at = NOW()`,
            [recordId, targetCollection.id, entry.amount]
          );
        }

        await client.query('COMMIT');

        await logAuditEvent(user.id, 'BULK_RECORD_REMITTANCES', 'remittance_records', null, null, {
          year, month, collectionCategory, collectionId: targetCollection.id, entryCount: entries.length
        });

        return {
          success: true,
          createdCount,
          updatedCount,
          collectionName: targetCollection.name,
          message: `${createdCount} record(s) created, ${updatedCount} record(s) updated for ${targetCollection.name} (${year})`
        };
      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      } finally {
        client.release();
      }
    },
  },
};
