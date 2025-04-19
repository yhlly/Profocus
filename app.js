// app.js
const express = require('express');
const session = require('express-session');
const cookieParser = require('cookie-parser');
const flash = require('connect-flash');
const methodOverride = require('method-override');
const path = require('path');
require('dotenv').config();

// Initialize Express app
const app = express();

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));
app.use(methodOverride('_method'));

// Session configuration
app.use(session({
    secret: process.env.SESSION_SECRET || 'your-secret-key',
    resave: false,
    saveUninitialized: true,
    cookie: { maxAge: 3600000 } // 1 hour
}));
// Connect flash
app.use(flash());

// Global variables - modified to only set when messages exist
app.use((req, res, next) => {
    // Only set flash messages if they exist
    if (req.flash('success_msg').length > 0) {
        res.locals.success_msg = req.flash('success_msg')[0];
    }

    if (req.flash('error_msg').length > 0) {
        res.locals.error_msg = req.flash('error_msg')[0];
    }

    if (req.flash('error').length > 0) {
        res.locals.error = req.flash('error')[0];
    }

    next();
});

// View engine
app.set('view engine', 'ejs');

// Routes
app.use('/', require('./routes/index'));
app.use('/auth', require('./routes/auth'));
app.use('/goals', require('./routes/goals'));
app.use('/analytics-data', require('./routes/analytics'));

// Error handling
app.use((req, res) => {
    res.status(404).render('error', {
        title: '404 Not Found',
        message: 'The page you are looking for does not exist.'
    });
});

app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).render('error', {
        title: '500 Server Error',
        message: 'Something went wrong on our end.'
    });
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});