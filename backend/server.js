const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

// --- Environment validation: fail fast with clear message for missing secrets ---
const requiredEnv = ['JWT_SECRET'];
const missing = requiredEnv.filter((k) => !process.env[k]);
if (missing.length > 0) {
  console.error(`Missing required environment variables: ${missing.join(', ')}.`);
  console.error('Please create a .env file from .env.example and set these values before starting the server.');
  process.exit(1);
}

// Import routes
const authRoutes = require('./routes/auth');
const challanRoutes = require('./routes/challans');
const adminRoutes = require('./routes/admin');

// Import models for worker stats endpoint
const Challan = require('./models/Challan');
const EmailRecipient = require('./models/EmailRecipient');
const Violation = require('./models/Violation');
const Division = require('./models/Division');
const { authenticate } = require('./middleware/auth');
const { getIndiaDateRange, getIndiaTodayRange } = require('./utils/dateTime');
const { generateReportPdf } = require('./utils/pdfGenerator');

const app = express();
const PORT = process.env.PORT || 5000;
const frontendDistPath = path.join(__dirname, '..', 'frontend', 'dist');

// ── Middleware ───────────────────────────────────────────────────
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// CORS configuration. FRONTEND_URLS supports multiple comma-separated origins.
const allowedOrigins = (
  process.env.FRONTEND_URLS ||
  process.env.FRONTEND_URL ||
  'http://localhost:5173'
)
  .split(',')
  .map((origin) => origin.trim().replace(/\/$/, ''))
  .filter(Boolean);

const corsOptions = {
  origin(origin, callback) {
    // Requests without an Origin header include server-to-server calls and health checks.
    if (!origin || allowedOrigins.includes(origin.replace(/\/$/, ''))) {
      return callback(null, true);
    }

    return callback(new Error(`CORS blocked request from origin: ${origin}`));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
};
app.use(cors(corsOptions));

// Serve uploaded files (for development/preview)
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// ── Routes ──────────────────────────────────────────────────────
app.use('/api/auth', authRoutes);
app.use('/api/challans', challanRoutes);
app.use('/api/admin', adminRoutes);

// Worker stats endpoint (accessible by both workers and admins)
app.get('/api/stats/my-division', authenticate, async (req, res) => {
  try {
    const division = req.user.division;

    const totalChallans = await Challan.countDocuments({ division });
    const totalFinesResult = await Challan.aggregate([
      { $match: { division, type: 'Challan' } },
      { $group: { _id: null, total: { $sum: '$fineAmount' } } }
    ]);
    const totalFines = totalFinesResult.length > 0 ? totalFinesResult[0].total : 0;

    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const recentChallans = await Challan.countDocuments({
      division,
      createdAt: { $gte: sevenDaysAgo }
    });

    const emailsSent = await Challan.countDocuments({
      division,
      emailSentAt: { $ne: null }
    });

    // Violations sent today for this division
    const { start: startOfToday, end: endOfToday } = getIndiaTodayRange();
    const violationsSentToday = await Challan.countDocuments({
      division,
      emailSentAt: { $gte: startOfToday, $lte: endOfToday }
    });

    res.json({
      success: true,
      data: {
        stats: { totalChallans, totalFines, recentChallans, emailsSent, violationsSentToday, division }
      }
    });
  } catch (err) {
    console.error('Worker stats error:', err);
    res.status(500).json({ success: false, message: 'Server error fetching stats.' });
  }
});

// Report generation for admins and workers. Workers are limited to their division.
app.post('/api/reports', authenticate, async (req, res) => {
  try {
    const { startDate, endDate } = req.body;
    if (!startDate || !endDate) {
      return res.status(400).json({ success: false, message: 'startDate and endDate are required.' });
    }

    const { start, end } = getIndiaDateRange(startDate, endDate);
    const filter = { dateTime: { $gte: start, $lte: end } };
    if (req.user.role === 'worker') {
      filter.division = req.user.division;
    }

    const challans = await Challan.find(filter).sort({ dateTime: -1 }).lean();
    const pdfBuffer = await generateReportPdf(challans, start, end);
    const divisionSuffix = req.user.role === 'worker'
      ? `-${String(req.user.division).replace(/[^a-z0-9-]+/gi, '-')}`
      : '';

    res.type('application/pdf');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="GHMC-Violations-Report${divisionSuffix}-${startDate}-${endDate}.pdf"`
    );
    res.setHeader('Cache-Control', 'no-store');
    return res.send(Buffer.from(pdfBuffer));
  } catch (err) {
    console.error('Report generation error:', err);
    return res.status(500).json({ success: false, message: 'Failed to generate report.' });
  }
});

// Email recipients list (accessible by authenticated users for the challan form)
app.get('/api/email-recipients', authenticate, async (req, res) => {
  try {
    let filter = { isActive: true };

    // Workers see only recipients for their division or global (division=null)
    if (req.user.role === 'worker') {
      filter = {
        isActive: true,
        $or: [
          { division: req.user.division },
          { division: null }
        ]
      };
    }

    const recipients = await EmailRecipient.find(filter).sort({ name: 1 });
    res.json({ success: true, data: { recipients } });
  } catch (err) {
    console.error('Email recipients error:', err);
    res.status(500).json({ success: false, message: 'Server error fetching recipients.' });
  }
});

// Public endpoint: List all active violations
app.get('/api/violations', async (req, res) => {
  try {
    const violations = await Violation.find({ isActive: true }).sort({ name: 1 });
    res.json({ success: true, data: { violations } });
  } catch (err) {
    console.error('Violations error:', err);
    res.status(500).json({ success: false, message: 'Server error fetching violations.' });
  }
});

// Public endpoint: List all active divisions
app.get('/api/divisions', async (req, res) => {
  try {
    const divisions = await Division.find({ isActive: true }).sort({ name: 1 });
    res.json({ success: true, data: { divisions } });
  } catch (err) {
    console.error('Divisions error:', err);
    res.status(500).json({ success: false, message: 'Server error fetching divisions.' });
  }
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    message: 'GHMC Challan API is running',
    timestamp: new Date().toISOString()
  });
});

if (process.env.NODE_ENV === 'production' && fs.existsSync(frontendDistPath)) {
  app.use(express.static(frontendDistPath));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api/') || req.path.startsWith('/uploads/')) {
      return next();
    }
    return res.sendFile(path.join(frontendDistPath, 'index.html'));
  });
}

// API and development 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Route ${req.method} ${req.originalUrl} not found`
  });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({
    success: false,
    message: process.env.NODE_ENV === 'production'
      ? 'Internal server error'
      : err.message
  });
});

// ── Database Connection & Server Start ──────────────────────────
const connectDB = async () => {
  try {
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/ghmc-challan';
    await mongoose.connect(mongoUri);
    console.log('✅ Connected to MongoDB');
  } catch (err) {
    console.error('❌ MongoDB connection error:', err.message);
    process.exit(1);
  }
};

const startServer = async () => {
  await connectDB();

  app.listen(PORT, () => {
    console.log(`🚀 GHMC Challan API running on port ${PORT}`);
    console.log(`📋 Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`🌐 Allowed frontend origins: ${allowedOrigins.join(', ')}`);
  });
};

startServer();

module.exports = app;
