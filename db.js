const { Pool } = require('pg');

// Simple PostgreSQL connection setup
// Railway automatically injects the DATABASE_URL environment variable
// This approach follows what worked in the original railway-test-api
let pool;

// Debug information for connection
console.log('Creating PostgreSQL connection pool...');
console.log('NODE_ENV:', process.env.NODE_ENV || 'development');
console.log('Using DATABASE_URL environment variable:', process.env.DATABASE_URL ? 'Yes' : 'No');

try {
  // Create a connection pool without specifying connection details
  // Railway will automatically inject the DATABASE_URL environment variable
  // This is the simplest approach that should work with Railway
  pool = new Pool({
    // SSL configuration for production environments
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
  });
  
  console.log('PostgreSQL pool created successfully');
} catch (error) {
  console.error('Error creating PostgreSQL pool:', error.message);
  throw error;
}

// Simple query helper
const query = async (text, params) => {
  try {
    const result = await pool.query(text, params);
    return result;
  } catch (error) {
    console.error('Database query error:', error.message);
    throw error;
  }
};

// Initialize database connection
const connectDB = async () => {
  let client;
  try {
    console.log('Connecting to PostgreSQL database...');
    client = await pool.connect();
    console.log('PostgreSQL database connected successfully!');
    
    // Test the connection
    const result = await client.query('SELECT NOW() as time');
    console.log('Database server time:', result.rows[0].time);
    
    // Initialize database structure
    await initDatabase(client);
    
    return pool;
  } catch (error) {
    console.error('Error connecting to PostgreSQL database:', error.message);
    throw error;
  } finally {
    if (client) client.release();
  }
};

// Initialize database tables
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
    return true;
  } catch (error) {
    console.error('Error initializing database:', error.message);
    throw error;
  }
};

// Export the pool, connect function, and query helper
module.exports = {
  pool,
  connectDB,
  query
};
