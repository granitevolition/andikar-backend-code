const { pool } = require('../db');

class Transaction {
  // Create a new transaction
  static async create(transactionData) {
    try {
      const result = await pool.query(
        `INSERT INTO transactions 
        (transaction_id, user_id, amount, phone_number, status, plan, payment_method, date) 
        VALUES ($1, $2, $3, $4, $5, $6, $7, NOW()) 
        RETURNING *`,
        [
          transactionData.transactionId,
          transactionData.userId,
          transactionData.amount,
          transactionData.phoneNumber,
          transactionData.status || 'Pending',
          transactionData.plan,
          transactionData.paymentMethod || 'M-Pesa'
        ]
      );
      
      return this.formatTransaction(result.rows[0]);
    } catch (error) {
      console.error('Error creating transaction:', error);
      throw error;
    }
  }

  // Find transaction by ID
  static async findById(id) {
    try {
      const result = await pool.query('SELECT * FROM transactions WHERE id = $1', [id]);
      if (result.rows.length === 0) return null;
      return this.formatTransaction(result.rows[0]);
    } catch (error) {
      console.error('Error finding transaction by ID:', error);
      throw error;
    }
  }

  // Find transaction by transaction ID
  static async findByTransactionId(transactionId) {
    try {
      const result = await pool.query('SELECT * FROM transactions WHERE transaction_id = $1', [transactionId]);
      if (result.rows.length === 0) return null;
      return this.formatTransaction(result.rows[0]);
    } catch (error) {
      console.error('Error finding transaction by transaction ID:', error);
      throw error;
    }
  }

  // Get all transactions for a user
  static async findByUserId(userId) {
    try {
      const result = await pool.query('SELECT * FROM transactions WHERE user_id = $1 ORDER BY date DESC', [userId]);
      return result.rows.map(this.formatTransaction);
    } catch (error) {
      console.error('Error finding transactions by user ID:', error);
      throw error;
    }
  }

  // Update transaction status
  static async updateStatus(id, status) {
    try {
      const result = await pool.query(
        'UPDATE transactions SET status = $1, updated_at = NOW() WHERE id = $2 RETURNING *',
        [status, id]
      );
      
      if (result.rows.length === 0) return null;
      return this.formatTransaction(result.rows[0]);
    } catch (error) {
      console.error('Error updating transaction status:', error);
      throw error;
    }
  }

  // Helper to format transaction object
  static formatTransaction(transaction) {
    return {
      id: transaction.id,
      transactionId: transaction.transaction_id,
      userId: transaction.user_id,
      amount: parseFloat(transaction.amount),
      phoneNumber: transaction.phone_number,
      status: transaction.status,
      plan: transaction.plan,
      paymentMethod: transaction.payment_method,
      date: transaction.date,
      createdAt: transaction.created_at
    };
  }
}

module.exports = Transaction;
