// src/services/spreadsheetParser.js
import ExcelJS from 'exceljs';
import { parse as csvParse } from 'csv-parse/sync';
import { pool } from '../db/pool.js';
import { readFile } from 'fs/promises';

/**
 * Parse remittance data from uploaded spreadsheet
 * 
 * Expected format:
 * Headers: Parish Name | First Collection | Second Collection | Tithe | Harvest | Special Offering | Donations | Other Income
 * 
 * Assumes file has multiple sheets, one per month (JAN, FEB, MAR, etc.)
 * Or single sheet with month column
 */

const MONTHS = [
  'JANUARY', 'FEBRUARY', 'MARCH', 'APRIL', 'MAY', 'JUNE',
  'JULY', 'AUGUST', 'SEPTEMBER', 'OCTOBER', 'NOVEMBER', 'DECEMBER'
];

const monthNameToNumber = (name) => {
  const index = MONTHS.indexOf(name.toUpperCase());
  return index !== -1 ? index + 1 : null;
};

export class SpreadsheetParser {
  constructor(filePath) {
    this.filePath = filePath;
    this.remittanceSources = {};
  }

  /**
   * Initialize remittance sources from database
   */
  async initializeRemittanceSources() {
const result = await pool.query('SELECT id, name FROM collections WHERE is_active = true');    result.rows.forEach(row => {
      this.remittanceSources[row.name.toLowerCase()] = row.id;
    });
  }

  /**
   * Parse Excel file with month-based sheets
   * Each sheet name = month (JAN, FEB, MAR, etc.)
   * Each row = parish with remittance amounts
   */
  async parseExcelByMonth(year) {
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(this.filePath);

    const records = [];

    // Process each sheet (month)
    workbook.eachSheet((worksheet) => {
      const sheetName = worksheet.name.trim().toUpperCase();
      const month = monthNameToNumber(sheetName);

      if (!month) {
        console.warn(`Skipping sheet "${sheetName}" - not a valid month`);
        return;
      }

      const data = this.parseSheet(worksheet);
      const monthRecords = this.processMonthData(data, year, month);
      records.push(...monthRecords);
    });

    return records;
  }

  /**
   * Parse Excel file with single sheet containing month column
   * Format: Parish Name | Month | First Collection | Second Collection | ...
   */
  async parseExcelSingleSheet(year) {
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(this.filePath);

    const worksheet = workbook.worksheets[0];
    const data = this.parseSheet(worksheet);
    const records = [];

    // Group by parish and month
    const grouped = {};

    data.forEach(row => {
      if (!row.parish_name || !row.month) return;

      const key = `${row.parish_name}_${row.month}`;
      if (!grouped[key]) {
        grouped[key] = {
          parishName: row.parish_name,
          month: monthNameToNumber(row.month),
          lineItems: []
        };
      }

      // Add all source amounts
      Object.entries(this.remittanceSources).forEach(([sourceName, sourceId]) => {
        const amount = row[sourceName.toLowerCase()] || 0;
        if (amount > 0) {
          grouped[key].lineItems.push({
            sourceId,
            amount: parseFloat(amount)
          });
        }
      });
    });

    // Convert to records with parish lookups
    for (const groupKey in grouped) {
      const group = grouped[groupKey];
      const record = await this.createRecord(group.parishName, year, group.month, group.lineItems);
      if (record) records.push(record);
    }

    return records;
  }

  /**
   * Parse CSV file
   */
  async parseCSV(year) {
    const content = await readFile(this.filePath, 'utf-8');

    const records = csvParse(content, {
      columns: true,
      skip_empty_lines: true,
      trim: true
    });

    const results = [];

    for (const record of records) {
      if (!record['Parish Name'] || !record['Month']) {
        continue;
      }

      const month = monthNameToNumber(record['Month']);
      if (!month) {
        console.warn(`Invalid month: ${record['Month']}`);
        continue;
      }

      const lineItems = [];

      // Extract amounts for each remittance source
      Object.entries(this.remittanceSources).forEach(([sourceName, sourceId]) => {
        const columnName = sourceName
          .split(' ')
          .map(word => word.charAt(0).toUpperCase() + word.slice(1))
          .join(' ');

        const amount = record[columnName];
        if (amount && parseFloat(amount) > 0) {
          lineItems.push({
            sourceId,
            amount: parseFloat(amount)
          });
        }
      });

      const remittanceRecord = await this.createRecord(
        record['Parish Name'],
        year,
        month,
        lineItems
      );

      if (remittanceRecord) {
        results.push(remittanceRecord);
      }
    }

    return results;
  }

  /**
   * Parse worksheet and extract data
   */
  parseSheet(worksheet) {
    const data = [];
    let headers = [];

    worksheet.eachRow((row, rowNumber) => {
      if (rowNumber === 1) {
        // Extract headers
        row.eachCell((cell) => {
          headers.push(cell.value?.toString().toLowerCase().trim() || '');
        });
      } else {
        // Extract data
        const rowData = {};
        row.eachCell((cell, colNumber) => {
          const header = headers[colNumber - 1];
          rowData[header] = cell.value;
        });
        data.push(rowData);
      }
    });

    return data;
  }

  /**
   * Process month data and extract remittance records
   */
  processMonthData(data, year, month) {
    const records = [];

    data.forEach(row => {
      const parishName = row['parish name'] || row['parish'];
      if (!parishName) return;

      const lineItems = [];

      // Extract amounts for each remittance source
      Object.entries(this.remittanceSources).forEach(([sourceName, sourceId]) => {
        const amount = row[sourceName.toLowerCase()];
        if (amount && parseFloat(amount) > 0) {
          lineItems.push({
            sourceId,
            amount: parseFloat(amount)
          });
        }
      });

      if (lineItems.length > 0) {
        records.push({
          parishName,
          year,
          month,
          lineItems
        });
      }
    });

    return records;
  }

  /**
   * Create database record for remittance
   */
  async createRecord(parishName, year, month, lineItems) {
    // Find parish by name
    const parishResult = await pool.query(
      'SELECT id FROM parishes WHERE LOWER(name) = LOWER($1)',
      [parishName.trim()]
    );

    if (parishResult.rows.length === 0) {
      throw new Error(`Parish not found: "${parishName}"`);
    }

    const parishId = parishResult.rows[0].id;

    // Check if record already exists
    const existing = await pool.query(
      'SELECT id FROM remittance_records WHERE parish_id = $1 AND year = $2 AND month = $3',
      [parishId, year, month]
    );

    if (existing.rows.length > 0) {
      console.warn(`Record already exists for ${parishName} - ${year}/${month}`);
      return null;
    }

    return {
      parishId,
      year,
      month,
      lineItems
    };
  }

  /**
   * Validate parsed records before insertion
   */
  validate(records) {
    const errors = [];

    records.forEach((record, index) => {
      if (!record.parishId) {
        errors.push(`Record ${index}: Missing parish`);
      }
      if (!record.year || record.year < 2000 || record.year > 2100) {
        errors.push(`Record ${index}: Invalid year`);
      }
      if (!record.month || record.month < 1 || record.month > 12) {
        errors.push(`Record ${index}: Invalid month`);
      }
      if (!Array.isArray(record.lineItems) || record.lineItems.length === 0) {
        errors.push(`Record ${index}: No line items`);
      }

      record.lineItems.forEach((item, itemIndex) => {
        if (!item.sourceId) {
          errors.push(`Record ${index}, Item ${itemIndex}: Missing source`);
        }
        if (!item.amount || item.amount <= 0) {
          errors.push(`Record ${index}, Item ${itemIndex}: Invalid amount`);
        }
      });
    });

    return {
      isValid: errors.length === 0,
      errors
    };
  }
}

/**
 * Process upload and save to database
 */
export async function processUpload(filePath, year, fileType = 'xlsx', uploadedByUserId) {
  const parser = new SpreadsheetParser(filePath);
  await parser.initializeRemittanceSources();

  let records = [];

  if (fileType === 'xlsx') {
    records = await parser.parseExcelByMonth(year);
  } else if (fileType === 'csv') {
    records = await parser.parseCSV(year);
  } else {
    throw new Error('Unsupported file type');
  }

  // Validate
  const validation = parser.validate(records);
  if (!validation.isValid) {
    throw new Error(`Validation failed: ${validation.errors.join('; ')}`);
  }

  // Insert into database
  const client = await pool.connect();
  const savedRecords = [];

  try {
    await client.query('BEGIN');

    for (const record of records) {
      const recordResult = await client.query(
        `INSERT INTO remittance_records (parish_id, year, month, uploaded_by)
         VALUES ($1, $2, $3, $4)
         RETURNING *`,
        [record.parishId, record.year, record.month, uploadedByUserId]
      );

      const remittanceRecord = recordResult.rows[0];

      // Insert line items
      for (const item of record.lineItems) {
        await client.query(
          `INSERT INTO remittance_line_items (remittance_record_id, remittance_source_id, amount)
           VALUES ($1, $2, $3)`,
          [remittanceRecord.id, item.sourceId, item.amount]
        );
      }

      savedRecords.push(remittanceRecord);
    }

    await client.query('COMMIT');
    return savedRecords;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}
