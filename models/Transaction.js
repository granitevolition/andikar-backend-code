const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema({
  transactionId: {
    type: String,
    required: true,
    unique: true
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  phoneNumber: {
    type: String,
    required: true
  },
  amount: {
    type: Number,
    required: true
  },
  date: {
    type: Date,
    default: Date.now
  },
  status: {
    type: String,
    enum: ['Pending', 'Completed', 'Failed'],
    default: 'Pending'
  },
  plan: {
    type: String,
    required: true,
    enum: ['Free', 'Basic', 'Premium']
  },
  paymentMethod: {
    type: String,
    default: 'M-Pesa'
  }
}, { timestamps: true });

module.exports = mongoose.model('Transaction', transactionSchema);
