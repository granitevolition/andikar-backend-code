const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  password: {
    type: String,
    required: true
  },
  plan: {
    type: String,
    required: true,
    default: 'Free',
    enum: ['Free', 'Basic', 'Premium']
  },
  joinedDate: {
    type: Date,
    default: Date.now
  },
  wordsUsed: {
    type: Number,
    default: 0
  },
  paymentStatus: {
    type: String,
    default: 'Pending',
    enum: ['Pending', 'Paid']
  },
  apiKeys: {
    gptZero: {
      type: String,
      default: ''
    },
    originality: {
      type: String,
      default: ''
    }
  }
}, { timestamps: true });

// Hash password before saving
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Method to check if password is correct
userSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

module.exports = mongoose.model('User', userSchema);
