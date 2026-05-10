const express = require('express');
const nodemailer = require('nodemailer');
const EmailLog = require('../models/EmailLog');
const authMiddleware = require('../middleware/authMiddleware');

const router = express.Router();

// ─── Nodemailer Transporter ───────────────────────────────────────────────────
const createTransporter = () => {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT) || 587,
    secure: false, // true for port 465
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
};

// ─── Email Validation ─────────────────────────────────────────────────────────
const isValidEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

// POST /api/email/send  (protected)
router.post('/send', authMiddleware, async (req, res) => {
  try {
    const { subject, body, recipients, scheduledFor } = req.body;

    // Validation
    if (!subject || !subject.trim()) {
      return res.status(400).json({ message: 'Subject is required.' });
    }
    if (!body || !body.trim()) {
      return res.status(400).json({ message: 'Email body is required.' });
    }
    if (!recipients || !Array.isArray(recipients) || recipients.length === 0) {
      return res.status(400).json({ message: 'At least one recipient is required.' });
    }

    const validRecipients = recipients.filter(isValidEmail);
    const invalidRecipients = recipients.filter((r) => !isValidEmail(r));

    if (validRecipients.length === 0) {
      return res.status(400).json({ message: 'No valid email addresses provided.' });
    }

    // Determine status
    const isScheduled = scheduledFor && new Date(scheduledFor) > new Date();
    const status = isScheduled ? 'scheduled' : 'pending';

    // Save log to MongoDB (Queue it)
    const log = await EmailLog.create({
      subject: subject.trim(),
      body: body.trim(), // Assuming HTML sanitized from frontend
      recipients: validRecipients,
      status,
      scheduledFor: isScheduled ? new Date(scheduledFor) : null,
      successCount: 0,
      failCount: 0,
    });

    // If it's pending right now, trigger the queue worker
    if (status === 'pending') {
      const { triggerQueue } = require('../services/scheduler');
      triggerQueue();
    }

    res.json({
      message: isScheduled 
        ? `Email scheduled for ${validRecipients.length} recipients.` 
        : `Email queued for ${validRecipients.length} recipients.`,
      status,
      invalidRecipients,
      logId: log._id,
    });
  } catch (err) {
    console.error('Send email error:', err);
    res.status(500).json({ message: 'Server error while sending emails.', error: err.message });
  }
});

// GET /api/email/history  (protected)
router.get('/history', authMiddleware, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    const [logs, total] = await Promise.all([
      EmailLog.find().sort({ sentAt: -1 }).skip(skip).limit(limit),
      EmailLog.countDocuments(),
    ]);

    res.json({
      logs,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    });
  } catch (err) {
    console.error('History fetch error:', err);
    res.status(500).json({ message: 'Server error while fetching history.' });
  }
});

// GET /api/email/history/:id  (protected)
router.get('/history/:id', authMiddleware, async (req, res) => {
  try {
    const log = await EmailLog.findById(req.params.id);
    if (!log) return res.status(404).json({ message: 'Email log not found.' });
    res.json(log);
  } catch (err) {
    res.status(500).json({ message: 'Server error.' });
  }
});

// DELETE /api/email/history/:id  (protected)
router.delete('/history/:id', authMiddleware, async (req, res) => {
  try {
    await EmailLog.findByIdAndDelete(req.params.id);
    res.json({ message: 'Log deleted successfully.' });
  } catch (err) {
    res.status(500).json({ message: 'Server error.' });
  }
});

module.exports = router;
