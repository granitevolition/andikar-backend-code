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
  
  // THESE VALUES COME DIRECTLY FROM YOUR RAILWAY DASHBOARD SCREENSHOTS
  // Using the exact values shown in your screenshots
  process.env.DATABASE_URL = 'postgresql://postgres:zTJggTeesP3YVM8RWuGvVnUiihMwCwy1@postgres.railway.internal:5432/railway';
  process.env.DATABASE_PUBLIC_URL = 'postgresql://postgres:zTJggTeesP3YVM8RWuGvVnUiihMwCwy1@ballast-postgres-production.railway.internal:5432/railway';
}

// Try multiple connection approaches
let pool;

// Create a function to attempt connection
async function attemptConnection(connectionString, description) {
  try {
    console.log(`Attempting to connect using ${description}...`);
    const testPool = new Pool({ 
      connectionString, 
      ssl: connectionString.includes('.railway.app') ? { rejectUnauthorized: false } : false 
    });
    
    // Test the connection
    const result = await testPool.query('SELECT 1 as test');
    console.log(`Successfully connected using ${description}!`);
    return testPool;
  } catch (error) {
    console.log(`Connection failed using ${description}: ${error.message}`);
    return null;
  }
}

// Try all possible connection strings
async function connectToDatabase() {
  // Connection attempts in order of preference
  const connectionAttempts = [
    // 1. Try the DATABASE_URL from Railway (if set)
    { 
      string: process.env.DATABASE_URL, 
      description: 'Railway DATABASE_URL' 
    },
    // 2. Try the DATABASE_PUBLIC_URL from Railway (if set)
    { 
      string: process.env.DATABASE_PUBLIC_URL, 
      description: 'Railway DATABASE_PUBLIC_URL' 
    },
    // 3. Try explicit connection to the hostnames we've seen in your screenshots
    {
      string: 'postgresql://postgres:zTJggTeesP3YVM8RWuGvVnUiihMwCwy1@postgres.railway.internal:5432/railway',
      description: 'Hardcoded internal connection string'
    },
    {
      string: 'postgresql://postgres:zTJggTeesP3YVM8RWuGvVnUiihMwCwy1@ballast-postgres-production.railway.internal:5432/railway',
      description: 'Hardcoded public connection string'
    },
    // 4. Try to replace "internal" with "app" in the hostnames as a last resort
    {
      string: 'postgresql://postgres:zTJggTeesP3YVM8RWuGvVnUiihMwCwy1@containers-us-west-191.railway.app:5432/railway',
      description: 'External hostname'
    }
  ];

  // Try each connection string in order
  for (const attempt of connectionAttempts) {
    if (!attempt.string) continue;
    
    const result = await attemptConnection(attempt.string, attempt.description);
    if (result) {
      return result;
    }
  }
  
  throw new Error('All database connection attempts failed');
}

// Query helper with error handling
const query = async (text, params) => {
  const start = Date.now();
  try {
    if (!pool) {
      throw new Error('Database pool not initialized');
    }
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
    console.log('Connecting to PostgreSQL database...');
    
    // Try all connection methods
    pool = await connectToDatabase();
    
    // Get a client from the pool
    client = await pool.connect();
    console.log('PostgreSQL database connected successfully!');
    
    // Basic connectivity test
    const result = await client.query('SELECT NOW() as current_time');
    console.log('Database time:', result.rows[0].current_time);
    
    // Initialize database tables
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
