-- Force Update: Run 2
-- =============================================
-- Cloudflare D1 Schema for LMS (Sanitized)
-- =============================================

-- 1. Users (Must be first)
CREATE TABLE IF NOT EXISTS users (
                                     id INTEGER PRIMARY KEY AUTOINCREMENT,
                                     username TEXT NOT NULL UNIQUE,
                                     email TEXT NOT NULL UNIQUE,
                                     password TEXT NOT NULL,
                                     role TEXT NOT NULL DEFAULT 'student' CHECK(role IN ('admin', 'teacher', 'student')),
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
    );

-- 2. Profiles (References users)
CREATE TABLE IF NOT EXISTS profiles (
                                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                                        user_id INTEGER NOT NULL UNIQUE,
                                        first_name TEXT,
                                        middle_name TEXT,
                                        last_name TEXT,
                                        department TEXT,
                                        employee_id TEXT UNIQUE,
                                        phone TEXT,
                                        address TEXT,
                                        date_of_birth TEXT,
                                        profile_picture TEXT,
                                        created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

-- 3. School Years
CREATE TABLE IF NOT EXISTS school_years (
                                            id INTEGER PRIMARY KEY AUTOINCREMENT,
                                            year TEXT UNIQUE,
                                            start_date TEXT NOT NULL,
                                            end_date TEXT NOT NULL,
                                            is_active INTEGER DEFAULT 0,
                                            created_at TEXT DEFAULT (datetime('now'))
    );

-- 4. Semesters
CREATE TABLE IF NOT EXISTS semesters (
                                         id INTEGER PRIMARY KEY AUTOINCREMENT,
                                         school_year_id INTEGER NOT NULL,
                                         name TEXT NOT NULL,
                                         created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (school_year_id) REFERENCES school_years(id) ON DELETE CASCADE
    );

-- 5. Grade Levels
CREATE TABLE IF NOT EXISTS grade_levels (
                                            id INTEGER PRIMARY KEY AUTOINCREMENT,
                                            semester_id INTEGER NOT NULL,
                                            name TEXT NOT NULL,
                                            created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (semester_id) REFERENCES semesters(id) ON DELETE CASCADE
    );

-- 6. Sections
CREATE TABLE IF NOT EXISTS sections (
                                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                                        grade_level_id INTEGER,
                                        name TEXT NOT NULL,
                                        school_year_id INTEGER,
                                        created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (grade_level_id) REFERENCES grade_levels(id) ON DELETE CASCADE,
    FOREIGN KEY (school_year_id) REFERENCES school_years(id) ON DELETE SET NULL
    );

-- 7. Subjects
CREATE TABLE IF NOT EXISTS subjects (
                                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                                        section_id INTEGER,
                                        name TEXT NOT NULL,
                                        code TEXT,
                                        description TEXT,
                                        created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (section_id) REFERENCES sections(id) ON DELETE CASCADE
    );

-- 8. Subject Instructors
CREATE TABLE IF NOT EXISTS subject_instructors (
                                                   id INTEGER PRIMARY KEY AUTOINCREMENT,
                                                   subject_id INTEGER NOT NULL,
                                                   instructor_id INTEGER NOT NULL,
                                                   assigned_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE CASCADE,
    FOREIGN KEY (instructor_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE(subject_id, instructor_id)
    );

-- 9. Subject Students
CREATE TABLE IF NOT EXISTS subject_students (
                                                id INTEGER PRIMARY KEY AUTOINCREMENT,
                                                subject_id INTEGER NOT NULL,
                                                student_id INTEGER NOT NULL,
                                                enrolled_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE CASCADE,
    FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE(subject_id, student_id)
    );

-- 10. Subject Folders
CREATE TABLE IF NOT EXISTS subject_folders (
                                               id INTEGER PRIMARY KEY AUTOINCREMENT,
                                               subject_id INTEGER NOT NULL,
                                               name TEXT NOT NULL,
                                               created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE CASCADE
    );

-- 11. Subject Submissions
CREATE TABLE IF NOT EXISTS subject_submissions (
                                                   id INTEGER PRIMARY KEY AUTOINCREMENT,
                                                   folder_id INTEGER NOT NULL,
                                                   subject_id INTEGER NOT NULL,
                                                   name TEXT NOT NULL,
                                                   description TEXT,
                                                   due_date TEXT,
                                                   due_time TEXT,
                                                   max_attempts INTEGER DEFAULT 1,
                                                   is_visible INTEGER DEFAULT 1,
                                                   created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (folder_id) REFERENCES subject_folders(id) ON DELETE CASCADE,
    FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE CASCADE
    );

-- 12. Submission Files
CREATE TABLE IF NOT EXISTS submission_files (
                                                id INTEGER PRIMARY KEY AUTOINCREMENT,
                                                submission_id INTEGER NOT NULL,
                                                file_name TEXT NOT NULL,
                                                file_type TEXT,
                                                file_url TEXT NOT NULL,
                                                created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (submission_id) REFERENCES subject_submissions(id) ON DELETE CASCADE
    );

-- 13. Student Submissions
CREATE TABLE IF NOT EXISTS student_submissions (
                                                   id INTEGER PRIMARY KEY AUTOINCREMENT,
                                                   submission_id INTEGER NOT NULL,
                                                   student_id INTEGER NOT NULL,
                                                   attempt_number INTEGER DEFAULT 1,
                                                   submitted_at TEXT DEFAULT (datetime('now')),
    grade REAL,
    feedback TEXT,
    graded_at TEXT,
    graded_by INTEGER,
    FOREIGN KEY (submission_id) REFERENCES subject_submissions(id) ON DELETE CASCADE,
    FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (graded_by) REFERENCES users(id) ON DELETE SET NULL
    );

-- 14. Student Submission Files
CREATE TABLE IF NOT EXISTS student_submission_files (
                                                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                                                        student_submission_id INTEGER NOT NULL,
                                                        file_name TEXT NOT NULL,
                                                        file_type TEXT,
                                                        file_url TEXT NOT NULL,
                                                        created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (student_submission_id) REFERENCES student_submissions(id) ON DELETE CASCADE
    );

-- 15. Attendance Sessions
CREATE TABLE IF NOT EXISTS attendance_sessions (
                                                   id INTEGER PRIMARY KEY AUTOINCREMENT,
                                                   subject_id INTEGER NOT NULL,
                                                   session_date TEXT NOT NULL,
                                                   session_time TEXT,
                                                   is_visible INTEGER DEFAULT 1,
                                                   qr_token TEXT,
                                                   qr_expires_at TEXT,
                                                   allow_late_after_minutes INTEGER DEFAULT 15,
                                                   created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE CASCADE
    );

-- 16. Attendance Records
CREATE TABLE IF NOT EXISTS attendance_records (
                                                  id INTEGER PRIMARY KEY AUTOINCREMENT,
                                                  session_id INTEGER NOT NULL,
                                                  student_id INTEGER NOT NULL,
                                                  status TEXT NOT NULL DEFAULT 'absent' CHECK(status IN ('present', 'absent', 'late', 'excused')),
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (session_id) REFERENCES attendance_sessions(id) ON DELETE CASCADE,
    FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE(session_id, student_id)
    );

-- 17. Activity Logs
CREATE TABLE IF NOT EXISTS activity_logs (
                                             id INTEGER PRIMARY KEY AUTOINCREMENT,
                                             user_id INTEGER,
                                             action_type TEXT NOT NULL CHECK(action_type IN ('login', 'logout', 'submission', 'upload', 'create', 'update', 'delete')),
    description TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
    );

-- 18. Password Reset Requests
CREATE TABLE IF NOT EXISTS password_reset_requests (
                                                       id INTEGER PRIMARY KEY AUTOINCREMENT,
                                                       user_id INTEGER NOT NULL,
                                                       status TEXT DEFAULT 'pending' CHECK(status IN ('pending', 'approved', 'rejected')),
    requested_at TEXT DEFAULT (datetime('now')),
    resolved_at TEXT,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

-- Indexes
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_profiles_user ON profiles(user_id);