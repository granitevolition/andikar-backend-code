const express = require('express');
const { v4: uuidv4 } = require('uuid');
const Transaction = require('../models/Transaction');
const UsageLog = require('../models/UsageLog');
const User = require('../models/User');
const { humanizeText } = require('../services/humanizer');
const { detectAIContent } = require('../services/detector');
const config = require('../config');
const { protect, checkPayment } = require('../middleware/auth');

const router = express.Router();

// Simple echo endpoint for testing
router.post('/echo_text', (req, res) => {
  try {
    const { input_text } = req.body;
    
    if (!input_text) {
      return res.status(400).json({
        success: false,
        message: 'No input text provided'
      });
    }
    
    res.json({
      success: true,
      result: input_text
    });
  } catch (error) {
    console.error('Echo error:', error);
    res.status(500).json({
      success: false,
      message: 'An error occurred',
      error: error.message
    });
  }
});

// Humanize text endpoint
router.post('/humanize_text', protect, checkPayment, async (req, res) => {
  try {
    const { input_text } = req.body;
    const startTime = Date.now();
    
    if (!input_text) {
      return res.status(400).json({
        success: false,
        message: 'No input text provided'
      });
    }
    
    // Check word count limit based on user's plan
    const wordCount = input_text.split(/\\s+/).length;
    const wordLimit = config.PRICING_PLANS[req.user.plan].word_limit;
    
    let processedText = input_text;
    let limitExceeded = false;
    
    if (wordCount > wordLimit) {
      // Truncate text if beyond word limit
      const words = input_text.split(/\\s+/);
      processedText = words.slice(0, wordLimit).join(' ');
      limitExceeded = true;
    }
    
    // Process the text
    const humanizedResult = await humanizeText(processedText);
    
    // Update words used count
    const user = await User.findById(req.user._id);
    user.wordsUsed += wordCount;
    await user.save();
    
    // Log usage
    await UsageLog.create({
      userId: req.user._id,
      action: 'humanize_text',
      inputLength: input_text.length,
      outputLength: humanizedResult.result ? humanizedResult.result.length : 0,
      processingTime: Date.now() - startTime,
      successful: humanizedResult.success,
      error: humanizedResult.error || null,
      metadata: {
        wordCount,
        limitExceeded,
        plan: req.user.plan
      }
    });
    
    // Return response
    if (humanizedResult.success) {
      res.json({
        success: true,
        result: humanizedResult.result,
        processingTime: humanizedResult.processingTime,
        limitExceeded,
        plan: {
          name: req.user.plan,
          wordLimit,
          wordsUsed: wordCount
        }
      });
    } else {
      res.status(500).json({
        success: false,
        message: 'Failed to humanize text',
        error: humanizedResult.error
      });
    }
  } catch (error) {
    console.error('Humanize error:', error);
    res.status(500).json({
      success: false,
      message: 'An error occurred during text humanization',
      error: error.message
    });
  }
});

// Detect AI content
router.post('/detect_ai', protect, checkPayment, async (req, res) => {
  try {
    const { text } = req.body;
    const startTime = Date.now();
    
    if (!text) {
      return res.status(400).json({
        success: false,
        message: 'No text provided'
      });
    }
    
    // Run detection
    const detectionResult = await detectAIContent(text, req.user);
    
    // Log usage
    await UsageLog.create({
      userId: req.user._id,
      action: 'detect_ai',
      inputLength: text.length,
      processingTime: Date.now() - startTime,
      successful: detectionResult.success,
      error: detectionResult.error || null,
      metadata: {
        source: detectionResult.source,
        plan: req.user.plan
      }
    });
    
    // Return response
    if (detectionResult.success) {
      res.json({
        success: true,
        result: detectionResult.result,
        source: detectionResult.source,
        processingTime: detectionResult.processingTime
      });
    } else {
      res.status(500).json({
        success: false,
        message: 'Failed to detect AI content',
        error: detectionResult.error
      });
    }
  } catch (error) {
    console.error('Detection error:', error);
    res.status(500).json({
      success: false,
      message: 'An error occurred during AI detection',
      error: error.message
    });
  }
});

// Process payment
router.post('/payment', protect, async (req, res) => {
  try {
    const { phone_number, plan } = req.body;
    
    if (!phone_number || !plan) {
      return res.status(400).json({
        success: false,
        message: 'Phone number and plan are required'
      });
    }
    
    // Validate plan
    if (!config.PRICING_PLANS[plan]) {
      return res.status(400).json({
        success: false,
        message: 'Invalid plan'
      });
    }
    
    const amount = config.PRICING_PLANS[plan].price;
    
    // Simulate payment processing
    const transactionId = 'TX' + uuidv4().replace(/-/g, '').substring(0, 10).toUpperCase();
    
    // Create transaction record
    const transaction = await Transaction.create({
      transactionId,
      userId: req.user._id,
      phoneNumber: phone_number,
      amount,
      status: 'Completed',
      plan
    });
    
    // Update user plan and payment status
    const user = await User.findById(req.user._id);
    user.plan = plan;
    user.paymentStatus = 'Paid';
    await user.save();
    
    res.json({
      success: true,
      message: 'Payment processed successfully',
      transaction: {
        id: transaction._id,
        transactionId: transaction.transactionId,
        amount: transaction.amount,
        date: transaction.date,
        status: transaction.status
      },
      plan: {
        name: plan,
        wordLimit: config.PRICING_PLANS[plan].word_limit,
        price: config.PRICING_PLANS[plan].price
      }
    });
  } catch (error) {
    console.error('Payment error:', error);
    res.status(500).json({
      success: false,
      message: 'An error occurred during payment processing',
      error: error.message
    });
  }
});

// Get usage statistics
router.get('/usage', protect, async (req, res) => {
  try {
    const logs = await UsageLog.find({ userId: req.user._id })
      .sort({ createdAt: -1 })
      .limit(100);
    
    // Calculate total usage
    const totalHumanize = await UsageLog.countDocuments({ 
      userId: req.user._id, 
      action: 'humanize_text'
    });
    
    const totalDetect = await UsageLog.countDocuments({ 
      userId: req.user._id, 
      action: 'detect_ai'
    });
    
    const totalInputChars = await UsageLog.aggregate([
      { $match: { userId: req.user._id } },
      { $group: { _id: null, total: { $sum: '$inputLength' } } }
    ]);
    
    const totalOutputChars = await UsageLog.aggregate([
      { $match: { userId: req.user._id, outputLength: { $exists: true } } },
      { $group: { _id: null, total: { $sum: '$outputLength' } } }
    ]);
    
    res.json({
      success: true,
      usage: {
        total: {
          humanize: totalHumanize,
          detect: totalDetect,
          inputChars: totalInputChars.length > 0 ? totalInputChars[0].total : 0,
          outputChars: totalOutputChars.length > 0 ? totalOutputChars[0].total : 0
        },
        logs: logs.map(log => ({
          id: log._id,
          action: log.action,
          inputLength: log.inputLength,
          outputLength: log.outputLength,
          processingTime: log.processingTime,
          successful: log.successful,
          timestamp: log.createdAt
        }))
      }
    });
  } catch (error) {
    console.error('Usage stats error:', error);
    res.status(500).json({
      success: false,
      message: 'An error occurred while fetching usage statistics',
      error: error.message
    });
  }
});

module.exports = router;
