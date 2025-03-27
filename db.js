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

// SIMPLIFIED DATABASE CONNECTION WITH HARDCODED FALLBACKS

let connectionConfig;

// OPTION 1: Try DATABASE_PUBLIC_URL first (most likely to work)
if (process.env.DATABASE_PUBLIC_URL) {
  console.log('Using DATABASE_PUBLIC_URL for PostgreSQL connection');
  connectionConfig = {
    connectionString: process.env.DATABASE_PUBLIC_URL,
    ssl: { rejectUnauthorized: false }
  };
}
// OPTION 2: Try DATABASE_URL
else if (process.env.DATABASE_URL) {
  console.log('Using DATABASE_URL for PostgreSQL connection');
  connectionConfig = {
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  };
}
// OPTION 3: HARDCODED FALLBACK from your screenshots - use the PUBLIC URL
else {
  console.log('WARNING: No PostgreSQL environment variables found - using hardcoded public URL');
  
  // This URL is taken from your screenshot - the DATABASE_PUBLIC_URL value
  connectionConfig = {
    connectionString: 'postgresql://postgres:zTJggTeesP3YVM8RWuGvVnUiihMwCwy1@containers-us-west-191.railway.app:5432/railway',
    ssl: { rejectUnauthorized: false }
  };
}

// Log the sanitized connection config
console.log('Using database connection config (sanitized):');
console.log({
  connectionString: '(provided - first part: ' + 
    connectionConfig.connectionString.substring(0, connectionConfig.connectionString.indexOf('://') + 3) + 
    '*****@*****)',
  ssl: !!connectionConfig.ssl
});

// Create a placeholder pool object that logs errors for non-critical paths
const mockPool = {
  query: async () => {
    console.log('MOCK DB: Operation attempted while database is unavailable');
    throw new Error('Database not available');
  },
  connect: async () => {
    console.log('MOCK DB: Connection attempted while database is unavailable');
    throw new Error('Database not available');
  }
};

// Create a real pool with our configuration
let pool;
try {
  pool = new Pool(connectionConfig);
  
  // Attach error handler
  pool.on('error', (err, client) => {
    console.error('Unexpected PostgreSQL pool error:', err.message);
  });
  
  console.log('PostgreSQL pool created successfully');
} catch (error) {
  console.error('Failed to create PostgreSQL pool:', error.message);
  pool = mockPool; // Use mock pool if real one fails
}

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
    return mockPool; // Return mock pool if connection fails
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
    return false;
  }
};

// Export the pool, connect function, and query helper
module.exports = {
  pool,
  connectDB,
  query
};
