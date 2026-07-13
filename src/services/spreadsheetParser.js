// src/services/spreadsheetParser.js
import ExcelJS from 'exceljs';
import { parse as csvParse } from 'csv-parse/sync';
import { pool } from '../db/pool.js';
import { readFile } from 'fs/promises';

const MONTHS = [
  'JANUARY', 'FEBRUARY', 'MARCH', 'APRIL', 'MAY', 'JUNE',
  'JULY', 'AUGUST', 'SEPTEMBER', 'OCTOBER', 'NOVEMBER', 'DECEMBER'
];

const monthNameToNumber = (name) => {
  const index = MONTHS.indexOf(name.toUpperCase().trim());
  return index !== -1 ? index + 1 : null;
};

// Month abbreviation to number
const MONTH_ABBREVS = {
  'jan': 1, 'feb': 2, 'mar': 3, 'apr': 4, 'may': 5, 'jun': 6,
  'jul': 7, 'aug': 8, 'sep': 9, 'oct': 10, 'nov': 11, 'dec': 12
};

// Parse horizontal CSV (one row per parish, columns are months)
// Format: S/N | NAME OF PARISH | JAN | FEB | ... | DEC | TOTAL
export async function parseHorizontalCSV(filePath, year, collectionName, uploadedByUserId) {
  const content = await readFile(filePath, 'utf-8');

  // Try to detect delimiter
  const firstLine = content.split('\n')[0];
  const delimiter = firstLine.includes('\t') ? '\t' : ',';

  const rows = csvParse(content, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
    delimiter,
    cast: false,
  });

  if (rows.length === 0) throw new Error('CSV file is empty or could not be parsed');

  // Find the parish name column (case-insensitive)
  const headers = Object.keys(rows[0]);
  const parishCol = headers.find(h =>
    h.toLowerCase().includes('parish') || h.toLowerCase().includes('name')
  );

  if (!parishCol) throw new Error(`Could not find parish name column. Headers found: ${headers.join(', ')}`);

  // Find month columns
  const monthCols = {};
  headers.forEach(h => {
    const key = h.toLowerCase().trim();
    if (MONTH_ABBREVS[key]) monthCols[h] = MONTH_ABBREVS[key];
  });

  if (Object.keys(monthCols).length === 0) {
    throw new Error(`No month columns found. Headers: ${headers.join(', ')}`);
  }

  // Skip columns
  const skipCols = new Set(['s/n', 'sn', 'no', 'total', '#', parishCol.toLowerCase()]);

  const records = [];

  for (const row of rows) {
    const parishName = row[parishCol]?.toString().trim();
    if (!parishName || parishName.toLowerCase() === 'total') continue;

    for (const [col, month] of Object.entries(monthCols)) {
      const rawValue = row[col]?.toString().replace(/,/g, '').trim();
      const amount = parseFloat(rawValue);
      if (!amount || amount <= 0) continue;

      records.push({
        parishName,
        year,
        month,
        collectionName: collectionName || 'General Collection',
        amount,
      });
    }
  }

  return records;
}


export class SpreadsheetParser {
  constructor(filePath) {
    this.filePath = filePath;
    this.collections = {}; // name -> id
  }

  async initializeCollections() {
    const result = await pool.query('SELECT id, name FROM collections WHERE is_active = true');
    result.rows.forEach(row => {
      this.collections[row.name.toLowerCase().trim()] = row.id;
    });
  }

  // Auto-create a parish if it doesn't exist. Also auto-creates a priest
  // login token for it, using the parish name (matches manual creation).
  async ensureParish(name, createdByUserId) {
    const trimmed = name.trim();
    const existing = await pool.query(
      'SELECT id FROM parishes WHERE LOWER(name) = LOWER($1)', [trimmed]
    );
    if (existing.rows.length > 0) {
      return { id: existing.rows[0].id, created: false };
    }
    const inserted = await pool.query(
      'INSERT INTO parishes (name, diocese) VALUES ($1, $2) RETURNING id',
      [trimmed, 'Catholic Diocese of Aguleri']
    );
    const parishId = inserted.rows[0].id;
    const { ensurePriestTokenForParish } = await import('../utils/priestTokens.js');
    await ensurePriestTokenForParish(parishId, trimmed, createdByUserId);
    return { id: parishId, created: true };
  }

  // Auto-create a collection if it doesn't exist
  async ensureCollection(name, createdByUserId) {
    const key = name.toLowerCase().trim();
    if (this.collections[key]) {
      return { id: this.collections[key], created: false };
    }
    const existing = await pool.query(
      'SELECT id FROM collections WHERE LOWER(name) = LOWER($1)', [name.trim()]
    );
    if (existing.rows.length > 0) {
      this.collections[key] = existing.rows[0].id;
      return { id: existing.rows[0].id, created: false };
    }
    const inserted = await pool.query(
      'INSERT INTO collections (name, created_by) VALUES ($1, $2) RETURNING id',
      [name.trim(), createdByUserId]
    );
    this.collections[key] = inserted.rows[0].id;
    return { id: inserted.rows[0].id, created: true };
  }

  // Parse Excel with month-based sheets
  async parseExcelByMonth(year, uploadedByUserId) {
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(this.filePath);

    const records = [];

    for (const worksheet of workbook.worksheets) {
      const sheetName = worksheet.name.trim().toUpperCase();
      const month = monthNameToNumber(sheetName);

      if (!month) {
        console.warn(`Skipping sheet "${sheetName}" - not a valid month name`);
        continue;
      }

      const sheetRecords = await this.parseSheet(worksheet, year, month, uploadedByUserId);
      records.push(...sheetRecords);
    }

    return records;
  }

  // Parse a single worksheet
  async parseSheet(worksheet, year, month, uploadedByUserId) {
    const records = [];
    let headers = [];

    const rows = [];
    worksheet.eachRow((row, rowNumber) => {
      if (rowNumber === 1) {
        row.eachCell((cell) => {
          headers.push(cell.value?.toString().toLowerCase().trim() || '');
        });
      } else {
        const rowData = {};
        row.eachCell((cell, colNumber) => {
          const header = headers[colNumber - 1];
          if (header) rowData[header] = cell.value;
        });
        if (Object.values(rowData).some(v => v)) rows.push(rowData);
      }
    });

    for (const row of rows) {
      const parishName = row['parish name'] || row['parish'] || row['name'];
      if (!parishName || typeof parishName !== 'string' || !parishName.trim()) continue;

      const lineItems = [];

      for (const [header, value] of Object.entries(row)) {
        if (header === 'parish name' || header === 'parish' || header === 'name') continue;
        const amount = parseFloat(value);
        if (!amount || amount <= 0) continue;

        // Auto-create collection if needed
        const { id: collectionId, created } = await this.ensureCollection(header, uploadedByUserId);
        lineItems.push({ collectionId, collectionName: header, amount, collectionCreated: created });
      }

      if (lineItems.length > 0) {
        records.push({ parishName: parishName.trim(), year, month, lineItems });
      }
    }

    return records;
  }

  // Parse CSV
  async parseCSV(year, uploadedByUserId) {
    const content = await readFile(this.filePath, 'utf-8');
    const rows = csvParse(content, { columns: true, skip_empty_lines: true, trim: true });
    const records = [];

    for (const row of rows) {
      const parishName = row['Parish Name'] || row['Parish'] || row['Name'];
      if (!parishName) continue;

      const monthStr = row['Month'];
      const month = monthStr ? monthNameToNumber(monthStr) : null;
      if (!month) continue;

      const lineItems = [];
      for (const [key, value] of Object.entries(row)) {
        if (['Parish Name', 'Parish', 'Name', 'Month'].includes(key)) continue;
        const amount = parseFloat(value);
        if (!amount || amount <= 0) continue;
        const { id: collectionId, created } = await this.ensureCollection(key, uploadedByUserId);
        lineItems.push({ collectionId, collectionName: key, amount, collectionCreated: created });
      }

      if (lineItems.length > 0) {
        records.push({ parishName: parishName.trim(), year, month, lineItems });
      }
    }

    return records;
  }
}


// Parse National Collections CSV
// Format: rows = parishes, columns = collection types, values = annual amounts
export async function parseNationalCollections(filePath, year, uploadedByUserId) {
  const content = await readFile(filePath, 'utf-8');
  const firstLine = content.split('\n')[0];
  const delimiter = firstLine.includes('\t') ? '\t' : ',';

  const rows = csvParse(content, {
    columns: true, skip_empty_lines: true, trim: true, delimiter, cast: false
  });

  if (rows.length === 0) throw new Error('File is empty');

  const headers = Object.keys(rows[0]);
  const parishCol = headers.find(h => h.toLowerCase().includes('parish') || h.toLowerCase().includes('name'));
  if (!parishCol) throw new Error('Could not find parish name column');

  // Skip columns: S/N, serial numbers, totals
  const skipCols = new Set(['s/n', 'sn', 'no', '#', 'sum total', 'total', parishCol.toLowerCase()]);
  const collectionCols = headers.filter(h => !skipCols.has(h.toLowerCase().trim()));

  const records = [];

  for (const row of rows) {
    const parishName = row[parishCol]?.toString().trim();
    if (!parishName || parishName.toUpperCase() === 'TOTAL') continue;

    for (const col of collectionCols) {
      const rawValue = row[col]?.toString().replace(/,/g, '').trim();
      const amount = parseFloat(rawValue);
      if (!amount || amount <= 0) continue;

      records.push({
        parishName,
        year,
        collectionName: col.trim(),
        amount,
      });
    }
  }

  return records;
}

// ─── Preview (dry run — no DB writes) ────────────────────────────────────────
export async function previewUpload(filePath, year, fileType = 'xlsx', uploadedByUserId) {
  const parser = new SpreadsheetParser(filePath);
  await parser.initializeCollections();

  // Get existing parishes
  const { rows: existingParishes } = await pool.query('SELECT id, name FROM parishes');
  const parishMap = {};
  existingParishes.forEach(p => { parishMap[p.name.toLowerCase().trim()] = p.id; });

  // Get existing collections
  const { rows: existingCollections } = await pool.query('SELECT id, name FROM collections');
  const collectionMap = {};
  existingCollections.forEach(c => { collectionMap[c.name.toLowerCase().trim()] = c.id; });

  // Parse file without writing
  let rawRecords = [];
  if (fileType === 'xlsx') {
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(filePath);
    for (const worksheet of workbook.worksheets) {
      const sheetName = worksheet.name.trim().toUpperCase();
      const month = monthNameToNumber(sheetName);
      if (!month) continue;

      let headers = [];
      worksheet.eachRow((row, rowNumber) => {
        if (rowNumber === 1) {
          row.eachCell(cell => headers.push(cell.value?.toString().toLowerCase().trim() || ''));
        } else {
          const rowData = {};
          row.eachCell((cell, colNumber) => {
            if (headers[colNumber - 1]) rowData[headers[colNumber - 1]] = cell.value;
          });
          if (Object.values(rowData).some(v => v)) rawRecords.push({ ...rowData, _month: month, _year: year });
        }
      });
    }
  }

  const preview = {
    totalRows: 0,
    toInsert: [],
    toSkip: [],
    newParishes: [],
    newCollections: [],
    errors: [],
  };

  const seenParishes = new Set();
  const seenCollections = new Set();

  for (const row of rawRecords) {
    const parishName = (row['parish name'] || row['parish'] || row['name'] || '').trim();
    if (!parishName) continue;

    preview.totalRows++;
    const month = row._month;
    const parishKey = parishName.toLowerCase();

    // Track new parishes
    if (!parishMap[parishKey] && !seenParishes.has(parishKey)) {
      preview.newParishes.push(parishName);
      seenParishes.add(parishKey);
    }

    // Check for duplicate
    const isDuplicate = parishMap[parishKey] && await pool.query(
      'SELECT id FROM remittance_records WHERE parish_id = $1 AND year = $2 AND month = $3',
      [parishMap[parishKey], year, month]
    ).then(r => r.rows.length > 0);

    if (isDuplicate) {
      preview.toSkip.push({ parishName, month, year, reason: 'Record already exists' });
      continue;
    }

    // Track new collections
    for (const [key, value] of Object.entries(row)) {
      if (['parish name', 'parish', 'name', '_month', '_year'].includes(key)) continue;
      const amount = parseFloat(value);
      if (!amount || amount <= 0) continue;
      if (!collectionMap[key] && !seenCollections.has(key)) {
        preview.newCollections.push(key);
        seenCollections.add(key);
      }
    }

    preview.toInsert.push({ parishName, month, year });
  }

  return preview;
}

// ─── Process upload (writes to DB) ───────────────────────────────────────────
export async function processUpload(filePath, year, fileType = 'xlsx', uploadedByUserId) {
  const parser = new SpreadsheetParser(filePath);
  await parser.initializeCollections();

  const summary = {
    inserted: 0,
    skipped: 0,
    newParishes: [],
    newCollections: [],
    errors: [],
  };

  let rawRecords = [];
  if (fileType === 'xlsx') {
    rawRecords = await parser.parseExcelByMonth(year, uploadedByUserId);
  } else if (fileType === 'csv') {
    rawRecords = await parser.parseCSV(year, uploadedByUserId);
  } else {
    throw new Error('Unsupported file type');
  }

  const client = await pool.connect();
  const savedRecords = [];

  try {
    await client.query('BEGIN');

    for (const record of rawRecords) {
      // Auto-create parish
      const { id: parishId, created: parishCreated } = await parser.ensureParish(record.parishName);
      if (parishCreated) summary.newParishes.push(record.parishName);

      // Check for duplicate
      const existing = await client.query(
        'SELECT id FROM remittance_records WHERE parish_id = $1 AND year = $2 AND month = $3',
        [parishId, record.year, record.month]
      );
      if (existing.rows.length > 0) {
        summary.skipped++;
        continue;
      }

      // Insert remittance record
      const { rows } = await client.query(
        `INSERT INTO remittance_records (parish_id, year, month, uploaded_by)
         VALUES ($1, $2, $3, $4) RETURNING *`,
        [parishId, record.year, record.month, uploadedByUserId]
      );
      const remittanceRecord = rows[0];

      // Insert line items
      for (const item of record.lineItems) {
        if (item.collectionCreated) {
          summary.newCollections.push(item.collectionName);
        }
        await client.query(
          `INSERT INTO remittance_line_items (remittance_record_id, collection_id, amount)
           VALUES ($1, $2, $3)`,
          [remittanceRecord.id, item.collectionId, item.amount]
        );
      }

      savedRecords.push(remittanceRecord);
      summary.inserted++;
    }

    await client.query('COMMIT');

    // Auto-generate debtors after successful upload
    await generateDebtors(year, uploadedByUserId);

    // Deduplicate new parishes and collections in summary
    summary.newParishes = [...new Set(summary.newParishes)];
    summary.newCollections = [...new Set(summary.newCollections)];

    return { records: savedRecords, summary };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

// ─── Auto-generate debtors ───────────────────────────────────────────────────
export async function generateDebtors(year, uploadedByUserId) {
  const client = await pool.connect();
  try {
    const { rows: parishes } = await client.query('SELECT id FROM parishes');
    const { rows: collections } = await client.query('SELECT id FROM collections WHERE is_active = true');

    if (parishes.length === 0 || collections.length === 0) return;

    const currentMonth = new Date().getFullYear() === parseInt(year) ? new Date().getMonth() : 12;

    const { rows: allRecords } = await client.query(
      `SELECT rr.id, rr.parish_id, rr.month,
              rli.collection_id, COALESCE(rli.amount, 0) as amount
       FROM remittance_records rr
       LEFT JOIN remittance_line_items rli ON rr.id = rli.remittance_record_id
       WHERE rr.year = $1`,
      [year]
    );

    const lookup = {};
    const annualCollectionIds = new Set();
    for (const row of allRecords) {
      if (!lookup[row.parish_id]) lookup[row.parish_id] = {};
      if (!lookup[row.parish_id][row.month]) lookup[row.parish_id][row.month] = {};
      if (row.collection_id) {
        lookup[row.parish_id][row.month][row.collection_id] = parseFloat(row.amount || 0);
        if (row.month === 0) annualCollectionIds.add(row.collection_id);
      }
    }

    const values = [];

    for (const parish of parishes) {
      for (let month = 1; month <= currentMonth; month++) {
        for (const collection of collections) {
          const amount = lookup[parish.id]?.[month]?.[collection.id] || 0;
          const isPaid = amount > 0;
          values.push([parish.id, collection.id, year, month, amount, amount, 0, isPaid]);
        }
      }
    }

    for (const parish of parishes) {
      for (const collectionId of annualCollectionIds) {
        const amount = lookup[parish.id]?.[0]?.[collectionId] || 0;
        const isPaid = amount > 0;
        values.push([parish.id, collectionId, year, 0, amount, amount, 0, isPaid]);
      }
    }

    if (values.length === 0) return;

    await client.query('BEGIN');
    const chunkSize = 100;
    for (let i = 0; i < values.length; i += chunkSize) {
      const chunk = values.slice(i, i + chunkSize);
      const placeholders = chunk.map((_, idx) => {
        const base = idx * 8;
        return `($${base+1},$${base+2},$${base+3},$${base+4},$${base+5},$${base+6},$${base+7},$${base+8})`;
      }).join(',');
      const flat = chunk.flat();
      await client.query(
        `INSERT INTO debtors (parish_id, collection_id, year, month, expected_amount, actual_amount, balance, is_paid)
         VALUES ${placeholders}
         ON CONFLICT (parish_id, collection_id, year, month)
         DO UPDATE SET
           actual_amount = EXCLUDED.actual_amount,
           balance = EXCLUDED.expected_amount - EXCLUDED.actual_amount,
           is_paid = EXCLUDED.is_paid,
           updated_at = NOW()`,
        flat
      );
    }
    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    console.error('generateDebtors error:', err.message);
  } finally {
    client.release();
  }
}
