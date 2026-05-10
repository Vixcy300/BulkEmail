const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');
const bcrypt = require('bcryptjs');

dotenv.config();

const app = express();

// ─── Middleware ───────────────────────────────────────────────────────────────
app.use(cors()); // More flexible for deployment
app.use(express.json());

// ─── MongoDB Connection Helper ────────────────────────────────────────────────
let isConnected = false;
const connectDB = async () => {
  if (isConnected) return;
  try {
    await mongoose.connect(process.env.MONGO_URI);
    isConnected = true;
    console.log('✅ MongoDB connected');

    // Seed admin if not exists (Only in development or if needed)
    const Admin = require('./models/Admin');
    const existing = await Admin.findOne({ username: process.env.ADMIN_USERNAME });
    if (!existing) {
      const hash = await bcrypt.hash(process.env.ADMIN_PASSWORD, 10);
      await Admin.create({ username: process.env.ADMIN_USERNAME, passwordHash: hash });
      console.log(`✅ Admin seeded → username: ${process.env.ADMIN_USERNAME}`);
    }
  } catch (err) {
    console.error('❌ MongoDB connection error:', err.message);
    // In serverless, we don't exit, we just let the request fail so Vercel can retry
  }
};

// ─── Middleware to ensure DB is connected ─────────────────────────────────────
app.use(async (req, res, next) => {
  await connectDB();
  next();
});

// ─── Routes ──────────────────────────────────────────────────────────────────
const authRoutes = require('./routes/authRoutes');
const emailRoutes = require('./routes/emailRoutes');
const templateRoutes = require('./routes/templateRoutes');

app.use('/api/auth', authRoutes);
app.use('/api/email', emailRoutes);
app.use('/api/templates', templateRoutes);

// ─── Health Check ─────────────────────────────────────────────────────────────
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'BulkMail server is running!', isConnected });
});

// ─── Start Server (Only for local dev) ────────────────────────────────────────
const { initScheduler } = require('./services/scheduler');

if (process.env.NODE_ENV !== 'production') {
  const PORT = process.env.PORT || 5001;
  connectDB().then(() => {
    initScheduler();
    app.listen(PORT, () => {
      console.log(`🚀 Server running on http://localhost:${PORT}`);
    });
  });
} else {
  // In production (Vercel), we just export the app
  // Note: Background scheduler won't work on Vercel Serverless
  connectDB();
}

module.exports = app;
