// middleware/auth.js
const jwt = require('jsonwebtoken');
const pool = require('../config/db');

module.exports = async (req, res, next) => {
    try {
        // Get token from cookie
        const token = req.cookies.auth_token;

        if (!token) {
            req.flash('error_msg', 'Please log in to access this page');
            return res.redirect('/auth/login');
        }

        // Verify token
        const decoded = jwt.verify(
            token,
            process.env.JWT_SECRET || 'your-jwt-secret'
        );

        // Get user from database
        const [users] = await pool.query(
            'SELECT id, username, email FROM users WHERE id = ?',
            [decoded.id]
        );

        if (users.length === 0) {
            req.flash('error_msg', 'User not found');
            return res.redirect('/auth/login');
        }

        req.user = users[0];
        next();
    } catch (err) {
        console.error('Auth middleware error:', err);
        req.flash('error_msg', 'Session expired, please log in again');
        res.redirect('/auth/login');
    }
};