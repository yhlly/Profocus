// routes/goals.js
const express = require('express');
const router = express.Router();
const { check } = require('express-validator');
const goalController = require('../controllers/goalController');
const auth = require('../middleware/auth');

// Get all goals for a user
router.get('/', auth, goalController.getGoals);

// Create a new goal
router.post(
    '/',
    [
        auth,
        check('title', 'Title is required').not().isEmpty(),
        check('priority', 'Priority must be Low, Medium, or High').isIn(['Low', 'Medium', 'High'])
    ],
    goalController.createGoal
);

// Update a goal
router.put(
    '/:id',
    [
        auth,
        check('title', 'Title is required').not().isEmpty(),
        check('priority', 'Priority must be Low, Medium, or High').isIn(['Low', 'Medium', 'High']),
        check('status', 'Status must be Pending or Completed').isIn(['Pending', 'Completed'])
    ],
    goalController.updateGoal
);

// Delete a goal
router.delete('/:id', auth, goalController.deleteGoal);

// Record Pomodoro session
router.post('/pomodoro', auth, goalController.recordPomodoro);

// Get goal details
router.get('/:id/details', auth, goalController.getGoalDetails);

// Mark goal as completed
router.post('/:id/complete', auth, goalController.completeGoal);

module.exports = router;