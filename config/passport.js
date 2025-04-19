// config/passport.js
const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;
const bcrypt = require('bcryptjs');
const pool = require('./db');

module.exports = function(passport) {
    passport.use(
        new LocalStrategy({ usernameField: 'email' }, async (email, password, done) => {
            try {
                // Match user
                const [users] = await pool.query(
                    'SELECT * FROM users WHERE email = ?',
                    [email]
                );

                if (users.length === 0) {
                    return done(null, false, { message: 'That email is not registered' });
                }

                const user = users[0];

                // Match password
                bcrypt.compare(password, user.password, (err, isMatch) => {
                    if (err) throw err;
                    if (isMatch) {
                        return done(null, user);
                    } else {
                        return done(null, false, { message: 'Password incorrect' });
                    }
                });
            } catch (err) {
                console.error('Passport error:', err);
                return done(err);
            }
        })
    );

    passport.serializeUser((user, done) => {
        done(null, user.id);
    });

    passport.deserializeUser(async (id, done) => {
        try {
            const [users] = await pool.query(
                'SELECT id, username, email FROM users WHERE id = ?',
                [id]
            );

            done(null, users[0]);
        } catch (err) {
            done(err, null);
        }
    });
};