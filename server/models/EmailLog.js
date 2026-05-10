const mongoose = require('mongoose');

const emailLogSchema = new mongoose.Schema({
  subject: {
    type: String,
    required: true,
    trim: true,
  },
  body: {
    type: String,
    required: true,
  },
  recipients: {
    type: [String],
    required: true,
    validate: {
      validator: (arr) => arr.length > 0,
      message: 'At least one recipient is required.',
    },
  },
  sentAt: {
    type: Date,
    default: Date.now,
  },
  status: {
    type: String,
    enum: ['success', 'partial', 'failed', 'pending', 'scheduled', 'processing'],
    default: 'success',
  },
  scheduledFor: {
    type: Date,
    default: null,
  },
  successCount: {
    type: Number,
    default: 0,
  },
  failCount: {
    type: Number,
    default: 0,
  },
  errorMessage: {
    type: String,
    default: '',
  },
});

module.exports = mongoose.model('EmailLog', emailLogSchema);
