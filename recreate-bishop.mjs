import bcrypt from 'bcryptjs';
import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const { Pool } = pg;
const pool = new Pool({
  host: process.env.DB_HOST, port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME, user: process.env.DB_USER,
  password: process.env.DB_PASSWORD, ssl: { rejectUnauthorized: false }
});

const hash = await bcrypt.hash('bishop123', 12);
const { rows } = await pool.query(
  `INSERT INTO users (first_name, last_name, email, password_hash, role)
   VALUES ($1, $2, $3, $4, $5)
   ON CONFLICT (email) DO UPDATE SET password_hash = $4
   RETURNING id, email, role`,
  ['Bishop', 'Emmanuel', 'bishop@diocese.com', hash, 'BISHOP']
);
console.log('✓ Bishop ready:', rows[0]);
await pool.end();
