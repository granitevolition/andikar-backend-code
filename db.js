const { Pool } = require('pg');

// Get connection details directly from Railway environment variables when available
// Railway automatically sets DATABASE_URL, PGHOST, PGUSER, etc.
const poolConfig = {
  // Use DATABASE_URL if available (highest priority)
  ...(process.env.DATABASE_URL && { connectionString: process.env.DATABASE_URL }),
  
  // If individual Postgres env vars are set by Railway, use those
  ...(process.env.PGHOST && { host: process.env.PGHOST }),
  ...(process.env.PGUSER && { user: process.env.PGUSER }),
  ...(process.env.PGPASSWORD && { password: process.env.PGPASSWORD }),
  ...(process.env.PGDATABASE && { database: process.env.PGDATABASE }),
  ...(process.env.PGPORT && { port: parseInt(process.env.PGPORT) }),
  
  // SSL config for production
  ...(process.env.NODE_ENV === 'production' && { 
    ssl: { rejectUnauthorized: false }
  })
};

// For debugging connection issues
console.log('PostgreSQL connection config (sanitized):');
console.log({
  host: poolConfig.host || '(from connectionString)',
  user: poolConfig.user || '(from connectionString)',
  database: poolConfig.database || '(from connectionString)',
  port: poolConfig.port || '(from connectionString)',
  ssl: poolConfig.ssl || false,
  connectionString: poolConfig.connectionString ? '(set)' : '(not set)'
});

// Create connection pool
const pool = new Pool(poolConfig);

// Log pool events
pool.on('connect', client => {
  console.log('New client connected to PostgreSQL');
});

pool.on('error', (err, client) => {
  console.error('Unexpected error on idle PostgreSQL client:', err);
});

// Query helper with error handling
const query = async (text, params) => {
  const start = Date.now();
  try {
    const result = await pool.query(text, params);
    const duration = Date.now() - start;
    console.log(`Executed query in ${duration}ms: ${text.substring(0, 50)}${text.length > 50 ? '...' : ''}`);
    return result;
  } catch (error) {
    console.error('Database query error:');
    console.error('Query:', text);
    console.error('Parameters:', params);
    console.error('Error details:', error.message);
    throw error;
  }
};

// Test the database connection
const connectDB = async () => {
  let client;
  try {
    client = await pool.connect();
    console.log('PostgreSQL database connected successfully!');
    
    // Basic connectivity test
    const result = await client.query('SELECT NOW() as current_time');
    console.log('Database time:', result.rows[0].current_time);
    
    // Check if tables exist, create them if not
    await initDatabase(client);
    
    return pool;
  } catch (error) {
    console.error(`Error connecting to PostgreSQL database: ${error.message}`);
    // Don't terminate the process, allow the application to run without database temporarily
    return pool;
  } finally {
    if (client) {
      client.release();
      console.log('Database client released');
    }
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

// Export the pool, connect function, and query helper
module.exports = {
  pool,
  connectDB,
  query
};
