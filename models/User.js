// models/User.js
const pool = require('../config/db');
const bcrypt = require('bcryptjs');

class User {
    constructor(id, username, email, password, created_at) {
        this.id = id;
        this.username = username;
        this.email = email;
        this.password = password;
        this.created_at = created_at;
    }

    // Find user by ID
    static async findById(id) {
        try {
            const [rows] = await pool.query('SELECT * FROM users WHERE id = ?', [id]);
            return rows.length ? new User(
                rows[0].id,
                rows[0].username,
                rows[0].email,
                rows[0].password,
                rows[0].created_at
            ) : null;
        } catch (error) {
            console.error('Error finding user by ID:', error);
            throw error;
        }
    }

    // Find user by email
    static async findByEmail(email) {
        try {
            const [rows] = await pool.query('SELECT * FROM users WHERE email = ?', [email]);
            return rows.length ? new User(
                rows[0].id,
                rows[0].username,
                rows[0].email,
                rows[0].password,
                rows[0].created_at
            ) : null;
        } catch (error) {
            console.error('Error finding user by email:', error);
            throw error;
        }
    }

    // Create a new user
    static async create(username, email, password) {
        try {
            // Hash password
            const salt = await bcrypt.genSalt(10);
            const hashedPassword = await bcrypt.hash(password, salt);

            // Insert user into database
            const [result] = await pool.query(
                'INSERT INTO users (username, email, password) VALUES (?, ?, ?)',
                [username, email, hashedPassword]
            );

            return result.insertId;
        } catch (error) {
            console.error('Error creating user:', error);
            throw error;
        }
    }

    // Get user statistics
    async getStatistics() {
        try {
            // Get goal statistics
            const [statusCounts] = await pool.query(
                'SELECT status, COUNT(*) as count FROM goals WHERE user_id = ? GROUP BY status',
                [this.id]
            );

            // Get Pomodoro statistics
            const [totalSessions] = await pool.query(
                'SELECT COUNT(*) as count FROM pomodoro_sessions WHERE user_id = ? AND completed = true',
                [this.id]
            );

            const [totalFocusTime] = await pool.query(
                'SELECT SUM(TIMESTAMPDIFF(SECOND, start_time, end_time)) as seconds FROM pomodoro_sessions WHERE user_id = ? AND completed = true',
                [this.id]
            );

            return {
                goals: statusCounts.reduce((acc, curr) => {
                    acc[curr.status] = curr.count;
                    return acc;
                }, { Pending: 0, 'In Progress': 0, Completed: 0 }),
                sessions: totalSessions[0].count,
                focusTime: Math.floor((totalFocusTime[0].seconds || 0) / 60) // Convert to minutes
            };
        } catch (error) {
            console.error('Error getting user statistics:', error);
            throw error;
        }
    }
}

module.exports = User;