// controllers/analyticsController.js
const pool = require('../config/db');
const moment = require('moment');

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

        // Get category distribution
        const [categoryData] = await pool.query(
            'SELECT COALESCE(category, "Uncategorized") as category, COUNT(*) as count FROM goals WHERE user_id = ? GROUP BY category',
            [req.user.id]
        );

        // Get weekly focus time
        const [weeklyFocus] = await pool.query(
            `SELECT 
                DATE_FORMAT(start_time, '%Y-%m-%d') as date,
                SUM(TIMESTAMPDIFF(SECOND, start_time, end_time)) / 60 as minutes
            FROM pomodoro_sessions 
            WHERE user_id = ? AND completed = true 
                AND start_time >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)
            GROUP BY DATE_FORMAT(start_time, '%Y-%m-%d')
            ORDER BY date`,
            [req.user.id]
        );

        // Get goal completion trend
        const [completionTrend] = await pool.query(
            `SELECT 
                DATE_FORMAT(created_at, '%Y-%m-%d') as date,
                COUNT(*) as total,
                SUM(CASE WHEN status = 'Completed' THEN 1 ELSE 0 END) as completed
            FROM goals
            WHERE user_id = ? AND created_at >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)
            GROUP BY DATE_FORMAT(created_at, '%Y-%m-%d')
            ORDER BY date`,
            [req.user.id]
        );

        // Format data for rendering
        const analytics = {
            statusCounts: statusCounts.reduce((acc, curr) => {
                acc[curr.status] = curr.count;
                return acc;
            }, { Pending: 0, 'In Progress': 0, Completed: 0 }),
            totalSessions: totalSessions[0].count || 0,
            totalFocusTime: Math.floor((totalFocusTime[0].seconds || 0) / 60), // Convert to minutes
            totalFocusHours: Math.floor((totalFocusTime[0].seconds || 0) / 3600), // Convert to hours
            categoryData: categoryData,
            completionTrend: completionTrend,
            weeklyFocus: weeklyFocus
        };

        // Generate date labels for the last 7 days
        const dateLabels = [];
        const focusData = [];

        for (let i = 6; i >= 0; i--) {
            const date = moment().subtract(i, 'days').format('YYYY-MM-DD');
            dateLabels.push(moment().subtract(i, 'days').format('MM/DD'));

            const focusDay = weeklyFocus.find(day => day.date === date);
            focusData.push(focusDay ? Math.round(focusDay.minutes) : 0);
        }

        analytics.dateLabels = dateLabels;
        analytics.focusData = focusData;

        console.log('Analytics data being sent to template:', analytics);

        res.render('analytics', {
            analytics,
            user: req.user,
            moment
        });
    } catch (err) {
        console.error('Error fetching analytics data:', err);
        req.flash('error_msg', 'Failed to load analytics');
        res.redirect('/dashboard');
    }
};

// Get productivity score
exports.getProductivityScore = async (req, res) => {
    try {
        // Get completion rate
        const [completed] = await pool.query(
            'SELECT COUNT(*) as count FROM goals WHERE user_id = ? AND status = "Completed"',
            [req.user.id]
        );

        const [total] = await pool.query(
            'SELECT COUNT(*) as count FROM goals WHERE user_id = ?',
            [req.user.id]
        );

        const completionRate = total[0].count > 0 ?
            (completed[0].count / total[0].count) * 100 : 0;

        // Get focus consistency
        const [sessions] = await pool.query(
            `SELECT 
                DATE(start_time) as date,
                COUNT(*) as count
            FROM pomodoro_sessions
            WHERE user_id = ? AND completed = true AND start_time >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)
            GROUP BY DATE(start_time)`,
            [req.user.id]
        );

        // Calculate days with sessions
        const daysWithSessions = sessions.length;
        const consistencyRate = (daysWithSessions / 7) * 100;

        // Calculate productivity score (weighted average)
        const productivityScore = Math.round(
            (completionRate * 0.6) + (consistencyRate * 0.4)
        );

        res.json({
            score: productivityScore,
            completionRate: Math.round(completionRate),
            consistencyRate: Math.round(consistencyRate)
        });
    } catch (err) {
        console.error('Error calculating productivity score:', err);
        res.status(500).json({ error: 'Failed to calculate productivity score' });
    }
};