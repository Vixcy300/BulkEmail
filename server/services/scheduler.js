const cron = require('node-cron');
const nodemailer = require('nodemailer');
const EmailLog = require('../models/EmailLog');

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

// ─── Queue State ──────────────────────────────────────────────────────────────
let isProcessing = false;

// ─── Process Next Email in Queue ──────────────────────────────────────────────
const processNext = async () => {
  if (isProcessing) return;
  isProcessing = true;

  try {
    // Find one pending email log
    const log = await EmailLog.findOne({ status: 'pending' }).sort({ sentAt: 1 });
    if (!log) {
      isProcessing = false;
      return; // Queue is empty
    }

    const transporter = createTransporter();
    let successCount = 0;
    let failCount = 0;
    const errors = [];

    // Process its recipients with a 2-second delay between each
    for (const recipient of log.recipients) {
      try {
        await transporter.sendMail({
          from: `"BulkMail" <${process.env.SMTP_USER}>`,
          to: recipient,
          subject: log.subject,
          html: log.body, // Assuming body is fully HTML sanitized from frontend
        });
        successCount++;
      } catch (emailErr) {
        failCount++;
        errors.push(`${recipient}: ${emailErr.message}`);
        console.error(`❌ Failed to send to ${recipient}:`, emailErr.message);
      }
      
      // Update log progress in DB after each email
      log.successCount = successCount;
      log.failCount = failCount;
      log.errorMessage = errors.join(' | ');
      await log.save();

      // Only delay locally. In Vercel (production), we must send as fast as possible 
      // because the serverless function will be killed soon.
      if (process.env.NODE_ENV !== 'production') {
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }

    // Update log final status
    let status = 'success';
    if (successCount === 0) status = 'failed';
    else if (failCount > 0) status = 'partial';

    log.status = status;
    await log.save();

  } catch (err) {
    console.error('Queue processing error:', err);
  } finally {
    isProcessing = false;
    // Check for more pending emails
    setTimeout(processNext, 1000); 
  }
};

// ─── Start Cron Job for Scheduled Emails ──────────────────────────────────────
const initScheduler = () => {
  // Check every minute
  cron.schedule('* * * * *', async () => {
    try {
      const now = new Date();
      // Find emails scheduled for now or in the past
      const scheduledLogs = await EmailLog.find({
        status: 'scheduled',
        scheduledFor: { $lte: now }
      });

      for (const log of scheduledLogs) {
        log.status = 'pending';
        log.sentAt = now;
        await log.save();
        console.log(`⏰ Scheduled email ${log._id} moved to pending queue.`);
      }

      // Trigger queue processing
      if (scheduledLogs.length > 0) {
        processNext();
      }
    } catch (err) {
      console.error('Cron job error:', err);
    }
  });

  // Also start processing right away in case there are pending items from before
  processNext();
};

module.exports = {
  initScheduler,
  triggerQueue: processNext,
};
