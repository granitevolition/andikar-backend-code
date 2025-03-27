const { Pool } = require('pg');
const config = require('./config');

// Create a connection pool
const pool = new Pool({
  connectionString: config.DATABASE_URL,
  ssl: config.DATABASE_SSL ? { rejectUnauthorized: false } : false
});

// Test the database connection
const connectDB = async () => {
  try {
    const client = await pool.connect();
    console.log('PostgreSQL database connected');
    
    // Check if tables exist, create them if not
    await initDatabase(client);
    
    client.release();
    return pool;
  } catch (error) {
    console.error(`Error connecting to PostgreSQL database: ${error.message}`);
    process.exit(1);
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

    console.log('Database tables initialized');
  } catch (error) {
    console.error(`Error initializing database: ${error.message}`);
    throw error;
  }
};

// Export the pool and connect function
module.exports = {
  pool,
  connectDB
};
