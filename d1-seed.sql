-- =============================================
-- Seed Data for LMS D1 Database
-- =============================================

-- Users (passwords are bcrypt hashed)
-- admin password: admin123
-- teacher password: teacher123  
-- student passwords: student123
INSERT INTO users (id, username, email, password, role) VALUES
(1, 'admin', 'admin@present.edu', '$2b$10$OUbRPve8YvC1e2euoKm4feR4GI7Trf7yCtIXwcGFkECni4ymT. Rd6', 'admin'),
(2, 'teacher', 'teacher@present.edu', '$2b$10$4YMncqudN6yxxeM1HiCAOe6Mj5bP9ridCTnPNAlzUaQTpLYC5mz7q', 'teacher'),
(3, 'Alex', 'alex@present.edu', '$2b$10$AiJ4Snnnp8TOmfUSsEFtoOfRomqzSoj7d10ppOaTHwHMcz1gioNPe', 'student'),
(5, 'Reissi', 'reissi@present. edu', '$2b$10$jiXGxzMfR7UQn6f9OUbd1OdK7Jr7JGjy. O/sjYvV3zJ8U8F6sdrxW', 'student');

-- Profiles
INSERT INTO profiles (id, user_id, first_name, middle_name, last_name, department, employee_id) VALUES
(1, 1, 'John', 'David', 'Administrator', 'Administration', 'ADM-2024-001'),
(2, 2, 'Jane', 'Marie', 'Smith', 'Science Department', 'TCH-2024-001'),
(3, 3, 'Alex', 'James', 'Johnson', 'Grade 10', 'STU-2024-001'),
(5, 5, 'Centaureissi', 'Robella', 'Reyes', 'Humanitarian Relief', 'STU-2025-007');

-- School Year
INSERT INTO school_years (id, year, start_date, end_date, is_active) VALUES
(5, '2024-2025', '2024-08-01', '2025-05-31', 1);

-- Semester
INSERT INTO semesters (id, school_year_id, name) VALUES
(4, 5, 'Mid Semester');

-- Grade Level
INSERT INTO grade_levels (id, semester_id, name) VALUES
(5, 4, 'Grade 8');

-- Section
INSERT INTO sections (id, grade_level_id, name, school_year_id) VALUES
(10, 5, 'Section 6', 5);

-- Subject
INSERT INTO subjects (id, section_id, name, code, description) VALUES
(11, 10, 'Science', 'SCI-101', 'General Science for Grade 8');

-- Subject Instructor
INSERT INTO subject_instructors (id, subject_id, instructor_id) VALUES
(1, 11, 2);

-- Subject Students
INSERT INTO subject_students (id, subject_id, student_id) VALUES
(1, 11, 3),
(2, 11, 5);

-- Subject Folder
INSERT INTO subject_folders (id, subject_id, name) VALUES
(1, 11, 'Test Folder');

-- Subject Submissions (Assignments)
INSERT INTO subject_submissions (id, folder_id, subject_id, name, description, due_date, due_time, max_attempts, is_visible) VALUES
(1, 1, 11, 'Hatdog', 'Cheesedog', '2025-12-31', '17:23:00', 5, 1),
(2, 1, 11, 'Tets', 'Teto', '2025-12-24', '15:00:00', 1, 1);

-- Student Submissions (with grades)
INSERT INTO student_submissions (id, submission_id, student_id, attempt_number, grade, graded_at) VALUES
(1, 1, 3, 1, 86.00, datetime('now')),
(2, 1, 5, 1, 98.00, datetime('now'));

-- Attendance Session
INSERT INTO attendance_sessions (id, subject_id, session_date, session_time, is_visible) VALUES
(1, 11, '2025-12-12', '16:11:00', 1);

-- Attendance Records
INSERT INTO attendance_records (id, session_id, student_id, status) VALUES
(1, 1, 3, 'present'),
(2, 1, 5, 'present');

-- Activity Log (sample entries)
INSERT INTO activity_logs (user_id, action_type, description) VALUES
(1, 'login', 'John Administrator (admin) logged in'),
(2, 'login', 'Jane Smith (teacher) logged in'),
(3, 'login', 'Alex Johnson (student) logged in');