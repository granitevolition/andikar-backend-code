require('dotenv').config();

module.exports = {
  // Server configuration
  PORT: process.env.PORT || 3000,
  JWT_SECRET: process.env.JWT_SECRET || 'andikar-api-secret-key',
  
  // Note: Database configuration now comes directly from environment variables
  // The db.js file handles this directly for better Railway compatibility
  
  // Admin API URL
  ADMIN_API_URL: process.env.ADMIN_API_URL || 'http://localhost:3001',
  
  // Rate limiting
  RATE_LIMIT: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100 // limit each IP to 100 requests per windowMs
  },
  
  // Humanizer settings
  HUMANIZER: {
    DEFAULT_MODEL: process.env.DEFAULT_MODEL || 'andikar-v1',
    TEMPERATURE: parseFloat(process.env.TEMPERATURE || '0.7'),
    API_KEY: process.env.HUMANIZER_API_KEY || 'sk-test-key'
  },
  
  // Pricing plans - should match frontend config
  PRICING_PLANS: {
    "Free": {
      "price": 0,  // KES
      "word_limit": 500,
      "description": "Free tier with 500 words per round"
    },
    "Basic": {
      "price": 500,  // KES
      "word_limit": 1500,
      "description": "Basic plan with 1,500 words per round"
    },
    "Premium": {
      "price": 2000,  // KES
      "word_limit": 8000,
      "description": "Premium plan with 8,000 words per round"
    }
  },
  
  // Trust proxy (for rate limit behind reverse proxy)
  TRUST_PROXY: process.env.TRUST_PROXY === 'true' || process.env.NODE_ENV === 'production'
};
