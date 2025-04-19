// models/Goal.js
const pool = require('../config/db');

class Goal {
    constructor(id, user_id, title, description, category, priority, status, deadline, created_at) {
        this.id = id;
        this.user_id = user_id;
        this.title = title;
        this.description = description;
        this.category = category;
        this.priority = priority;
        this.status = status;
        this.deadline = deadline;
        this.created_at = created_at;
    }

    // Find all goals for a user
    static async findByUserId(userId) {
        try {
            const [rows] = await pool.query(
                'SELECT * FROM goals WHERE user_id = ? ORDER BY deadline ASC, priority DESC',
                [userId]
            );

            return rows.map(row => new Goal(
                row.id,
                row.user_id,
                row.title,
                row.description,
                row.category,
                row.priority,
                row.status,
                row.deadline,
                row.created_at
            ));
        } catch (error) {
            console.error('Error finding goals by user ID:', error);
            throw error;
        }
    }

    // Find all active goals for a user
    static async findActiveByUserId(userId) {
        try {
            const [rows] = await pool.query(
                'SELECT * FROM goals WHERE user_id = ? AND status != "Completed" ORDER BY deadline ASC, priority DESC',
                [userId]
            );

            return rows.map(row => new Goal(
                row.id,
                row.user_id,
                row.title,
                row.description,
                row.category,
                row.priority,
                row.status,
                row.deadline,
                row.created_at
            ));
        } catch (error) {
            console.error('Error finding active goals by user ID:', error);
            throw error;
        }
    }

    // Find a goal by ID
    static async findById(id) {
        try {
            const [rows] = await pool.query('SELECT * FROM goals WHERE id = ?', [id]);

            return rows.length ? new Goal(
                rows[0].id,
                rows[0].user_id,
                rows[0].title,
                rows[0].description,
                rows[0].category,
                rows[0].priority,
                rows[0].status,
                rows[0].deadline,
                rows[0].created_at
            ) : null;
        } catch (error) {
            console.error('Error finding goal by ID:', error);
            throw error;
        }
    }

    // Create a new goal
    static async create(userId, title, description, category, priority, deadline) {
        try {
            const [result] = await pool.query(
                'INSERT INTO goals (user_id, title, description, category, priority, deadline) VALUES (?, ?, ?, ?, ?, ?)',
                [userId, title, description, category, priority, deadline || null]
            );

            return result.insertId;
        } catch (error) {
            console.error('Error creating goal:', error);
            throw error;
        }
    }

    // Update a goal
    static async update(id, title, description, category, priority, status, deadline) {
        try {
            const [result] = await pool.query(
                'UPDATE goals SET title = ?, description = ?, category = ?, priority = ?, status = ?, deadline = ? WHERE id = ?',
                [title, description, category, priority, status, deadline || null, id]
            );

            return result.affectedRows > 0;
        } catch (error) {
            console.error('Error updating goal:', error);
            throw error;
        }
    }

    // Delete a goal
    static async delete(id) {
        try {
            const [result] = await pool.query('DELETE FROM goals WHERE id = ?', [id]);

            return result.affectedRows > 0;
        } catch (error) {
            console.error('Error deleting goal:', error);
            throw error;
        }
    }

    // Record a Pomodoro session
    static async recordPomodoro(userId, goalId, startTime, endTime, completed) {
        try {
            const [result] = await pool.query(
                'INSERT INTO pomodoro_sessions (user_id, goal_id, start_time, end_time, completed) VALUES (?, ?, ?, ?, ?)',
                [userId, goalId || null, startTime, endTime, completed]
            );

            return result.insertId;
        } catch (error) {
            console.error('Error recording Pomodoro session:', error);
            throw error;
        }
    }

    // Get goal statistics by category
    static async getCategoryStats(userId) {
        try {
            const [rows] = await pool.query(
                'SELECT category, COUNT(*) as count FROM goals WHERE user_id = ? GROUP BY category',
                [userId]
            );

            return rows;
        } catch (error) {
            console.error('Error getting goal category statistics:', error);
            throw error;
        }
    }

    // Get goal completion trend
    static async getCompletionTrend(userId, days = 30) {
        try {
            const [rows] = await pool.query(
                `SELECT 
                    DATE(created_at) as date, 
                    COUNT(*) as total, 
                    SUM(CASE WHEN status = 'Completed' THEN 1 ELSE 0 END) as completed 
                FROM goals 
                WHERE user_id = ? AND created_at >= DATE_SUB(CURDATE(), INTERVAL ? DAY) 
                GROUP BY DATE(created_at) 
                ORDER BY date`,
                [userId, days]
            );

            return rows;
        } catch (error) {
            console.error('Error getting goal completion trend:', error);
            throw error;
        }
    }
}

module.exports = Goal;