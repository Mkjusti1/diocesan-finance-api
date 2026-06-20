import bcrypt from 'bcryptjs';
import pg from 'pg';
import dotenv from 'dotenv';
import crypto from 'crypto';
dotenv.config();

const { Pool } = pg;
const pool = new Pool({
  host: process.env.DB_HOST, port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME, user: process.env.DB_USER,
  password: process.env.DB_PASSWORD, ssl: { rejectUnauthorized: false }
});

// Get parishes
const { rows: parishes } = await pool.query('SELECT id, name FROM parishes ORDER BY name LIMIT 5');
console.log('Parishes:', parishes.map(p => `${p.id}: ${p.name}`).join('\n'));

// Delete existing bishop and priests to avoid duplicates
await pool.query("DELETE FROM users WHERE role IN ('BISHOP', 'PRIEST')");
console.log('✓ Cleared old bishop/priests');

// Create Bishop
const bishopHash = await bcrypt.hash('bishop123', 12);
const { rows: bishop } = await pool.query(
  `INSERT INTO users (first_name, last_name, email, password_hash, role)
   VALUES ($1, $2, $3, $4, $5) RETURNING id, email, role`,
  ['Bishop', 'Emmanuel', 'bishop@diocese.com', bishopHash, 'BISHOP']
);
console.log('✓ Bishop created:', bishop[0]);

// Create a priest for each of the first 3 parishes
for (const parish of parishes.slice(0, 3)) {
  const token = crypto.randomBytes(32).toString('hex');
  const priestName = parish.name.includes(':') ? parish.name.split(':')[1].trim() : parish.name;
  await pool.query(
    `INSERT INTO users (first_name, last_name, role, parish_id, priest_token, token_generated_by)
     VALUES ($1, $2, $3, $4, $5, $6)`,
    ['Fr.', priestName, 'PRIEST', parish.id, token, 1]
  );
  console.log(`✓ Priest for "${parish.name}"\n  Token: ${token}`);
}

await pool.end();
