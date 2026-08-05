#!/bin/bash
set -e

REPO_DIR="${1:-.}"
cd "$REPO_DIR"

echo "╔══════════════════════════════════════════════════════════════╗"
echo "║  Diocesan Finance API — Harvest & Bazaar Fix                 ║"
echo "╚══════════════════════════════════════════════════════════════╝"
echo ""

# ─── Step 1: Diagnose ─────────────────────────────────────────────
echo "🔍 Step 1/6: Diagnosing current overlap..."
cat > /tmp/diagnose.mjs << 'DIAGEOF'
import { pool } from './src/db/pool.js';

async function diagnose() {
  try {
    const { rows } = await pool.query(`
      SELECT 
        rr.year,
        COUNT(DISTINCT rr.id) as record_count,
        COUNT(rli.id) as line_item_count,
        STRING_AGG(DISTINCT c.name, ', ') as collections
      FROM remittance_records rr
      JOIN remittance_line_items rli ON rr.id = rli.remittance_record_id
      JOIN collections c ON rli.collection_id = c.id
      WHERE rr.month = 0 
        AND (LOWER(c.name) LIKE '%harvest%' OR LOWER(c.name) LIKE '%bazaar%')
      GROUP BY rr.year
      ORDER BY rr.year
    `);
    
    if (rows.length === 0) {
      console.log('✅ No Harvest & Bazaar overlap found in National Collections');
    } else {
      console.log('⚠️  Found Harvest & Bazaar in National Collections:');
      for (const row of rows) {
        console.log(`   ${row.year}: ${row.line_item_count} line items across ${row.record_count} records`);
        console.log(`   Collections: ${row.collections}`);
      }
    }
  } catch (err) {
    console.error('❌ Diagnostic failed:', err.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

diagnose();
DIAGEOF
node /tmp/diagnose.mjs
echo ""

# ─── Step 2: Backup ───────────────────────────────────────────────
echo "💾 Step 2/6: Backing up source files..."
mkdir -p .backups
cp src/server.js .backups/server.js.bak 2>/dev/null || true
cp src/services/spreadsheetParser.js .backups/spreadsheetParser.js.bak 2>/dev/null || true
cp src/graphql/resolvers.js .backups/resolvers.js.bak 2>/dev/null || true
cp schema.sql .backups/schema.sql.bak 2>/dev/null || true
echo "   ✓ Backups saved to .backups/"
echo ""

# ─── Step 3: Create migration script ──────────────────────────────
echo "📝 Step 3/6: Creating migration script..."
cat > migrate-harvest-bazaar.mjs << 'MIGRATEEOF'
import { pool } from './src/db/pool.js';

async function migrate() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    console.log('🔧 Adding record_type column...');
    await client.query(`
      ALTER TABLE remittance_records 
      ADD COLUMN IF NOT EXISTS record_type VARCHAR(50) DEFAULT 'monthly'
    `);
    
    console.log('📌 Tagging existing national collections...');
    await client.query(`
      UPDATE remittance_records 
      SET record_type = 'national-collections' 
      WHERE month = 0 AND record_type = 'monthly'
    `);
    
    console.log('🗝️  Updating unique constraint...');
    await client.query(`
      ALTER TABLE remittance_records 
      DROP CONSTRAINT IF EXISTS remittance_records_parish_id_year_month_key
    `);
    await client.query(`
      ALTER TABLE remittance_records 
      ADD CONSTRAINT remittance_records_parish_id_year_month_record_type_key 
      UNIQUE (parish_id, year, month, record_type)
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_remittance_records_type 
      ON remittance_records(record_type)
    `);
    
    console.log('🔍 Finding Harvest & Bazaar line items...');
    const { rows: harvestLines } = await client.query(`
      SELECT rli.id as line_item_id, rr.parish_id, rr.year
      FROM remittance_line_items rli
      JOIN remittance_records rr ON rli.remittance_record_id = rr.id
      JOIN collections c ON rli.collection_id = c.id
      WHERE rr.record_type = 'national-collections'
        AND (LOWER(c.name) LIKE '%harvest%' OR LOWER(c.name) LIKE '%bazaar%')
    `);
    
    console.log(`   Found ${harvestLines.length} line items to migrate`);
    
    if (harvestLines.length === 0) {
      console.log('✅ Nothing to migrate');
      await client.query('COMMIT');
      return;
    }
    
    console.log('🌾 Creating Harvest & Bazaar records...');
    await client.query(`
      INSERT INTO remittance_records (parish_id, year, month, uploaded_by, record_type)
      SELECT DISTINCT rr.parish_id, rr.year, 0, rr.uploaded_by, 'harvest-bazaar'
      FROM remittance_records rr
      JOIN remittance_line_items rli ON rr.id = rli.remittance_record_id
      JOIN collections c ON rli.collection_id = c.id
      WHERE rr.record_type = 'national-collections'
        AND (LOWER(c.name) LIKE '%harvest%' OR LOWER(c.name) LIKE '%bazaar%')
      ON CONFLICT (parish_id, year, month, record_type) DO NOTHING
    `);
    
    console.log('🔄 Moving line items...');
    await client.query(`
      WITH harvest_lines AS (
        SELECT rli.id as line_item_id, rr.parish_id, rr.year
        FROM remittance_line_items rli
        JOIN remittance_records rr ON rli.remittance_record_id = rr.id
        JOIN collections c ON rli.collection_id = c.id
        WHERE rr.record_type = 'national-collections'
          AND (LOWER(c.name) LIKE '%harvest%' OR LOWER(c.name) LIKE '%bazaar%')
      ),
      hb_records AS (
        SELECT id, parish_id, year
        FROM remittance_records
        WHERE record_type = 'harvest-bazaar'
      )
      UPDATE remittance_line_items rli
      SET remittance_record_id = hb.id
      FROM harvest_lines hl
      JOIN hb_records hb ON hl.parish_id = hb.parish_id AND hl.year = hb.year
      WHERE rli.id = hl.line_item_id
    `);
    
    console.log('🧹 Cleaning up empty national collection records...');
    const { rowCount } = await client.query(`
      DELETE FROM remittance_records
      WHERE record_type = 'national-collections'
        AND id NOT IN (
          SELECT DISTINCT remittance_record_id 
          FROM remittance_line_items
          WHERE remittance_record_id IS NOT NULL
        )
    `);
    console.log(`   Deleted ${rowCount} empty national collection records`);
    
    await client.query('COMMIT');
    console.log('✅ Migration complete!');
    
    const { rows: summary } = await pool.query(`
      SELECT record_type, COUNT(*) as count
      FROM remittance_records
      WHERE month = 0
      GROUP BY record_type
    `);
    console.log('\n📊 Annual records summary:');
    for (const row of summary) {
      console.log(`   ${row.record_type}: ${row.count} records`);
    }
    
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ Migration failed:', err.message);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

migrate();
MIGRATEEOF
echo "   ✓ Created migrate-harvest-bazaar.mjs"
echo ""

# ─── Step 4: Run migration ────────────────────────────────────────
echo "🗄️  Step 4/6: Running database migration..."
node migrate-harvest-bazaar.mjs
echo ""

# ─── Step 5: Patch source code ────────────────────────────────────
echo "🔧 Step 5/6: Patching source code..."

# Patch server.js
cat > /tmp/patch-server.py << 'PYEOF'
import re

with open('src/server.js', 'r') as f:
    content = f.read()

# 1. Add BLOCKED_FROM_NATIONAL after YEARLY_FORMATS
old = "const YEARLY_FORMATS = ['harvest-bazaar', 'cathedraticum', 'project-sunday', 'seminary-collections'];"
new = """const YEARLY_FORMATS = ['harvest-bazaar', 'cathedraticum', 'project-sunday', 'seminary-collections'];
const BLOCKED_FROM_NATIONAL = ['harvest', 'bazaar'];"""
content = content.replace(old, new)

# 2. In /api/upload/national: add validation after rawRecords check
old = """    const rawRecords = await parseNationalCollections(req.file.path, parseInt(year), req.user.id);
    if (!rawRecords.length) {
      await fs.unlink(req.file.path).catch(() => {});
      return res.status(400).json({ error: 'No valid records found in file' });
    }"""
new = """    const rawRecords = await parseNationalCollections(req.file.path, parseInt(year), req.user.id);
    if (!rawRecords.length) {
      await fs.unlink(req.file.path).catch(() => {});
      return res.status(400).json({ error: 'No valid records found in file' });
    }

    // Reject Harvest & Bazaar from National Collections upload
    for (const record of rawRecords) {
      const lowerName = record.collectionName.toLowerCase();
      if (BLOCKED_FROM_NATIONAL.some(p => lowerName.includes(p))) {
        await fs.unlink(req.file.path).catch(() => {});
        return res.status(400).json({
          error: `Collection "${record.collectionName}" must be uploaded via /api/upload/horizontal with format=harvest-bazaar, not via National Collections.`
        });
      }
    }"""
content = content.replace(old, new)

# 3. In national upload: update existing check
old = """        const existing = await client.query(
          'SELECT id FROM remittance_records WHERE parish_id = $1 AND year = $2 AND month = 0',
          [parishId, parseInt(year)]
        );"""
new = """        const existing = await client.query(
          'SELECT id FROM remittance_records WHERE parish_id = $1 AND year = $2 AND month = 0 AND record_type = $3',
          [parishId, parseInt(year), 'national-collections']
        );"""
content = content.replace(old, new)

# 4. In national upload: update INSERT
old = """          const { rows } = await client.query(
            'INSERT INTO remittance_records (parish_id, year, month, uploaded_by) VALUES ($1, $2, 0, $3) RETURNING id',
            [parishId, parseInt(year), req.user.id]
          );"""
new = """          const { rows } = await client.query(
            'INSERT INTO remittance_records (parish_id, year, month, uploaded_by, record_type) VALUES ($1, $2, 0, $3, $4) RETURNING id',
            [parishId, parseInt(year), req.user.id, 'national-collections']
          );"""
content = content.replace(old, new)

# 5. In horizontal upload: determine recordType
old = """  let rawRecords;
  if (YEARLY_FORMATS.includes(format)) {
    if (!collectionName) return res.status(400).json({ error: 'Collection name is required' });
    rawRecords = await parseYearlyColumnsCSV(req.file.path, collectionName, req.user.id);
  } else {
    if (!year) return res.status(400).json({ error: 'Year is required' });
    rawRecords = await parseHorizontalCSV(req.file.path, parseInt(year), collectionName || 'General Collection', req.user.id);
  }"""
new = """  const recordType = YEARLY_FORMATS.includes(format) ? format : 'monthly';
  
  let rawRecords;
  if (YEARLY_FORMATS.includes(format)) {
    if (!collectionName) return res.status(400).json({ error: 'Collection name is required' });
    rawRecords = await parseYearlyColumnsCSV(req.file.path, collectionName, req.user.id);
  } else {
    if (!year) return res.status(400).json({ error: 'Year is required' });
    rawRecords = await parseHorizontalCSV(req.file.path, parseInt(year), collectionName || 'General Collection', req.user.id);
  }"""
content = content.replace(old, new)

# 6. In horizontal upload: update existing check
old = """        const existing = await client.query(
          'SELECT id FROM remittance_records WHERE parish_id = $1 AND year = $2 AND month = $3',
          [parishId, record.year, record.month]
        );"""
new = """        const existing = await client.query(
          'SELECT id FROM remittance_records WHERE parish_id = $1 AND year = $2 AND month = $3 AND record_type = $4',
          [parishId, record.year, record.month, recordType]
        );"""
content = content.replace(old, new)

# 7. In horizontal upload: update INSERT
old = """          const { rows } = await client.query(
            'INSERT INTO remittance_records (parish_id, year, month, uploaded_by) VALUES ($1, $2, $3, $4) RETURNING id',
            [parishId, record.year, record.month, req.user.id]
          );"""
new = """          const { rows } = await client.query(
            'INSERT INTO remittance_records (parish_id, year, month, uploaded_by, record_type) VALUES ($1, $2, $3, $4, $5) RETURNING id',
            [parishId, record.year, record.month, req.user.id, recordType]
          );"""
content = content.replace(old, new)

# 8. In standard /api/upload: pass recordType
old = """    const result = await processUpload(
      req.file.path,
      parseInt(year),
      fileType,
      req.user.id
    );"""
new = """    const result = await processUpload(
      req.file.path,
      parseInt(year),
      fileType,
      req.user.id,
      'monthly'
    );"""
content = content.replace(old, new)

with open('src/server.js', 'w') as f:
    f.write(content)

print('✓ Patched src/server.js')
PYEOF
python3 /tmp/patch-server.py

# Patch spreadsheetParser.js
cat > /tmp/patch-spreadsheet.py << 'PYEOF'
with open('src/services/spreadsheetParser.js', 'r') as f:
    content = f.read()

# 1. Update processUpload signature
old = "export async function processUpload(filePath, year, fileType = 'xlsx', uploadedByUserId) {"
new = "export async function processUpload(filePath, year, fileType = 'xlsx', uploadedByUserId, recordType = 'monthly') {"
content = content.replace(old, new)

# 2. Update duplicate check in processUpload
old = """      const existing = await client.query(
        'SELECT id FROM remittance_records WHERE parish_id = $1 AND year = $2 AND month = $3',
        [parishId, record.year, record.month]
      );"""
new = """      const existing = await client.query(
        'SELECT id FROM remittance_records WHERE parish_id = $1 AND year = $2 AND month = $3 AND record_type = $4',
        [parishId, record.year, record.month, recordType]
      );"""
content = content.replace(old, new)

# 3. Update INSERT in processUpload
old = """      const { rows } = await client.query(
        `INSERT INTO remittance_records (parish_id, year, month, uploaded_by)
        VALUES ($1, $2, $3, $4) RETURNING *`,
        [parishId, record.year, record.month, uploadedByUserId]
      );"""
new = """      const { rows } = await client.query(
        `INSERT INTO remittance_records (parish_id, year, month, uploaded_by, record_type)
        VALUES ($1, $2, $3, $4, $5) RETURNING *`,
        [parishId, record.year, record.month, uploadedByUserId, recordType]
      );"""
content = content.replace(old, new)

with open('src/services/spreadsheetParser.js', 'w') as f:
    f.write(content)

print('✓ Patched src/services/spreadsheetParser.js')
PYEOF
python3 /tmp/patch-spreadsheet.py

# Patch resolvers.js minimally
cat > /tmp/patch-resolvers.py << 'PYEOF'
with open('src/graphql/resolvers.js', 'r') as f:
    content = f.read()

# Add recordType to mapRemittanceRecord
old = """function mapRemittanceRecord(row) {
  if (!row) return null;
  return {
    id: row.id,
    year: row.year,
    month: row.month,
    monthName: MONTH_NAMES[row.month],
    totalAmount: parseFloat(row.total_amount || 0),
    notes: row.notes,
    createdAt: row.created_at?.toISOString(),
    // resolved by field resolvers:
    _parishId: row.parish_id,
    _uploadedById: row.uploaded_by,
  };
}"""
new = """function mapRemittanceRecord(row) {
  if (!row) return null;
  return {
    id: row.id,
    year: row.year,
    month: row.month,
    monthName: MONTH_NAMES[row.month],
    totalAmount: parseFloat(row.total_amount || 0),
    notes: row.notes,
    recordType: row.record_type || 'monthly',
    createdAt: row.created_at?.toISOString(),
    // resolved by field resolvers:
    _parishId: row.parish_id,
    _uploadedById: row.uploaded_by,
  };
}"""
content = content.replace(old, new)

with open('src/graphql/resolvers.js', 'w') as f:
    f.write(content)

print('✓ Patched src/graphql/resolvers.js')
PYEOF
python3 /tmp/patch-resolvers.py

echo "   ✓ All source files patched"
echo ""

# ─── Step 6: Update schema.sql for future deployments ─────────────
echo "📝 Step 6/6: Updating schema.sql..."
cat >> schema.sql << 'SCHEMAEOF'

-- ============================================
-- Harvest & Bazaar Separation (2026-08-05)
-- ============================================
ALTER TABLE remittance_records ADD COLUMN IF NOT EXISTS record_type VARCHAR(50) DEFAULT 'monthly';
ALTER TABLE remittance_records DROP CONSTRAINT IF EXISTS remittance_records_parish_id_year_month_key;
ALTER TABLE remittance_records ADD CONSTRAINT remittance_records_parish_id_year_month_record_type_key UNIQUE (parish_id, year, month, record_type);
CREATE INDEX IF NOT EXISTS idx_remittance_records_type ON remittance_records(record_type);
SCHEMAEOF
echo "   ✓ schema.sql updated"
echo ""

# ─── Summary ──────────────────────────────────────────────────────
echo "╔══════════════════════════════════════════════════════════════╗"
echo "║  ✅ FIX COMPLETE                                             ║"
echo "╚══════════════════════════════════════════════════════════════╝"
echo ""
echo "📋 What was done:"
echo "   1. Added record_type column to remittance_records"
echo "   2. Moved Harvest & Bazaar data out of National Collections"
echo "   3. Updated unique constraint to prevent future overlap"
echo "   4. Added upload validation to reject Harvest/Bazaar from /api/upload/national"
echo "   5. Updated /api/upload/horizontal to use format-specific record_type"
echo ""
echo "🚀 Next steps:"
echo "   1. Review changes: git diff"
echo "   2. Commit: git add -A && git commit -m 'fix: separate Harvest & Bazaar from National Collections'"
echo "   3. Push: git push origin main"
echo "   4. Your Render/Vercel deploy will auto-update"
echo ""
echo "📝 To upload Harvest & Bazaar in the future:"
echo "   Use POST /api/upload/horizontal with format=harvest-bazaar"
echo "   (NOT /api/upload/national)"
echo ""
echo "💾 Backups saved in .backups/ — remove when confident:"
echo "   rm -rf .backups/"
echo ""
