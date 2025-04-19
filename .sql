-- Create database
CREATE DATABASE profocus;
USE profocus;

-- Create users table
CREATE TABLE users (
                       id INT AUTO_INCREMENT PRIMARY KEY,
                       username VARCHAR(50) NOT NULL UNIQUE,
                       email VARCHAR(100) NOT NULL UNIQUE,
                       password VARCHAR(255) NOT NULL,
                       created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create goals table
CREATE TABLE goals (
                       id INT AUTO_INCREMENT PRIMARY KEY,
                       user_id INT NOT NULL,
                       title VARCHAR(100) NOT NULL,
                       description TEXT,
                       category VARCHAR(50),
                       priority ENUM('Low', 'Medium', 'High') DEFAULT 'Medium',
                       status ENUM('Pending', 'In Progress', 'Completed') DEFAULT 'Pending',
                       deadline DATE,
                       created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                       FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Create pomodoro_sessions table
CREATE TABLE pomodoro_sessions (
                       id INT AUTO_INCREMENT PRIMARY KEY,
                       user_id INT NOT NULL,
                       goal_id INT,
                       start_time TIMESTAMP NOT NULL,
                       end_time TIMESTAMP,
                       completed BOOLEAN DEFAULT FALSE,
                       FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
                       FOREIGN KEY (goal_id) REFERENCES goals(id) ON DELETE SET NULL
);

-- Add estimated_pomodoros column to goals table
ALTER TABLE goals ADD COLUMN estimated_pomodoros INT DEFAULT 1;


-- Alter the goals table to update the status enum
-- Note: Some database systems might require recreating the table to modify enums
-- For MySQL:
ALTER TABLE goals MODIFY COLUMN status ENUM('Pending', 'Completed') DEFAULT 'Pending';