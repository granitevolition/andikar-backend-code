const express = require('express');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const config = require('../config');
const { protect } = require('../middleware/auth');

const router = express.Router();

// Register a new user
router.post('/register', async (req, res) => {
  try {
    const { username, password, plan = 'Free' } = req.body;
    
    // Check if username already exists
    const existingUser = await User.findOne({ username });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'Username already exists'
      });
    }
    
    // Set payment status (Free tier is automatically Paid)
    const paymentStatus = plan === 'Free' ? 'Paid' : 'Pending';
    
    // Create new user
    const user = await User.create({
      username,
      password,
      plan,
      paymentStatus
    });
    
    // Create JWT token
    const token = jwt.sign(
      { id: user._id, username: user.username },
      config.JWT_SECRET,
      { expiresIn: '30d' }
    );
    
    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      user: {
        id: user._id,
        username: user.username,
        plan: user.plan,
        paymentStatus: user.paymentStatus,
        joinedDate: user.joinedDate
      },
      token
    });
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({
      success: false,
      message: 'An error occurred during registration',
      error: error.message
    });
  }
});

// Login user
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    
    // Check if user exists
    const user = await User.findOne({ username });
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }
    
    // Check if password is correct
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }
    
    // Create JWT token
    const token = jwt.sign(
      { id: user._id, username: user.username },
      config.JWT_SECRET,
      { expiresIn: '30d' }
    );
    
    res.json({
      success: true,
      message: 'Login successful',
      user: {
        id: user._id,
        username: user.username,
        plan: user.plan,
        paymentStatus: user.paymentStatus,
        joinedDate: user.joinedDate,
        wordsUsed: user.wordsUsed
      },
      token
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      message: 'An error occurred during login',
      error: error.message
    });
  }
});

// Get current user profile
router.get('/me', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('-password');
    
    res.json({
      success: true,
      user
    });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({
      success: false,
      message: 'An error occurred while fetching profile',
      error: error.message
    });
  }
});

// Update API keys
router.put('/api-keys', protect, async (req, res) => {
  try {
    const { gptZero, originality } = req.body;
    
    // Update user API keys
    const user = await User.findById(req.user._id);
    
    user.apiKeys.gptZero = gptZero || user.apiKeys.gptZero;
    user.apiKeys.originality = originality || user.apiKeys.originality;
    
    await user.save();
    
    res.json({
      success: true,
      message: 'API keys updated successfully',
      apiKeys: user.apiKeys
    });
  } catch (error) {
    console.error('Update API keys error:', error);
    res.status(500).json({
      success: false,
      message: 'An error occurred while updating API keys',
      error: error.message
    });
  }
});

module.exports = router;
