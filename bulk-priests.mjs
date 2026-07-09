/**
 * Bulk Priest Creator — Parish Name only
 * Usage: node bulk-priests.mjs
 * Creates one priest account per parish using the parish name as the user name.
 * Tokens saved to: priest-tokens.csv
 */
import pg from 'pg';
import crypto from 'crypto';
import { writeFile } from 'fs/promises';
import dotenv from 'dotenv';
dotenv.config();

const { Pool } = pg;
const pool = new Pool({
  host: process.env.DB_HOST, port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME, user: process.env.DB_USER,
  password: process.env.DB_PASSWORD, ssl: { rejectUnauthorized: false }
});

const { rows: parishes } = await pool.query('SELECT id, name FROM parishes ORDER BY name');
console.log(`Found ${parishes.length} parishes`);

const results = [];
let created = 0;
let skipped = 0;

for (const parish of parishes) {
  // Check if priest already exists for this parish
  const { rows: existing } = await pool.query(
    "SELECT id FROM users WHERE parish_id = $1 AND role = 'PRIEST' AND is_active = true",
    [parish.id]
  );

  if (existing.length > 0) {
    console.log(`- Skipped (priest exists): "${parish.name}"`);
    skipped++;
    results.push({ parish: parish.name, token: 'SKIPPED: Already exists' });
    continue;
  }

  const token = crypto.randomBytes(32).toString('hex');

  await pool.query(
    `INSERT INTO users (first_name, last_name, role, parish_id, priest_token, token_generated_by)
     VALUES ($1, $2, 'PRIEST', $3, $4, 1)`,
    [parish.name, '', parish.id, token]
  );

  console.log(`✓ Created: "${parish.name}"`);
  created++;
  results.push({ parish: parish.name, token });
}

const outputLines = ['Parish Name,Login Token'];
results.forEach(r => outputLines.push(`"${r.parish}","${r.token}"`));
await writeFile('priest-tokens.csv', outputLines.join('\n'));

console.log(`\n✓ Done: ${created} created, ${skipped} skipped`);
console.log('✓ Tokens saved to: priest-tokens.csv');
await pool.end();
