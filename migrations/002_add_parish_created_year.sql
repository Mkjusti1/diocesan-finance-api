-- Add created_year to parishes for year-based filtering
ALTER TABLE parishes ADD COLUMN IF NOT EXISTS created_year INTEGER DEFAULT EXTRACT(YEAR FROM CURRENT_TIMESTAMP);

-- Backfill existing parishes with their creation year from created_at
UPDATE parishes SET created_year = EXTRACT(YEAR FROM created_at) WHERE created_year IS NULL;

-- Add index for fast filtering
CREATE INDEX IF NOT EXISTS idx_parishes_created_year ON parishes(created_year);
