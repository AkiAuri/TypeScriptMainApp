-- =============================================
-- Cloudflare D1 Schema for LMS
-- =============================================

-- Users table
CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT NOT NULL UNIQUE,
    email TEXT NOT NULL UNIQUE,
    password TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'student' CHECK(role IN ('admin', 'teacher', 'student')),
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
);

-- Profiles table
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

-- School Years
CREATE TABLE IF NOT EXISTS school_years (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    year TEXT UNIQUE,
    start_date TEXT NOT NULL,
    end_date TEXT NOT NULL,
    is_active INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now'))
);

-- Semesters
CREATE TABLE IF NOT EXISTS semesters (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    school_year_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (school_year_id) REFERENCES school_years(id) ON DELETE CASCADE
);

-- Grade Levels
CREATE TABLE IF NOT EXISTS grade_levels (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    semester_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (semester_id) REFERENCES semesters(id) ON DELETE CASCADE
);

-- Sections
CREATE TABLE IF NOT EXISTS sections (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    grade_level_id INTEGER,
    name TEXT NOT NULL,
    school_year_id INTEGER,
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (grade_level_id) REFERENCES grade_levels(id) ON DELETE CASCADE,
    FOREIGN KEY (school_year_id) REFERENCES school_years(id) ON DELETE SET NULL
);

-- Subjects
CREATE TABLE IF NOT EXISTS subjects (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    section_id INTEGER,
    name TEXT NOT NULL,
    code TEXT,
    description TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (section_id) REFERENCES sections(id) ON DELETE CASCADE
);

-- Subject Instructors
CREATE TABLE IF NOT EXISTS subject_instructors (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    subject_id INTEGER NOT NULL,
    instructor_id INTEGER NOT NULL,
    assigned_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE CASCADE,
    FOREIGN KEY (instructor_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE(subject_id, instructor_id)
);

-- Subject Students
CREATE TABLE IF NOT EXISTS subject_students (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    subject_id INTEGER NOT NULL,
    student_id INTEGER NOT NULL,
    enrolled_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE CASCADE,
    FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE(subject_id, student_id)
);

-- Subject Folders
CREATE TABLE IF NOT EXISTS subject_folders (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    subject_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE CASCADE
);

-- Subject Submissions (Assignments/Tasks)
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

-- Submission Files (Instructor attachments)
CREATE TABLE IF NOT EXISTS submission_files (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    submission_id INTEGER NOT NULL,
    file_name TEXT NOT NULL,
    file_type TEXT,
    file_url TEXT NOT NULL,
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (submission_id) REFERENCES subject_submissions(id) ON DELETE CASCADE
);

-- Student Submissions
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

-- Student Submission Files
CREATE TABLE IF NOT EXISTS student_submission_files (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    student_submission_id INTEGER NOT NULL,
    file_name TEXT NOT NULL,
    file_type TEXT,
    file_url TEXT NOT NULL,
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (student_submission_id) REFERENCES student_submissions(id) ON DELETE CASCADE
);

-- Attendance Sessions
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

-- Attendance Records
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

-- Activity Logs
CREATE TABLE IF NOT EXISTS activity_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    action_type TEXT NOT NULL CHECK(action_type IN ('login', 'logout', 'submission', 'upload', 'create', 'update', 'delete')),
    description TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

-- Password Reset Requests
CREATE TABLE IF NOT EXISTS password_reset_requests (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    status TEXT DEFAULT 'pending' CHECK(status IN ('pending', 'approved', 'rejected')),
    requested_at TEXT DEFAULT (datetime('now')),
    resolved_at TEXT,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- =============================================
-- Indexes for better performance
-- =============================================
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_profiles_user ON profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_subject_instructors_subject ON subject_instructors(subject_id);
CREATE INDEX IF NOT EXISTS idx_subject_instructors_instructor ON subject_instructors(instructor_id);
CREATE INDEX IF NOT EXISTS idx_subject_students_subject ON subject_students(subject_id);
CREATE INDEX IF NOT EXISTS idx_subject_students_student ON subject_students(student_id);
CREATE INDEX IF NOT EXISTS idx_subject_folders_subject ON subject_folders(subject_id);
CREATE INDEX IF NOT EXISTS idx_subject_submissions_folder ON subject_submissions(folder_id);
CREATE INDEX IF NOT EXISTS idx_subject_submissions_subject ON subject_submissions(subject_id);
CREATE INDEX IF NOT EXISTS idx_student_submissions_submission ON student_submissions(submission_id);
CREATE INDEX IF NOT EXISTS idx_student_submissions_student ON student_submissions(student_id);
CREATE INDEX IF NOT EXISTS idx_attendance_sessions_subject ON attendance_sessions(subject_id);
CREATE INDEX IF NOT EXISTS idx_attendance_records_session ON attendance_records(session_id);
CREATE INDEX IF NOT EXISTS idx_attendance_records_student ON attendance_records(student_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_user ON activity_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_created ON activity_logs(created_at);