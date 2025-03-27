const { Pool } = require('pg');

// Debug: Print all environment variables to see what Railway is providing
console.log('============= DATABASE DEBUG INFO =============');
console.log('Available environment variables for database connection:');
console.log('DATABASE_URL:', process.env.DATABASE_URL ? '[SET]' : '[NOT SET]');
console.log('DATABASE_PUBLIC_URL:', process.env.DATABASE_PUBLIC_URL ? '[SET]' : '[NOT SET]');
console.log('PGHOST:', process.env.PGHOST || '[NOT SET]');
console.log('PGUSER:', process.env.PGUSER || '[NOT SET]');
console.log('PGDATABASE:', process.env.PGDATABASE || '[NOT SET]');
console.log('PGPORT:', process.env.PGPORT || '[NOT SET]');
console.log('PGPASSWORD:', process.env.PGPASSWORD ? '[SET]' : '[NOT SET]');
console.log('NODE_ENV:', process.env.NODE_ENV || 'development');
console.log('============= END DEBUG INFO =============');

// Direct simplified approach - no fancy conditionals
let connectionConfig;

// OPTION 1: Use Railway's DATABASE_URL directly
if (process.env.DATABASE_URL) {
  console.log('Using DATABASE_URL for PostgreSQL connection');
  connectionConfig = {
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
  };
}
// OPTION 2: Use individual Railway PG environment variables
else if (process.env.PGHOST && process.env.PGUSER && process.env.PGDATABASE) {
  console.log('Using individual PostgreSQL environment variables');
  connectionConfig = {
    host: process.env.PGHOST,
    user: process.env.PGUSER,
    password: process.env.PGPASSWORD,
    database: process.env.PGDATABASE,
    port: parseInt(process.env.PGPORT || '5432'),
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
  };
}
// OPTION 3: HARDCODED FALLBACK for Railway (last resort)
else {
  console.log('WARNING: No PostgreSQL environment variables found - using Railway fallback');
  
  // Look for DATABASE variables in the output we logged above
  // Copy the value from DATABASE_URL in your Railway logs
  // ⚠️ This is just a fallback, Railway should be setting these environment variables
  connectionConfig = {
    connectionString: 'postgresql://postgres:zTJggTeesP3YVM8RWuGvVnUiihMwCwy1@postgres.railway.internal:5432/railway',
    ssl: { rejectUnauthorized: false }
  };
}

// Log the final configuration (without sensitive data)
console.log('Using database connection config (sanitized):');
console.log({
  connectionString: connectionConfig.connectionString ? '(provided)' : '(not provided)',
  host: connectionConfig.host || '(from connectionString)',
  database: connectionConfig.database || '(from connectionString)',
  port: connectionConfig.port || '(from connectionString)',
  ssl: !!connectionConfig.ssl
});

// Create a connection pool with our configuration
const pool = new Pool(connectionConfig);

// Query wrapper with error handling
const query = async (text, params) => {
  try {
    const result = await pool.query(text, params);
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
    console.log('Attempting to connect to PostgreSQL database...');
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
