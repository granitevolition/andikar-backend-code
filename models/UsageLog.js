const { pool } = require('../db');

class UsageLog {
  // Create a new usage log
  static async create(logData) {
    try {
      const result = await pool.query(
        `INSERT INTO usage_logs 
        (user_id, action, input_length, output_length, processing_time, successful, error, metadata) 
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8) 
        RETURNING *`,
        [
          logData.userId,
          logData.action,
          logData.inputLength,
          logData.outputLength || null,
          logData.processingTime || null,
          logData.successful !== undefined ? logData.successful : true,
          logData.error || null,
          logData.metadata ? JSON.stringify(logData.metadata) : null
        ]
      );
      
      return this.formatLog(result.rows[0]);
    } catch (error) {
      console.error('Error creating usage log:', error);
      throw error;
    }
  }

  // Find logs by user ID
  static async findByUserId(userId, limit = 100) {
    try {
      const result = await pool.query(
        'SELECT * FROM usage_logs WHERE user_id = $1 ORDER BY created_at DESC LIMIT $2',
        [userId, limit]
      );
      
      return result.rows.map(this.formatLog);
    } catch (error) {
      console.error('Error finding logs by user ID:', error);
      throw error;
    }
  }

  // Get count of logs by action type for a user
  static async countByAction(userId, action) {
    try {
      const result = await pool.query(
        'SELECT COUNT(*) FROM usage_logs WHERE user_id = $1 AND action = $2',
        [userId, action]
      );
      
      return parseInt(result.rows[0].count);
    } catch (error) {
      console.error('Error counting logs by action:', error);
      throw error;
    }
  }

  // Get total character count for a user
  static async getTotalInputChars(userId) {
    try {
      const result = await pool.query(
        'SELECT SUM(input_length) FROM usage_logs WHERE user_id = $1',
        [userId]
      );
      
      return parseInt(result.rows[0].sum || 0);
    } catch (error) {
      console.error('Error getting total input characters:', error);
      throw error;
    }
  }

  // Get total output character count for a user
  static async getTotalOutputChars(userId) {
    try {
      const result = await pool.query(
        'SELECT SUM(output_length) FROM usage_logs WHERE user_id = $1 AND output_length IS NOT NULL',
        [userId]
      );
      
      return parseInt(result.rows[0].sum || 0);
    } catch (error) {
      console.error('Error getting total output characters:', error);
      throw error;
    }
  }

  // Helper to format log object
  static formatLog(log) {
    return {
      id: log.id,
      userId: log.user_id,
      action: log.action,
      inputLength: log.input_length,
      outputLength: log.output_length,
      processingTime: log.processing_time,
      successful: log.successful,
      error: log.error,
      metadata: log.metadata,
      createdAt: log.created_at
    };
  }
}

module.exports = UsageLog;
