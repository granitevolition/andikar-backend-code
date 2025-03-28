const { pool, query } = require('../db');
const bcrypt = require('bcrypt');

class User {
  // Get user by ID
  static async findById(id) {
    try {
      const result = await query('SELECT * FROM users WHERE id = $1', [id]);
      if (result.rows.length === 0) return null;
      return this.formatUser(result.rows[0]);
    } catch (error) {
      console.error('Error finding user by ID:', error);
      // Return null instead of throwing error for better error handling
      return null;
    }
  }

  // Get user by username
  static async findOne(criteria) {
    try {
      if (criteria.username) {
        const result = await query('SELECT * FROM users WHERE username = $1', [criteria.username]);
        if (result.rows.length === 0) return null;
        return this.formatUser(result.rows[0]);
      }
      return null;
    } catch (error) {
      console.error('Error finding user:', error);
      return null;
    }
  }

  // Create new user
  static async create(userData) {
    try {
      // Hash the password
      const hashedPassword = await bcrypt.hash(userData.password, 10);
      
      // Set payment status (Free tier is automatically Paid)
      const paymentStatus = userData.plan === 'Free' ? 'Paid' : 'Pending';
      
      const result = await query(
        'INSERT INTO users (username, password, plan, payment_status, words_used, joined_date) VALUES ($1, $2, $3, $4, $5, NOW()) RETURNING *',
        [userData.username, hashedPassword, userData.plan || 'Free', paymentStatus, 0]
      );
      
      return this.formatUser(result.rows[0]);
    } catch (error) {
      console.error('Error creating user:', error);
      throw error;
    }
  }

  // Update user data
  static async updateById(id, updateData) {
    try {
      const updates = [];
      const values = [];
      let counter = 1;
      
      // Build the SET part of the query
      for (const [key, value] of Object.entries(updateData)) {
        if (key !== 'id' && key !== 'password') {
          updates.push(`${this.camelToSnake(key)} = $${counter}`);
          values.push(value);
          counter++;
        }
      }
      
      // Add password update if provided
      if (updateData.password) {
        const hashedPassword = await bcrypt.hash(updateData.password, 10);
        updates.push(`password = $${counter}`);
        values.push(hashedPassword);
        counter++;
      }
      
      if (updates.length === 0) return await this.findById(id);
      
      // Add updated_at timestamp
      updates.push(`updated_at = NOW()`);
      
      // Add ID as the last parameter
      values.push(id);
      
      const queryStr = `UPDATE users SET ${updates.join(', ')} WHERE id = $${counter} RETURNING *`;
      const result = await query(queryStr, values);
      
      if (result.rows.length === 0) return null;
      return this.formatUser(result.rows[0]);
    } catch (error) {
      console.error('Error updating user:', error);
      return null;
    }
  }

  // Create default demo user if it doesn't exist
  static async createDefaultUser() {
    try {
      // Check if default user exists
      const existingUser = await this.findOne({ username: 'demo' });
      if (existingUser) {
        console.log('Default user already exists');
        return existingUser;
      }

      // Create default user
      const defaultUser = await this.create({
        username: 'demo',
        password: 'demo',
        plan: 'Basic',
        paymentStatus: 'Paid',
        wordsUsed: 125
      });

      console.log('Default demo user created');
      return defaultUser;
    } catch (error) {
      console.error('Error creating default user:', error);
      return null;
    }
  }

  // Helper to convert camelCase to snake_case
  static camelToSnake(str) {
    return str.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
  }

  // Helper to format user object
  static formatUser(user) {
    if (!user) return null;
    
    // Convert snake_case to camelCase
    const formattedUser = {
      id: user.id,
      username: user.username,
      password: user.password, // Keep password for auth compare
      plan: user.plan,
      paymentStatus: user.payment_status,
      wordsUsed: user.words_used,
      joinedDate: user.joined_date,
      apiKeys: user.api_keys || { gptZero: '', originality: '' },
      createdAt: user.created_at,
      updatedAt: user.updated_at
    };
    
    // Add comparePassword method
    formattedUser.comparePassword = async function(candidatePassword) {
      try {
        return await bcrypt.compare(candidatePassword, this.password);
      } catch (err) {
        console.error('Password comparison error:', err);
        return false;
      }
    };
    
    return formattedUser;
  }
}

module.exports = User;
