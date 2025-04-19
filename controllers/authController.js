// controllers/authController.js
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('../config/db');
const { validationResult } = require('express-validator');

// Register user
exports.register = async (req, res) => {
    try {
        // Check for validation errors
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            console.log('Validation errors:', errors.array());
            return res.render('register', {
                errors: errors.array(),
                username: req.body.username,
                email: req.body.email
            });
        }

        const { username, email, password, password2 } = req.body;

        // Check if passwords match
        if (password !== password2) {
            console.log('Passwords do not match');
            return res.render('register', {
                errors: [{ msg: 'Passwords do not match', param: 'password2' }],
                username,
                email,
                passwordMismatch: true
            });
        }

        console.log('Checking if user exists...');
        // Check if user already exists
        const [existingUsers] = await pool.query(
            'SELECT * FROM users WHERE email = ? OR username = ?',
            [email, username]
        );

        if (existingUsers.length > 0) {
            console.log('User already exists');
            const existingUser = existingUsers[0];
            let errorMessage;
            let errorParam;

            if (existingUser.email === email) {
                errorMessage = 'Email is already registered';
                errorParam = 'email';
            } else {
                errorMessage = 'Username is already taken';
                errorParam = 'username';
            }

            return res.render('register', {
                errors: [{ msg: errorMessage, param: errorParam }],
                username,
                email
            });
        }

        console.log('Hashing password...');
        // Hash password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        console.log('Inserting user into database...');
        // Insert user into database
        const [result] = await pool.query(
            'INSERT INTO users (username, email, password) VALUES (?, ?, ?)',
            [username, email, hashedPassword]
        );

        console.log('User registered successfully');
        req.flash('success_msg', 'You are now registered and can log in');
        return res.redirect('/auth/login');
    } catch (err) {
        console.error('Registration error:', err);
        req.flash('error_msg', 'Server error, please try again later');
        return res.render('register', {
            username: req.body.username,
            email: req.body.email
        });
    }
};

// Login user
exports.login = async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            console.log('Login validation errors:', errors.array());
            return res.render('login', {
                errors: errors.array(),
                email: req.body.email
            });
        }

        const { email, password } = req.body;
        console.log('Attempting login for:', email);

        // Check if user exists
        const [users] = await pool.query(
            'SELECT * FROM users WHERE email = ?',
            [email]
        );

        if (users.length === 0) {
            console.log('User not found');
            return res.render('login', {
                errors: [{ msg: 'Invalid email or password' }],
                email
            });
        }

        const user = users[0];
        console.log('User found, checking password...');

        // Check password
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            console.log('Password does not match');
            return res.render('login', {
                errors: [{ msg: 'Invalid email or password' }],
                email
            });
        }

        console.log('Password matched, creating token...');
        // Create token
        const token = jwt.sign(
            { id: user.id },
            process.env.JWT_SECRET || 'your-jwt-secret',
            { expiresIn: '1h' }
        );

        // Set cookie
        res.cookie('auth_token', token, {
            httpOnly: true,
            maxAge: 3600000 // 1 hour
        });

        console.log('Login successful, redirecting to dashboard');
        return res.redirect('/dashboard');
    } catch (err) {
        console.error('Login error:', err);
        req.flash('error_msg', 'Server error, please try again later');
        return res.render('login', {
            email: req.body.email
        });
    }
};

// Logout user
exports.logout = (req, res) => {
    res.clearCookie('auth_token');
    req.flash('success_msg', 'You are logged out');
    res.redirect('/auth/login');
};

// Delete user account
exports.deleteAccount = async (req, res) => {
    try {
        const userId = req.user.id;
        console.log(`Attempting to delete user account with ID: ${userId}`);

        // First, delete all related data
        // Note: If you've set up CASCADE deletion in your database, this might not be necessary
        await pool.query('DELETE FROM pomodoro_sessions WHERE user_id = ?', [userId]);
        await pool.query('DELETE FROM goals WHERE user_id = ?', [userId]);

        // Then delete the user
        const [result] = await pool.query('DELETE FROM users WHERE id = ?', [userId]);

        if (result.affectedRows === 0) {
            console.log('No user found with the given ID');
            req.flash('error_msg', 'Account deletion failed. User not found.');
            return res.redirect('/dashboard');
        }

        // Clear the auth cookie
        res.clearCookie('auth_token');

        console.log(`User account with ID: ${userId} successfully deleted`);
        req.flash('success_msg', 'Your account has been permanently deleted');
        res.redirect('/');
    } catch (err) {
        console.error('Error deleting account:', err);
        req.flash('error_msg', 'An error occurred while deleting your account');
        res.redirect('/dashboard');
    }
};