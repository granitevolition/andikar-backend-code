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

// Root endpoint - simple health check
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

// Echo endpoint - basic functionality test
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

// Database check endpoint - to verify PostgreSQL connectivity
app.get('/database-check', async (req, res) => {
  try {
    const { pool } = require('./db');
    const result = await pool.query('SELECT NOW() as time');
    
    res.json({
      success: true,
      message: 'Database connection successful',
      data: {
        time: result.rows[0].time,
        connectionInfo: {
          databaseExists: !!pool,
          clientActive: !!pool.totalCount,
          idleClients: pool.idleCount || 0,
          totalClients: pool.totalCount || 0
        }
      }
    });
  } catch (error) {
    console.error('Database check error:', error);
    res.status(500).json({
      success: false,
      message: 'Database connection failed',
      error: error.message
    });
  }
});

// Initialize the application - connect to database first
async function initializeApp() {
  try {
    console.log('Connecting to PostgreSQL database...');
    await connectDB();
    console.log('Database connection established');
    
    // Create default user after successful database connection
    try {
      await User.createDefaultUser();
    } catch (error) {
      console.error('Failed to create default user:', error.message);
      // This is not critical, so we can continue
    }
    
    // Start the server after database connection is established
    startServer();
  } catch (error) {
    console.error('FATAL: Database connection failed:', error.message);
    console.error('Application cannot start without database connection');
    process.exit(1); // Exit with error code
  }
}

// Start the server
function startServer() {
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
  
  // Start the HTTP server
  app.listen(PORT, () => {
    console.log(`Andikar API running on port ${PORT}`);
    console.log(`http://localhost:${PORT}`);
    
    // Display available plans
    console.log('Available plans:');
    for (const [planName, planDetails] of Object.entries(config.PRICING_PLANS)) {
      console.log(`  - ${planName}: ${planDetails.word_limit} words per round (KES ${planDetails.price})`);
    }
  });
}

// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
  console.error('Unhandled Promise Rejection:', err);
  // Database errors should be considered fatal in production
  if (process.env.NODE_ENV === 'production' && 
      (err.message.includes('database') || err.message.includes('sql') || err.message.includes('postgres'))) {
    console.error('FATAL: Unhandled database error in production. Terminating application.');
    process.exit(1);
  }
});

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
  // Database errors should be considered fatal in production
  if (process.env.NODE_ENV === 'production' && 
      (err.message.includes('database') || err.message.includes('sql') || err.message.includes('postgres'))) {
    console.error('FATAL: Unhandled database error in production. Terminating application.');
    process.exit(1);
  }
});

// Start initialization process
initializeApp();
