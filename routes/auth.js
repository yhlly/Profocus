// routes/auth.js
const express = require('express');
const router = express.Router();
const { check } = require('express-validator');
const authController = require('../controllers/authController');
const auth = require('../middleware/auth');

// Registration page
router.get('/register', (req, res) => {
    res.render('register', {
        username: '',
        email: ''
    });
});

// Login page
router.get('/login', (req, res) => {
    res.render('login', {
        email: ''
    });
});

// Register user
router.post(
    '/register',
    [
        check('username')
            .not().isEmpty().withMessage('Username is required')
            .isLength({ min: 2 }).withMessage('Username must be at least 2 characters long')
            .matches(/[a-zA-Z]/).withMessage('Username must contain at least one letter')
            .matches(/^[a-zA-Z0-9]+$/).withMessage('Username can only contain letters and numbers (no spaces or special characters)'),
        check('email')
            .isEmail().withMessage('Please include a valid email (must contain @ and a domain)'),
        check('password')
            .isLength({ min: 8 }).withMessage('Password must be at least 8 characters long')
            .matches(/[a-zA-Z]/).withMessage('Password must contain at least one letter')
            .matches(/[0-9]/).withMessage('Password must contain at least one number'),
        check('password2')
            .not().isEmpty().withMessage('Confirm password is required')
    ],
    authController.register
);

// Login user
router.post(
    '/login',
    [
        check('email', 'Please include a valid email').isEmail(),
        check('password', 'Password is required').exists()
    ],
    authController.login
);

// Logout user
router.get('/logout', authController.logout);

// Delete user account
router.delete('/deleteAccount', auth, authController.deleteAccount);

module.exports = router;