// src/server.js
// Apollo GraphQL Server with Express, Authentication, and File Upload
import express from 'express';
import { ApolloServer } from 'apollo-server-express';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
import cors from 'cors';
import multer from 'multer';
import { typeDefs } from './graphql/typeDefs.js';
import { resolvers } from './graphql/resolvers.js';
import { processUpload } from './services/spreadsheetParser.js';
import { pool } from './db/pool.js';

dotenv.config();

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';
const PORT = process.env.PORT || 4000;
const NODE_ENV = process.env.NODE_ENV || 'development';

// Configure multer for file uploads
const upload = multer({
  dest: 'uploads/',
  fileFilter: (req, file, cb) => {
    const allowed = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'text/csv'
    ];
    if (allowed.includes(file.mimetype)) {
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
app.use(cors());
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
    const fileType = req.file.mimetype.includes('spreadsheet') ? 'xlsx' : 'csv';

    // Process upload
    const records = await processUpload(
      req.file.path,
      parseInt(year),
      fileType,
      req.user.id
    );

    // Clean up uploaded file
    const fs = require('fs').promises;
    await fs.unlink(req.file.path);

    res.json({
      success: true,
      message: `Successfully uploaded ${records.length} records`,
      recordCount: records.length,
      records: records.map(r => ({
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
      const fs = require('fs').promises;
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
    const server = app.listen(PORT, () => {
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
