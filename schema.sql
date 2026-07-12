-- Diocesan Finance Management Database Schema
-- PostgreSQL

-- Users table (3 roles: ADMIN, BISHOP, PRIEST)
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255),
  password_hash VARCHAR(255),
  priest_token VARCHAR(255) UNIQUE,
  token_generated_by INTEGER,
  first_name VARCHAR(100),
  last_name VARCHAR(100),
  role VARCHAR(50) NOT NULL CHECK (role IN ('ADMIN', 'BISHOP', 'PRIEST')),
  parish_id INTEGER,
  is_active BOOLEAN DEFAULT true,
  token_expires_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Parishes table
CREATE TABLE parishes (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL UNIQUE,
  diocese VARCHAR(255),
  location VARCHAR(255),
  contact_email VARCHAR(255),
  contact_phone VARCHAR(20),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Add foreign key to users
ALTER TABLE users ADD CONSTRAINT fk_users_parish_id 
FOREIGN KEY (parish_id) REFERENCES parishes(id) ON DELETE SET NULL;

ALTER TABLE users ADD CONSTRAINT fk_users_token_generated_by
FOREIGN KEY (token_generated_by) REFERENCES users(id) ON DELETE SET NULL;

-- Collections (Admin creates these: First Collection, Second Collection, Tithe, Harvest, etc.)
CREATE TABLE collections (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  created_by INTEGER NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (created_by) REFERENCES users(id),
  UNIQUE(name)
);

-- Monthly Remittance Records
CREATE TABLE remittance_records (
  id SERIAL PRIMARY KEY,
  parish_id INTEGER NOT NULL,
  year INTEGER NOT NULL,
  month INTEGER NOT NULL CHECK (month >= 0 AND month <= 12), -- 0 = annual/National Collections
  uploaded_by INTEGER NOT NULL,
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (parish_id) REFERENCES parishes(id) ON DELETE CASCADE,
  FOREIGN KEY (uploaded_by) REFERENCES users(id),
  UNIQUE(parish_id, year, month)
);

-- Remittance Line Items (individual amounts per collection)
CREATE TABLE remittance_line_items (
  id SERIAL PRIMARY KEY,
  remittance_record_id INTEGER NOT NULL,
  collection_id INTEGER NOT NULL,
  amount DECIMAL(15, 2) NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (remittance_record_id) REFERENCES remittance_records(id) ON DELETE CASCADE,
  FOREIGN KEY (collection_id) REFERENCES collections(id),
  UNIQUE(remittance_record_id, collection_id)
);

-- Debtors Table (Track who owes what per collection per year)
CREATE TABLE debtors (
  id SERIAL PRIMARY KEY,
  parish_id INTEGER NOT NULL,
  collection_id INTEGER NOT NULL,
  year INTEGER NOT NULL,
  month INTEGER NOT NULL CHECK (month >= 0 AND month <= 12), -- 0 = annual/National Collections
  expected_amount DECIMAL(15, 2),
  actual_amount DECIMAL(15, 2) DEFAULT 0,
  balance DECIMAL(15, 2) DEFAULT 0,
  is_paid BOOLEAN DEFAULT false,
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (parish_id) REFERENCES parishes(id) ON DELETE CASCADE,
  FOREIGN KEY (collection_id) REFERENCES collections(id),
  UNIQUE(parish_id, collection_id, year, month)
);

-- Audit Log
CREATE TABLE audit_logs (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL,
  action VARCHAR(100) NOT NULL,
  entity_type VARCHAR(50),
  entity_id INTEGER,
  old_values JSONB,
  new_values JSONB,
  timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Indexes for performance
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_priest_token ON users(priest_token);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_remittance_records_parish_year_month ON remittance_records(parish_id, year, month);
CREATE INDEX idx_remittance_line_items_record ON remittance_line_items(remittance_record_id);
CREATE INDEX idx_debtors_parish_year ON debtors(parish_id, year);
CREATE INDEX idx_debtors_collection_year ON debtors(collection_id, year);
CREATE INDEX idx_audit_logs_user_timestamp ON audit_logs(user_id, timestamp);

-- Note: Default collections should be created via the application or manually:
-- INSERT INTO collections (name, description, created_by) VALUES
--   ('First Collection', 'Sunday first collection', 1),
--   ('Second Collection', 'Sunday second collection', 1),
--   ('Tithe', 'Church tithe', 1),
--   ('Harvest', 'Harvest thanksgiving', 1),
--   ('Special Offering', 'Special occasions/fundraisers', 1),
--   ('Donations', 'Direct donations', 1),
--   ('Other Income', 'Other income sources', 1);

-- View for missing remittance (debtors)
CREATE VIEW missing_remittances AS
SELECT 
  p.id as parish_id,
  p.name as parish_name,
  c.id as collection_id,
  c.name as collection_name,
  EXTRACT(YEAR FROM CURRENT_DATE) as year,
  EXTRACT(MONTH FROM CURRENT_DATE) as current_month,
  CASE WHEN rr.id IS NULL THEN true ELSE false END as is_missing
FROM parishes p
CROSS JOIN collections c
LEFT JOIN remittance_records rr ON p.id = rr.parish_id 
  AND rr.year = EXTRACT(YEAR FROM CURRENT_DATE)
  AND rr.month = EXTRACT(MONTH FROM CURRENT_DATE)
WHERE c.is_active = true
ORDER BY p.name, c.name;
