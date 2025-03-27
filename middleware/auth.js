const jwt = require('jsonwebtoken');
const config = require('../config');
const User = require('../models/User');

// Middleware to verify JWT token
const protect = async (req, res, next) => {
  let token;
  
  // Check if token exists in headers
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }
  
  // Check if token exists
  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'Not authorized, no token provided'
    });
  }
  
  try {
    // Verify token
    const decoded = jwt.verify(token, config.JWT_SECRET);
    
    // Find user with decoded id
    const user = await User.findById(decoded.id).select('-password');
    
    // Check if user exists
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'User not found'
      });
    }
    
    // Set user in request
    req.user = user;
    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: 'Not authorized, token invalid'
    });
  }
};

// Middleware to check if payment status is valid
const checkPayment = async (req, res, next) => {
  // Skip payment check for free users
  if (req.user.plan === 'Free') {
    return next();
  }
  
  // Check payment status for paid plans
  if (req.user.paymentStatus !== 'Paid') {
    return res.status(403).json({
      success: false,
      message: 'Payment required to access this feature',
      paymentRequired: true
    });
  }
  
  next();
};

module.exports = { protect, checkPayment };
