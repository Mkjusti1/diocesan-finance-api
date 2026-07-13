// src/utils/priestTokens.js
import crypto from 'crypto';
import { pool } from '../db/pool.js';

/**
 * Ensures a parish has an active priest login token. Uses the parish name
 * as the account name (no separate priest name is collected) so tokens
 * stay consistent whether created via CSV upload, manual parish creation,
 * or the bulk "Generate All Priest Tokens" admin action.
 *
 * Safe to call repeatedly — if an active priest account already exists
 * for the parish, it's left untouched and this returns null.
 */
export async function ensurePriestTokenForParish(parishId, parishName, createdByUserId) {
  const { rows: existing } = await pool.query(
    "SELECT id FROM users WHERE parish_id = $1 AND role = 'PRIEST' AND is_active = true",
    [parishId]
  );
  if (existing.length > 0) return null;

  const token = crypto.randomBytes(32).toString('hex');

  const { rows } = await pool.query(
    `INSERT INTO users (first_name, last_name, role, parish_id, priest_token, token_generated_by)
     VALUES ($1, $2, 'PRIEST', $3, $4, $5)
     RETURNING *`,
    [parishName.trim(), '', parishId, token, createdByUserId || null]
  );

  return rows[0];
}
