-- 001_revoke_priest_access.sql
-- Run this against your LIVE Render PostgreSQL database.
-- It revokes access for every existing PRIEST account immediately:
--   - is_active = false  -> blocks email/password login (login query filters on is_active = true)
--   - priest_token = NULL -> blocks token-based login (any leaked/shared token stops working)
--
-- This is intentionally non-destructive: it does NOT drop columns or change the
-- role CHECK constraint, so it's safe to run even before the new backend code
-- (which no longer allows role='PRIEST') is deployed. Historical priest rows
-- and their audit trail stay intact for record-keeping.

BEGIN;

UPDATE users
SET is_active = false,
    priest_token = NULL,
    updated_at = NOW()
WHERE role = 'PRIEST';

-- Sanity check: show what was affected
SELECT id, first_name, last_name, parish_id, is_active, priest_token
FROM users
WHERE role = 'PRIEST';

COMMIT;

-- OPTIONAL — only run this later, once you're sure nothing depends on it:
-- after you've deployed the new backend code and confirmed everything works,
-- you can permanently tighten the schema to match schema.sql:
--
--   ALTER TABLE users DROP CONSTRAINT users_role_check;
--   ALTER TABLE users ADD CONSTRAINT users_role_check CHECK (role IN ('ADMIN', 'BISHOP'));
--   ALTER TABLE users DROP COLUMN priest_token;
--   ALTER TABLE users DROP COLUMN token_generated_by;
--   ALTER TABLE users DROP COLUMN token_expires_at;
--   DROP INDEX IF EXISTS idx_users_priest_token;
--
-- Note: the DROP CONSTRAINT / ADD CONSTRAINT names above assume PostgreSQL's
-- default auto-generated constraint name. Run this first to confirm the real name:
--   SELECT conname FROM pg_constraint WHERE conrelid = 'users'::regclass AND contype = 'c';
