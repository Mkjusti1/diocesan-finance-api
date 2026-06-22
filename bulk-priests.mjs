/**
 * Bulk Priest Creator
 * Usage: node bulk-priests.mjs priests.csv
 * 
 * CSV format:
 * Parish Name,Priest Name
 * Aguleri: St Joseph,Fr. John Obi
 * Aguleri: St Francis,Fr. Peter Eze
 */
import pg from 'pg';
import crypto from 'crypto';
import { readFile, writeFile } from 'fs/promises';
import dotenv from 'dotenv';
dotenv.config();

const { Pool } = pg;
const pool = new Pool({
  host: process.env.DB_HOST, port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME, user: process.env.DB_USER,
  password: process.env.DB_PASSWORD, ssl: { rejectUnauthorized: false }
});

const csvFile = process.argv[2];
if (!csvFile) {
  console.log('Usage: node bulk-priests.mjs priests.csv');
  process.exit(1);
}

const content = await readFile(csvFile, 'utf-8');
const lines = content.trim().split('\n').slice(1); // skip header

const results = [];
let created = 0;
let skipped = 0;
let errors = 0;

for (const line of lines) {
  const parts = line.split(',');
  if (parts.length < 2) continue;

  const parishName = parts[0].trim();
  const priestName = parts.slice(1).join(',').trim(); // handle commas in name

  // Find parish
  const { rows: parishes } = await pool.query(
    'SELECT id FROM parishes WHERE LOWER(name) = LOWER($1)', [parishName]
  );

  if (parishes.length === 0) {
    console.log(`✗ Parish not found: "${parishName}"`);
    errors++;
    results.push({ parishName, priestName, token: 'ERROR: Parish not found' });
    continue;
  }

  const parishId = parishes[0].id;

  // Check if priest already exists for this parish
  const { rows: existing } = await pool.query(
    "SELECT id FROM users WHERE parish_id = $1 AND role = 'PRIEST' AND is_active = true",
    [parishId]
  );

  if (existing.length > 0) {
    console.log(`- Skipped (priest exists): "${parishName}"`);
    skipped++;
    results.push({ parishName, priestName, token: 'SKIPPED: Priest already exists' });
    continue;
  }

  // Create priest
  const token = crypto.randomBytes(32).toString('hex');
  const nameParts = priestName.split(' ');
  const firstName = nameParts[0];
  const lastName = nameParts.slice(1).join(' ') || parishName;

  await pool.query(
    `INSERT INTO users (first_name, last_name, role, parish_id, priest_token, token_generated_by)
     VALUES ($1, $2, 'PRIEST', $3, $4, 1)`,
    [firstName, lastName, parishId, token]
  );

  console.log(`✓ Created: "${priestName}" → "${parishName}"`);
  created++;
  results.push({ parishName, priestName, token });
}

// Write results to CSV
const outputLines = ['Parish Name,Priest Name,Login Token'];
results.forEach(r => {
  outputLines.push(`"${r.parishName}","${r.priestName}","${r.token}"`);
});
await writeFile('priest-tokens.csv', outputLines.join('\n'));

console.log(`\n✓ Done: ${created} created, ${skipped} skipped, ${errors} errors`);
console.log('✓ Tokens saved to: priest-tokens.csv');
await pool.end();
