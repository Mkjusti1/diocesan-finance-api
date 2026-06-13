// src/utils/auditLog.js
import { pool } from '../db/pool.js';

/**
 * Log an audit event to the database
 */
export async function logAuditEvent(userId, action, entityType, entityId, oldValues, newValues) {
  try {
    await pool.query(
      `INSERT INTO audit_logs (user_id, action, entity_type, entity_id, old_values, new_values)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [
        userId,
        action,
        entityType,
        entityId,
        oldValues ? JSON.stringify(oldValues) : null,
        newValues ? JSON.stringify(newValues) : null
      ]
    );
  } catch (error) {
    console.error('Failed to log audit event:', error);
  }
}

/**
 * Get audit logs for a user
 */
export async function getUserAuditLogs(userId, limit = 100) {
  const result = await pool.query(
    `SELECT * FROM audit_logs 
     WHERE user_id = $1 
     ORDER BY timestamp DESC 
     LIMIT $2`,
    [userId, limit]
  );
  return result.rows;
}

/**
 * Get audit logs for an entity
 */
export async function getEntityAuditLogs(entityType, entityId, limit = 100) {
  const result = await pool.query(
    `SELECT * FROM audit_logs 
     WHERE entity_type = $1 AND entity_id = $2 
     ORDER BY timestamp DESC 
     LIMIT $3`,
    [entityType, entityId, limit]
  );
  return result.rows;
}

/**
 * Get all audit logs
 */
export async function getAllAuditLogs(limit = 1000) {
  const result = await pool.query(
    `SELECT * FROM audit_logs 
     ORDER BY timestamp DESC 
     LIMIT $1`,
    [limit]
  );
  return result.rows;
}
