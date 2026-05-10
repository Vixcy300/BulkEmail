const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');
const bcrypt = require('bcryptjs');

dotenv.config();

const app = express();

// ─── Middleware ───────────────────────────────────────────────────────────────
app.use(cors({
  origin: 'http://localhost:5173',
  credentials: true,
}));
app.use(express.json());

// ─── Routes ──────────────────────────────────────────────────────────────────
const authRoutes = require('./routes/authRoutes');
const emailRoutes = require('./routes/emailRoutes');
const templateRoutes = require('./routes/templateRoutes');

app.use('/api/auth', authRoutes);
app.use('/api/email', emailRoutes);
app.use('/api/templates', templateRoutes);

// ─── Health Check ─────────────────────────────────────────────────────────────
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'BulkMail server is running!' });
});

// ─── MongoDB + Seed Admin ────────────────────────────────────────────────────
const connectAndSeed = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ MongoDB connected');

    // Seed admin if not exists
    const Admin = require('./models/Admin');
    const existing = await Admin.findOne({ username: process.env.ADMIN_USERNAME });
    if (!existing) {
      const hash = await bcrypt.hash(process.env.ADMIN_PASSWORD, 10);
      await Admin.create({ username: process.env.ADMIN_USERNAME, passwordHash: hash });
      console.log(`✅ Admin seeded → username: ${process.env.ADMIN_USERNAME}`);
    }
  } catch (err) {
    console.error('❌ MongoDB connection error:', err.message);
    process.exit(1);
  }
};

// ─── Start Server ─────────────────────────────────────────────────────────────
const { initScheduler } = require('./services/scheduler');

const PORT = process.env.PORT || 5001;
connectAndSeed().then(() => {
  initScheduler();
  app.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
  });
});
