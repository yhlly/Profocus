// controllers/goalController.js
const pool = require('../config/db');
const { validationResult } = require('express-validator');
const moment = require('moment');

// Get all goals for a user
exports.getGoals = async (req, res) => {
    try {
        const [goals] = await pool.query(
            'SELECT * FROM goals WHERE user_id = ? ORDER BY deadline ASC, priority DESC',
            [req.user.id]
        );

        res.render('dashboard', { goals, user: req.user });
    } catch (err) {
        console.error(err);
        req.flash('error_msg', 'Failed to load goals');
        res.redirect('/dashboard');
    }
};

// Create a new goal
exports.createGoal = async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            req.flash('error_msg', 'Please correct the errors in the form');
            return res.redirect('/dashboard');
        }

        const { title, description, category, priority, deadline, estimated_pomodoros } = req.body;
        const estimatedPomodoros = parseInt(estimated_pomodoros) || 1; // Default to 1 if not provided

        await pool.query(
            'INSERT INTO goals (user_id, title, description, category, priority, deadline, estimated_pomodoros) VALUES (?, ?, ?, ?, ?, ?, ?)',
            [req.user.id, title, description, category, priority, deadline || null, estimatedPomodoros]
        );

        req.flash('success_msg', 'Goal added successfully');
        res.redirect('/dashboard');
    } catch (err) {
        console.error(err);
        req.flash('error_msg', 'Failed to add goal');
        res.redirect('/dashboard');
    }
};

// Update a goal
exports.updateGoal = async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            req.flash('error_msg', 'Please correct the errors in the form');
            return res.redirect('/dashboard');
        }

        const { title, description, category, priority, status, deadline, estimated_pomodoros } = req.body;
        const goalId = req.params.id;
        const estimatedPomodoros = parseInt(estimated_pomodoros) || 1; // Default to 1 if not provided

        // Check if goal belongs to user
        const [goals] = await pool.query(
            'SELECT * FROM goals WHERE id = ? AND user_id = ?',
            [goalId, req.user.id]
        );

        if (goals.length === 0) {
            req.flash('error_msg', 'Goal not found');
            return res.redirect('/dashboard');
        }

        await pool.query(
            'UPDATE goals SET title = ?, description = ?, category = ?, priority = ?, status = ?, deadline = ?, estimated_pomodoros = ? WHERE id = ?',
            [title, description, category, priority, status, deadline || null, estimatedPomodoros, goalId]
        );

        req.flash('success_msg', 'Goal updated successfully');
        res.redirect('/dashboard');
    } catch (err) {
        console.error(err);
        req.flash('error_msg', 'Failed to update goal');
        res.redirect('/dashboard');
    }
};

// Delete a goal
exports.deleteGoal = async (req, res) => {
    try {
        const goalId = req.params.id;

        // Check if goal belongs to user
        const [goals] = await pool.query(
            'SELECT * FROM goals WHERE id = ? AND user_id = ?',
            [goalId, req.user.id]
        );

        if (goals.length === 0) {
            req.flash('error_msg', 'Goal not found');
            return res.redirect('/dashboard');
        }

        await pool.query('DELETE FROM goals WHERE id = ?', [goalId]);

        req.flash('success_msg', 'Goal deleted successfully');
        res.redirect('/dashboard');
    } catch (err) {
        console.error(err);
        req.flash('error_msg', 'Failed to delete goal');
        res.redirect('/dashboard');
    }
};

// Record Pomodoro session
exports.recordPomodoro = async (req, res) => {
    try {
        const { goalId, startTime, endTime, completed, pomodoroNumber, totalPomodoros } = req.body;

        // Convert ISO datetime strings to MySQL datetime format
        const formattedStartTime = moment(startTime).format('YYYY-MM-DD HH:mm:ss');
        const formattedEndTime = moment(endTime).format('YYYY-MM-DD HH:mm:ss');

        console.log('Recording pomodoro session:');
        console.log('User ID:', req.user.id);
        console.log('Goal ID:', goalId || 'null');
        console.log('Start Time:', formattedStartTime);
        console.log('End Time:', formattedEndTime);
        console.log('Pomodoro:', pomodoroNumber, 'of', totalPomodoros);

        // Check if the pomodoro_sessions table has the new columns
        try {
            await pool.query(
                'INSERT INTO pomodoro_sessions (user_id, goal_id, start_time, end_time, completed, pomodoro_number, total_pomodoros) VALUES (?, ?, ?, ?, ?, ?, ?)',
                [req.user.id, goalId || null, formattedStartTime, formattedEndTime, completed, pomodoroNumber || 1, totalPomodoros || 1]
            );
        } catch (error) {
            // If the new columns don't exist, use the original query
            console.error('Using fallback query without pomodoro count fields:', error);
            await pool.query(
                'INSERT INTO pomodoro_sessions (user_id, goal_id, start_time, end_time, completed) VALUES (?, ?, ?, ?, ?)',
                [req.user.id, goalId || null, formattedStartTime, formattedEndTime, completed]
            );
        }

        // If this session is the final pomodoro for a goal, update the goal status
        let goalUpdated = false;
        if (goalId && completed && pomodoroNumber >= totalPomodoros) {
            await pool.query(
                'UPDATE goals SET status = "Completed" WHERE id = ? AND user_id = ?',
                [goalId, req.user.id]
            );
            console.log(`Updated goal ${goalId} status to Completed after final pomodoro`);
            goalUpdated = true;
        }

        res.status(200).json({
            success: true,
            message: 'Session recorded successfully',
            goalUpdated: goalUpdated
        });
    } catch (err) {
        console.error('Error recording Pomodoro session:', err);
        res.status(500).json({ success: false, error: 'Failed to record session' });
    }
};

// Get timer page with active goals
exports.getTimer = async (req, res) => {
    try {
        // Get active goals for the current user
        const [goals] = await pool.query(
            'SELECT * FROM goals WHERE user_id = ? AND status != "Completed"',
            [req.user.id]
        );

        // Get existing pomodoro sessions for the current user
        const [userSessions] = await pool.query(
            'SELECT p.*, g.title as goal_title ' +
            'FROM pomodoro_sessions p ' +
            'LEFT JOIN goals g ON p.goal_id = g.id ' +
            'WHERE p.user_id = ? AND p.completed = true ' +
            'ORDER BY p.start_time DESC ' +
            'LIMIT 10',
            [req.user.id]
        );

        // Format sessions for the frontend
        const formattedSessions = userSessions.map(session => ({
            id: session.id,
            startTime: session.start_time,
            endTime: session.end_time,
            duration: Math.floor((new Date(session.end_time) - new Date(session.start_time)) / 1000),
            isWorkSession: true,
            goalId: session.goal_id,
            goalText: session.goal_title || 'No goal selected',
            pomodoroNumber: session.pomodoro_number || 1,
            totalPomodoros: session.total_pomodoros || 1
        }));

        // Additional parameters can be passed to the timer page
        const goalId = req.query.goalId || null;
        const duration = req.query.duration || 25;
        const breakDuration = req.query.breakDuration || 5;

        res.render('timer', {
            goals,
            user: req.user,
            goalId,
            duration,
            breakDuration,
            existingSessions: JSON.stringify(formattedSessions)
        });
    } catch (err) {
        console.error(err);
        req.flash('error_msg', 'Failed to load timer');
        res.redirect('/dashboard');
    }
};

// Get goal details
exports.getGoalDetails = async (req, res) => {
    try {
        const goalId = req.params.id;

        // Check if goal belongs to user
        const [goals] = await pool.query(
            'SELECT * FROM goals WHERE id = ? AND user_id = ?',
            [goalId, req.user.id]
        );

        if (goals.length === 0) {
            return res.status(404).json({ success: false, message: 'Goal not found' });
        }

        res.status(200).json({ success: true, goal: goals[0] });
    } catch (err) {
        console.error('Error getting goal details:', err);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

// Mark goal as completed
exports.completeGoal = async (req, res) => {
    try {
        const goalId = req.params.id;

        // Check if goal belongs to user
        const [goals] = await pool.query(
            'SELECT * FROM goals WHERE id = ? AND user_id = ?',
            [goalId, req.user.id]
        );

        if (goals.length === 0) {
            return res.status(404).json({ success: false, message: 'Goal not found' });
        }

        // Update goal status to completed
        await pool.query(
            'UPDATE goals SET status = "Completed" WHERE id = ?',
            [goalId]
        );

        res.status(200).json({ success: true, message: 'Goal marked as completed' });
    } catch (err) {
        console.error('Error completing goal:', err);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

// Get analytics data
exports.getAnalytics = async (req, res) => {
    try {
        // Get goal statistics
        const [statusCounts] = await pool.query(
            'SELECT status, COUNT(*) as count FROM goals WHERE user_id = ? GROUP BY status',
            [req.user.id]
        );

        // Get Pomodoro statistics
        const [totalSessions] = await pool.query(
            'SELECT COUNT(*) as count FROM pomodoro_sessions WHERE user_id = ? AND completed = true',
            [req.user.id]
        );

        const [totalFocusTime] = await pool.query(
            'SELECT SUM(TIMESTAMPDIFF(SECOND, start_time, end_time)) as seconds FROM pomodoro_sessions WHERE user_id = ? AND completed = true',
            [req.user.id]
        );

        // Format data for rendering
        const analytics = {
            statusCounts: statusCounts.reduce((acc, curr) => {
                acc[curr.status] = curr.count;
                return acc;
            }, { Pending: 0, 'In Progress': 0, Completed: 0 }),
            totalSessions: totalSessions[0].count,
            totalFocusTime: Math.floor((totalFocusTime[0].seconds || 0) / 60), // Convert to minutes
            totalFocusHours: Math.floor((totalFocusTime[0].seconds || 0) / 3600) // Convert to hours
        };

        res.render('analytics', { analytics, user: req.user });
    } catch (err) {
        console.error(err);
        req.flash('error_msg', 'Failed to load analytics');
        res.redirect('/dashboard');
    }
};