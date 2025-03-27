const { Pool } = require('pg');

// Debug: Print environment variables and Railway info
console.log('============= RAILWAY ENVIRONMENT DEBUG =============');
console.log('Project ID:', process.env.RAILWAY_PROJECT_ID || '[NOT SET]');
console.log('Service:', process.env.RAILWAY_SERVICE || '[NOT SET]');
console.log('Environment:', process.env.RAILWAY_ENVIRONMENT || '[NOT SET]');
console.log('Static URL:', process.env.RAILWAY_STATIC_URL || '[NOT SET]');
console.log('============= DATABASE VARIABLES =============');
console.log('DATABASE_URL:', process.env.DATABASE_URL ? '[SET]' : '[NOT SET]');
console.log('DATABASE_PRIVATE_URL:', process.env.DATABASE_PRIVATE_URL ? '[SET]' : '[NOT SET]');
console.log('DATABASE_PUBLIC_URL:', process.env.DATABASE_PUBLIC_URL ? '[SET]' : '[NOT SET]');
console.log('PGHOST:', process.env.PGHOST || '[NOT SET]');
console.log('PGUSER:', process.env.PGUSER || '[NOT SET]');
console.log('PGDATABASE:', process.env.PGDATABASE || '[NOT SET]');
console.log('PGPORT:', process.env.PGPORT || '[NOT SET]');
console.log('NODE_ENV:', process.env.NODE_ENV || 'development');
console.log('============= END DEBUG INFO =============');

// If DATABASE_URL is not set, manually add it to process.env
// This is a workaround for Railway's PostgreSQL connection
if (!process.env.DATABASE_URL) {
  console.log('Setting DATABASE_URL explicitly for Railway PostgreSQL');
  // Important: This URL must be correctly set for your Railway PostgreSQL instance!
  // Replace it with your actual connection info from Railway dashboard
  process.env.DATABASE_URL = 'postgresql://postgres:zTJggTeesP3YVM8RWuGvVnUiihMwCwy1@postgres.railway.internal:5432/railway';
  
  // Also add a backup using the public URL
  process.env.DATABASE_PUBLIC_URL = 'postgresql://postgres:zTJggTeesP3YVM8RWuGvVnUiihMwCwy1@containers-us-west-191.railway.app:5432/railway';
}

// Configure PostgreSQL connection - try both internal and public URLs
const primaryConfig = {
  connectionString: process.env.DATABASE_URL,
  ssl: false, // Internal URLs don't need SSL
};

const backupConfig = {
  connectionString: process.env.DATABASE_PUBLIC_URL,
  ssl: { rejectUnauthorized: false },
};

// Create connection pool with primary configuration
let pool;
try {
  console.log('Creating PostgreSQL connection pool with primary configuration (private URL)');
  pool = new Pool(primaryConfig);
  
  // Test the connection immediately with a simple query
  pool.query('SELECT 1')
    .then(() => console.log('Primary database connection successful'))
    .catch(err => {
      console.error('Primary connection failed, trying backup connection:', err.message);
      
      // Try backup connection if primary fails
      pool = new Pool(backupConfig);
      
      pool.query('SELECT 1')
        .then(() => console.log('Backup database connection successful'))
        .catch(backupErr => {
          console.error('Both primary and backup database connections failed:', backupErr.message);
        });
    });
} catch (error) {
  console.error('Error creating PostgreSQL pool:', error.message);
  throw error; // Rethrow to stop application if database is critical
}

// Query helper with error handling
const query = async (text, params) => {
  const start = Date.now();
  try {
    const result = await pool.query(text, params);
    const duration = Date.now() - start;
    if (duration > 200) {
      // Log slow queries
      console.log(`Slow query (${duration}ms): ${text.slice(0, 100)}...`);
    }
    return result;
  } catch (error) {
    console.error('Database query error:');
    console.error('Query:', text);
    console.error('Parameters:', params);
    console.error('Error details:', error.message);
    throw error;
  }
};

// Initialize database
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
    throw error; // Rethrow to indicate database connection is required
  } finally {
    if (client) {
      client.release();
    }
  }
};

// Initialize database structure
const initDatabase = async (client) => {
  try {
    // Enable more detailed PostgreSQL logs for debugging
    await client.query("SET log_statement = 'all'");
    
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
    console.error(`Error initializing database: ${error.message}`);
    throw error; // Rethrow to indicate database initialization is required
  }
};

// Export the pool, connect function, and query helper
module.exports = {
  pool,
  connectDB,
  query
};
