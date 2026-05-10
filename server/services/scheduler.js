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

// ─── Professional Email Template ──────────────────────────────────────────────
const generateHtmlTemplate = (bodyContent) => {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: 'Inter', 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f4f7fa; margin: 0; padding: 0; color: #333; }
        .container { max-width: 600px; margin: 40px auto; background: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 15px rgba(0,0,0,0.05); }
        .header { background: linear-gradient(135deg, #6366f1, #8b5cf6); padding: 30px 20px; text-align: center; color: white; }
        .header h1 { margin: 0; font-size: 24px; font-weight: 600; letter-spacing: 0.5px; }
        .content { padding: 30px; font-size: 16px; line-height: 1.6; color: #1e293b; }
        .content a { color: #6366f1; text-decoration: none; }
        .content img { max-width: 100%; border-radius: 8px; margin: 10px 0; }
        .footer { background: #f8fafc; padding: 20px; text-align: center; font-size: 13px; color: #64748b; border-top: 1px solid #e2e8f0; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Important Update</h1>
        </div>
        <div class="content">
          ${bodyContent}
        </div>
        <div class="footer">
          <p>Sent securely via BulkMail Application.</p>
        </div>
      </div>
    </body>
    </html>
  `;
};

// ─── Queue State ──────────────────────────────────────────────────────────────
let isProcessing = false;

// ─── Process Next Email in Queue ──────────────────────────────────────────────
const processNext = async (specificLogId = null) => {
  if (isProcessing && !specificLogId) return;
  if (!specificLogId) isProcessing = true;

  try {
    // Atomically find pending log and lock it by setting status to 'processing'
    // This prevents race conditions where React Strict Mode double-fetches or multiple lambdas run
    let query = { status: 'pending' };
    if (specificLogId) query._id = specificLogId;
    
    const log = await EmailLog.findOneAndUpdate(
      query,
      { $set: { status: 'processing' } },
      { new: true }
    ).sort({ sentAt: 1 });

    if (!log) {
      if (!specificLogId) isProcessing = false;
      return; // Queue is empty, log not found, or already being processed
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
          html: generateHtmlTemplate(log.body), // Wrapped in professional HTML
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
    if (!specificLogId) {
      isProcessing = false;
      // Check for more pending emails
      setTimeout(() => processNext(), 1000); 
    }
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
