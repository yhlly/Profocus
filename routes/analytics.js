// routes/analytics.js
const express = require('express');
const router = express.Router();
const analyticsController = require('../controllers/analyticsController');
const auth = require('../middleware/auth');

// Get analytics dashboard
router.get('/', auth, analyticsController.getAnalytics);

// Get productivity score
router.get('/productivity-score', auth, analyticsController.getProductivityScore);

module.exports = router;