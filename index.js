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
const PORT = process.env.PORT || 8080;

// Set trust proxy for Railway environment
app.set('trust proxy', true);
console.log('Trust proxy enabled for rate limiting');

// Display environment info
console.log(`Starting Andikar API in ${process.env.NODE_ENV || 'development'} mode`);
console.log(`Using PORT: ${PORT}`);

// Middleware
app.use(cors());
app.use(express.json());

// Apply rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many requests, please try again later'
  }
});

// Apply rate limiting to /api routes
app.use('/api', limiter);

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    message: 'Andikar API',
    version: '1.0.0',
    status: 'running',
    timestamp: new Date().toISOString()
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
  
  // Connect to database after server is started
  connectDB()
    .then(() => {
      console.log('Database connection established');
      
      // Create default user
      User.createDefaultUser()
        .then(user => {
          console.log('Default user created or verified');
        })
        .catch(err => {
          console.warn('Warning: Could not create default user:', err.message);
        });
    })
    .catch(err => {
      console.error('Warning: Database connection failed:', err.message);
      console.log('Application will continue running with limited functionality');
    });
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
  console.error('Unhandled Promise Rejection:', err);
});

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
});
