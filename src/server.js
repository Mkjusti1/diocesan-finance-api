// src/server.js
// Apollo GraphQL Server with Express, Authentication, and File Upload
import express from 'express';
import { ApolloServer } from 'apollo-server-express';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
import { promises as fs } from 'fs';
import cors from 'cors';
import multer from 'multer';
import { typeDefs } from './graphql/typeDefs.js';
import { resolvers } from './graphql/resolvers.js';
import { processUpload, previewUpload, parseHorizontalCSV, parseNationalCollections, SpreadsheetParser, generateDebtors } from './services/spreadsheetParser.js';
import { pool } from './db/pool.js';

dotenv.config();

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';
const PORT = process.env.PORT || 4000;
const NODE_ENV = process.env.NODE_ENV || 'development';

// Configure multer for file uploads
const upload = multer({
  dest: '/tmp/uploads/',
  fileFilter: (req, file, cb) => {
    const allowed = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel',
      'application/octet-stream',
      'text/csv',
      'application/csv'
    ];
    console.log('Upload mimetype:', file.mimetype); if (allowed.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Only XLSX and CSV files are allowed'));
    }
  },
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB
});

// Authentication middleware
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'No token provided' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid token' });
    }
    req.user = user;
    next();
  });
};

// Context function for GraphQL
async function getContext({ req }) {
  // Get token from headers
  const authHeader = req?.headers?.authorization;
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return { user: null };
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    return { user: decoded };
  } catch (error) {
    return { user: null };
  }
}

// Initialize Apollo Server
const apolloServer = new ApolloServer({
  typeDefs,
  resolvers,
  context: getContext,
  formatError: (error) => {
    console.error('GraphQL Error:', error);
    return {
      message: error.message,
      extensions: {
        code: error.extensions?.code || 'INTERNAL_SERVER_ERROR'
      }
    };
  }
});

// Create Express app
const app = express();

// Middleware
app.use(cors({ origin: process.env.ALLOWED_ORIGINS ? process.env.ALLOWED_ORIGINS.split(',') : '*', credentials: true }));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));

// ============================================
// REST ENDPOINTS
// ============================================

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    environment: NODE_ENV
  });
});


// REST endpoint for upload preview (dry run)
app.post('/api/upload/preview', authenticateToken, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
    if (req.user.role !== 'ADMIN') return res.status(403).json({ error: 'Only admins can upload files' });

    const { year } = req.body;
    if (!year) return res.status(400).json({ error: 'Year is required' });

    const fileExt = req.file.originalname.split('.').pop().toLowerCase();
    const fileType = fileExt === 'xlsx' ? 'xlsx' : 'csv';

    const preview = await previewUpload(req.file.path, parseInt(year), fileType, req.user.id);

    await fs.unlink(req.file.path).catch(() => {});
    res.json({ success: true, preview });
  } catch (error) {
    if (req.file) await fs.unlink(req.file.path).catch(() => {});
    res.status(400).json({ error: error.message || 'Preview failed' });
  }
});


// Upload horizontal CSV (one row per parish, columns are months)
app.post('/api/upload/horizontal', authenticateToken, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
    if (req.user.role !== 'ADMIN') return res.status(403).json({ error: 'Only admins can upload files' });

    const { year, collectionName } = req.body;
    if (!year) return res.status(400).json({ error: 'Year is required' });

    // Parse the horizontal CSV
    const rawRecords = await parseHorizontalCSV(
      req.file.path, parseInt(year), collectionName || 'General Collection', req.user.id
    );

    if (rawRecords.length === 0) {
      await fs.unlink(req.file.path).catch(() => {});
      return res.status(400).json({ error: 'No valid records found in file. Check that your CSV has month columns (JAN, FEB...) and a parish name column.' });
    }

    // Use already-imported pool and parser — no dynamic imports
    const parser = new SpreadsheetParser(req.file.path);
    await parser.initializeCollections();

    // Pre-resolve all parishes and collections outside the transaction
    // to avoid holding the transaction open too long
    const parishCache = {};
    const collectionCache = {};
    const summary = { inserted: 0, skipped: 0, newParishes: [], newCollections: [] };

    for (const record of rawRecords) {
      if (!parishCache[record.parishName]) {
        const result = await parser.ensureParish(record.parishName);
        parishCache[record.parishName] = result.id;
        if (result.created && !summary.newParishes.includes(record.parishName)) {
          summary.newParishes.push(record.parishName);
        }
      }
      if (!collectionCache[record.collectionName]) {
        const result = await parser.ensureCollection(record.collectionName, req.user.id);
        collectionCache[record.collectionName] = result.id;
        if (result.created && !summary.newCollections.includes(record.collectionName)) {
          summary.newCollections.push(record.collectionName);
        }
      }
    }

    // Now insert in batches using a single client
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      for (const record of rawRecords) {
        const parishId = parishCache[record.parishName];
        const collectionId = collectionCache[record.collectionName];

        // Check for existing record
        const existing = await client.query(
          'SELECT id FROM remittance_records WHERE parish_id = $1 AND year = $2 AND month = $3',
          [parishId, record.year, record.month]
        );

        let remittanceId;

        if (existing.rows.length > 0) {
          remittanceId = existing.rows[0].id;
          // Check if line item already exists
          const existingLine = await client.query(
            'SELECT id FROM remittance_line_items WHERE remittance_record_id = $1 AND collection_id = $2',
            [remittanceId, collectionId]
          );
          if (existingLine.rows.length > 0) {
            summary.skipped++;
            continue;
          }
        } else {
          // Insert new remittance record
          const { rows } = await client.query(
            'INSERT INTO remittance_records (parish_id, year, month, uploaded_by) VALUES ($1, $2, $3, $4) RETURNING id',
            [parishId, record.year, record.month, req.user.id]
          );
          remittanceId = rows[0].id;
        }

        // Insert line item
        await client.query(
          'INSERT INTO remittance_line_items (remittance_record_id, collection_id, amount) VALUES ($1, $2, $3)',
          [remittanceId, collectionId, record.amount]
        );
        summary.inserted++;
      }

      await client.query('COMMIT');
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }

    // Generate debtors after releasing the client
    await generateDebtors(parseInt(year), req.user.id);
    await fs.unlink(req.file.path).catch(() => {});

    res.json({ success: true, summary, message: `Inserted ${summary.inserted} records` });
  } catch (error) {
    if (req.file) await fs.unlink(req.file.path).catch(() => {});
    console.error('Horizontal upload error:', error);
    res.status(400).json({ error: error.message || 'Upload failed' });
  }
});


// Upload National Collections CSV (rows = parishes, columns = collection types)
app.post('/api/upload/national', authenticateToken, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
    if (req.user.role !== 'ADMIN') return res.status(403).json({ error: 'Admins only' });

    const { year } = req.body;
    if (!year) return res.status(400).json({ error: 'Year is required' });

    const rawRecords = await parseNationalCollections(req.file.path, parseInt(year), req.user.id);
    if (!rawRecords.length) {
      await fs.unlink(req.file.path).catch(() => {});
      return res.status(400).json({ error: 'No valid records found in file' });
    }

    const parser = new SpreadsheetParser(req.file.path);
    await parser.initializeCollections();

    // Pre-resolve parishes and collections
    const parishCache = {};
    const collectionCache = {};
    const summary = { inserted: 0, skipped: 0, newParishes: [], newCollections: [] };

    for (const record of rawRecords) {
      if (!parishCache[record.parishName]) {
        const result = await parser.ensureParish(record.parishName);
        parishCache[record.parishName] = result.id;
        if (result.created && !summary.newParishes.includes(record.parishName))
          summary.newParishes.push(record.parishName);
      }
      if (!collectionCache[record.collectionName]) {
        const result = await parser.ensureCollection(record.collectionName, req.user.id);
        collectionCache[record.collectionName] = result.id;
        if (result.created && !summary.newCollections.includes(record.collectionName))
          summary.newCollections.push(record.collectionName);
      }
    }

    // For national collections: one remittance record per parish per year (month = 0 means annual)
    // We use month = 13 as a sentinel for "annual/full year" records
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Group by parish
      const byParish = {};
      for (const r of rawRecords) {
        if (!byParish[r.parishName]) byParish[r.parishName] = [];
        byParish[r.parishName].push(r);
      }

      for (const [parishName, items] of Object.entries(byParish)) {
        const parishId = parishCache[parishName];

        // Check for existing annual record (month = 13)
        const existing = await client.query(
          'SELECT id FROM remittance_records WHERE parish_id = $1 AND year = $2 AND month = 0',
          [parishId, parseInt(year)]
        );

        let remittanceId;
        if (existing.rows.length > 0) {
          remittanceId = existing.rows[0].id;
        } else {
          const { rows } = await client.query(
            'INSERT INTO remittance_records (parish_id, year, month, uploaded_by) VALUES ($1, $2, 0, $3) RETURNING id',
            [parishId, parseInt(year), req.user.id]
          );
          remittanceId = rows[0].id;
        }

        for (const item of items) {
          const collectionId = collectionCache[item.collectionName];
          const existingLine = await client.query(
            'SELECT id FROM remittance_line_items WHERE remittance_record_id = $1 AND collection_id = $2',
            [remittanceId, collectionId]
          );
          if (existingLine.rows.length === 0) {
            await client.query(
              'INSERT INTO remittance_line_items (remittance_record_id, collection_id, amount) VALUES ($1, $2, $3)',
              [remittanceId, collectionId, item.amount]
            );
            summary.inserted++;
          } else {
            summary.skipped++;
          }
        }
      }

      await client.query('COMMIT');
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }

    await fs.unlink(req.file.path).catch(() => {});
    res.json({ success: true, summary, message: `Inserted ${summary.inserted} line items` });
  } catch (error) {
    if (req.file) await fs.unlink(req.file.path).catch(() => {});
    console.error('National upload error:', error);
    res.status(400).json({ error: error.message || 'Upload failed' });
  }
});

// REST endpoint for file upload
app.post('/api/upload', authenticateToken, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const { year, parishId } = req.body;

    if (!year) {
      return res.status(400).json({ error: 'Year is required' });
    }

    // Verify user is admin
    if (req.user.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Only admins can upload files' });
    }

    // Determine file type
    const fileExt = req.file.originalname.split('.').pop().toLowerCase(); const fileType = fileExt === 'xlsx' ? 'xlsx' : 'csv';

    // Process upload
    const result = await processUpload(
      req.file.path,
      parseInt(year),
      fileType,
      req.user.id
    );

    // Clean up uploaded file
    
    await fs.unlink(req.file.path);

    res.json({
      success: true,
      message: `Successfully uploaded ${result.summary.inserted} records`,
      recordCount: result.summary.inserted,
      summary: result.summary,
      records: result.records.map(r => ({
        id: r.id,
        parishId: r.parish_id,
        year: r.year,
        month: r.month,
        createdAt: r.created_at
      }))
    });
  } catch (error) {
    console.error('Upload error:', error);

    // Clean up file
    if (req.file) {
      
      fs.unlink(req.file.path).catch(console.error);
    }

    res.status(400).json({
      error: error.message || 'Upload failed'
    });
  }
});

// ============================================
// GRAPHQL ENDPOINT (Apollo Middleware)
// ============================================

// Start server
async function startServer() {
  try {
    // Test database connection
    const result = await pool.query('SELECT NOW()');
    console.log('✓ Database connected:', result.rows[0].now);

    // Start Apollo Server
    await apolloServer.start();
    console.log('✓ Apollo Server started');

    // Mount Apollo middleware
    apolloServer.applyMiddleware({ app });

    // Start Express server
    const server = app.listen(PORT, "0.0.0.0", () => {
      console.log(`
╔═══════════════════════════════════════════════╗
║  🚀 Diocesan Finance API Server Ready!       ║
╚═══════════════════════════════════════════════╝

📊 Environment: ${NODE_ENV}
🔗 GraphQL Endpoint: http://localhost:${PORT}${apolloServer.graphqlPath}
📤 File Upload: http://localhost:${PORT}/api/upload
❤️  Health Check: http://localhost:${PORT}/health

Roles Implemented:
  • ADMIN - Full access (login with email/password)
  • BISHOP - Read-only dashboards (login with email/password)
  • PRIEST - Own parish only (login with token)

📖 Documentation:
  • Quick Start: See QUICK-START.md
  • Modifications: See MODIFICATIONS-GUIDE.md
  • Roles & Permissions: See ROLES-AND-PERMISSIONS.md

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
      `);
    });

    // Graceful shutdown
    process.on('SIGTERM', () => {
      console.log('\n📌 SIGTERM received, shutting down gracefully...');
      server.close(() => {
        console.log('✓ Server closed');
        pool.end();
        process.exit(0);
      });
    });

    process.on('SIGINT', () => {
      console.log('\n📌 SIGINT received, shutting down gracefully...');
      server.close(() => {
        console.log('✓ Server closed');
        pool.end();
        process.exit(0);
      });
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

startServer();

export default app;
