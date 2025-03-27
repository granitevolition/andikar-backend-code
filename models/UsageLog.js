const mongoose = require('mongoose');

const usageLogSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  action: {
    type: String,
    enum: ['humanize_text', 'detect_ai'],
    required: true
  },
  inputLength: {
    type: Number,
    required: true
  },
  outputLength: {
    type: Number
  },
  processingTime: {
    type: Number, // in milliseconds
  },
  successful: {
    type: Boolean,
    default: true
  },
  error: {
    type: String
  },
  metadata: {
    type: mongoose.Schema.Types.Mixed
  }
}, { timestamps: true });

// Create index for faster queries on userId and createdAt
usageLogSchema.index({ userId: 1, createdAt: -1 });

module.exports = mongoose.model('UsageLog', usageLogSchema);
