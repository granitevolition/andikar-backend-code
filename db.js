const { Pool } = require('pg');
const config = require('./config');

// Configure database connection
let poolConfig = {};

if (config.DATABASE_URL) {
  // Use connection string if provided (Railway sets this automatically)
  poolConfig.connectionString = config.DATABASE_URL;
  
  // Configure SSL (required for Railway PostgreSQL)
  if (process.env.NODE_ENV === 'production') {
    poolConfig.ssl = {
      rejectUnauthorized: false // Required for Railway and other cloud PostgreSQL providers
    };
  }
} else {
  // Fallback to individual connection parameters
  poolConfig = {
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    database: process.env.DB_NAME || 'andikar'
  };
}

// Additional pool configuration
poolConfig.max = parseInt(process.env.DB_POOL_SIZE || '10'); // Connection pool size
poolConfig.idleTimeoutMillis = 30000; // How long a client is allowed to remain idle before being closed
poolConfig.connectionTimeoutMillis = 10000; // Connection timeout

// Create a connection pool
const pool = new Pool(poolConfig);

// Register error handler on the pool
pool.on('error', (err, client) => {
  console.error('Unexpected error on idle client', err);
});

// Test the database connection
const connectDB = async () => {
  let client;
  try {
    client = await pool.connect();
    console.log('PostgreSQL database connected successfully');
    
    // Check if tables exist, create them if not
    await initDatabase(client);
    
    return pool;
  } catch (error) {
    console.error(`Error connecting to PostgreSQL database: ${error.message}`);
    // Don't terminate the process, allow the application to run without database temporarily
    // This helps with debugging and allows the basic API endpoints to still work
    return pool; // Return pool anyway to prevent errors elsewhere
  } finally {
    if (client) client.release();
  }
};

// Initialize database structure
const initDatabase = async (client) => {
  try {
    // Create users table if it doesn't exist
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        username VARCHAR(100) UNIQUE NOT NULL,
        password VARCHAR(100) NOT NULL,
        plan VARCHAR(20) NOT NULL DEFAULT 'Free',
        payment_status VARCHAR(20) NOT NULL DEFAULT 'Pending',
        words_used INTEGER NOT NULL DEFAULT 0,
        joined_date TIMESTAMP NOT NULL DEFAULT NOW(),
        api_keys JSONB DEFAULT '{"gptZero": "", "originality": ""}',
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `);

    // Create transactions table if it doesn't exist
    await client.query(`
      CREATE TABLE IF NOT EXISTS transactions (
        id SERIAL PRIMARY KEY,
        transaction_id VARCHAR(50) UNIQUE NOT NULL,
        user_id INTEGER REFERENCES users(id),
        amount DECIMAL(10, 2) NOT NULL,
        phone_number VARCHAR(20) NOT NULL,
        status VARCHAR(20) NOT NULL DEFAULT 'Pending',
        plan VARCHAR(20) NOT NULL,
        payment_method VARCHAR(20) DEFAULT 'M-Pesa',
        date TIMESTAMP NOT NULL DEFAULT NOW(),
        created_at TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `);

    // Create usage_logs table if it doesn't exist
    await client.query(`
      CREATE TABLE IF NOT EXISTS usage_logs (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id),
        action VARCHAR(50) NOT NULL,
        input_length INTEGER NOT NULL,
        output_length INTEGER,
        processing_time INTEGER,
        successful BOOLEAN DEFAULT true,
        error TEXT,
        metadata JSONB,
        created_at TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `);

    console.log('Database tables initialized or already exist');
  } catch (error) {
    console.error(`Error initializing database: ${error.message}`);
    // Don't throw the error, allow the app to continue
    console.log('Continuing without database initialization');
  }
};

// Query wrapper with error handling
const query = async (text, params) => {
  try {
    const result = await pool.query(text, params);
    return result;
  } catch (error) {
    console.error('Database query error:', error.message);
    console.error('Query:', text);
    console.error('Parameters:', params);
    throw error;
  }
};

// Export the pool, connect function, and query helper
module.exports = {
  pool,
  connectDB,
  query
};
