const express = require('express');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const config = require('./config');
const { connectDB } = require('./db');
const User = require('./models/User');
const authRoutes = require('./routes/auth');
const apiRoutes = require('./routes/api');

// Initialize Express app
const app = express();
const PORT = process.env.PORT || config.PORT || 8080;

// Set trust proxy setting if needed (important for rate limiting behind a proxy)
if (config.TRUST_PROXY) {
  app.set('trust proxy', 1);
  console.log('Trust proxy enabled for rate limiting');
}

// Display environment info for debugging
console.log(`Starting Andikar API in ${process.env.NODE_ENV || 'development'} mode`);
console.log(`Using PORT: ${PORT}`);

// Middleware
app.use(cors());
app.use(express.json());

// Apply rate limiting with skip option to avoid errors in development
const limiter = rateLimit({
  windowMs: config.RATE_LIMIT.windowMs,
  max: config.RATE_LIMIT.max,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many requests, please try again later'
  },
  skip: () => process.env.NODE_ENV !== 'production' // Skip in non-production environments
});

// Apply rate limiting to API routes only
app.use('/api', limiter);

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    message: 'Andikar API',
    version: '1.0.0',
    status: 'running',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    railway: process.env.RAILWAY_PROJECT_NAME ? true : false
  });
});

// Echo endpoint - no auth required
app.post('/echo_text', (req, res) => {
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

// Simple humanize endpoint - no auth for testing
app.post('/humanize_text', (req, res) => {
  try {
    const { input_text } = req.body;
    
    if (!input_text) {
      return res.status(400).json({
        success: false,
        message: 'No input text provided'
      });
    }
    
    // Simple humanization for testing without DB
    const humanized = input_text
      .replace(/utilize/g, 'use')
      .replace(/commence/g, 'start')
      .replace(/subsequently/g, 'later')
      .replace(/therefore/g, 'so')
      .replace(/furthermore/g, 'also');
      
    res.json({
      success: true,
      result: humanized
    });
  } catch (error) {
    console.error('Humanize error:', error);
    res.status(500).json({
      success: false,
      message: 'An error occurred',
      error: error.message
    });
  }
});

// Connect to database (after setting up basic endpoints)
// This ensures the API works even without a database
(async () => {
  try {
    console.log('Connecting to PostgreSQL database...');
    await connectDB();
    
    // Create default user after successful database connection
    try {
      await User.createDefaultUser();
    } catch (err) {
      console.warn('Warning: Could not create default user:', err.message);
      // Continue anyway - this is not critical
    }
  } catch (err) {
    console.warn('Database initialization warning:', err.message);
    // Continue running the API without the database for basic functionality
  }
})();

// Register routes
app.use('/api/auth', authRoutes);
app.use('/', apiRoutes);

// Error handler
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err.stack);
  res.status(500).json({
    success: false,
    message: 'An unexpected error occurred',
    error: process.env.NODE_ENV === 'production' ? null : err.message
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'API endpoint not found'
  });
});

// Start the server
app.listen(PORT, () => {
  console.log(`Andikar API running on port ${PORT}`);
  console.log(`http://localhost:${PORT}`);
  
  // Display available plans
  console.log('Available plans:');
  for (const [planName, planDetails] of Object.entries(config.PRICING_PLANS)) {
    console.log(`  - ${planName}: ${planDetails.word_limit} words per round (KES ${planDetails.price})`);
  }
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
  console.error('Unhandled Promise Rejection:', err);
  // Continue running - let the process manager handle restarts if needed
});

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
  // Continue running - let the process manager handle restarts if needed
});
