const express = require('express');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const config = require('./config');
const connectDB = require('./db');
const authRoutes = require('./routes/auth');
const apiRoutes = require('./routes/api');

// Initialize Express app
const app = express();
const PORT = config.PORT;

// Connect to database
connectDB();

// Middleware
app.use(cors());
app.use(express.json());

// Apply rate limiting
const limiter = rateLimit({
  windowMs: config.RATE_LIMIT.windowMs,
  max: config.RATE_LIMIT.max,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many requests, please try again later'
  }
});
app.use(limiter);

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    message: 'Andikar API',
    version: '1.0.0',
    status: 'running',
    timestamp: new Date().toISOString()
  });
});

// Register routes
app.use('/api/auth', authRoutes);
app.use('/', apiRoutes);

// Error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
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
  // In production, you might want to exit the process and let your process manager restart it
  // process.exit(1);
});
