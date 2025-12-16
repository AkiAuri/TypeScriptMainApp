import { NextRequest, NextResponse } from 'next/server';

async function getDB() {
    const { getCloudflareContext } = await import('@opennextjs/cloudflare');
    const ctx = await getCloudflareContext({ async: true });
    const db = (ctx.env as any)?.DB;
    if (!db) throw new Error('Database not configured');
    return { db, ctx };
}

interface InboxItem {
    id: string;
    type: 'submission' | 'attendance' | 'grades' | 'enrollment' | 'notification';
    message: string;
    subjectId: number;
    subjectName: string;
    subjectCode: string;
    sectionName: string;
    gradeLevelName: string;
    schoolYear: string;
    semesterName: string;
    color: string;
    time: string;
    createdAt: Date;
    priority: 'high' | 'medium' | 'low';
    metadata?: any;
}

// Helper function to format relative time
function formatRelativeTime(date: Date): string {
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffInSeconds < 60) return 'Just now';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)} minutes ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)} hours ago`;
    if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)} days ago`;
    return date.toLocaleDateString();
}

// GET - Fetch inbox items for a teacher
export async function GET(request: NextRequest) {
    try {
        const { db } = await getDB();
        const { searchParams } = new URL(request.url);
        const teacherId = searchParams.get('teacherId');
        const limit = parseInt(searchParams.get('limit') || '20', 10);

        if (!teacherId) {
            return NextResponse.json({ error: 'Teacher ID is required' }, { status: 400 });
        }

        const inboxItems: InboxItem[] = [];
        const colors = [
            "from-blue-500 to-blue-600",
            "from-purple-500 to-purple-600",
            "from-green-500 to-green-600",
            "from-orange-500 to-orange-600",
            "from-pink-500 to-pink-600",
            "from-cyan-500 to-cyan-600",
        ];

        // Get teacher's subjects for reference
        const subjectsResult = await db
            .prepare(`
                SELECT
                    sub.id,
                    sub.name,
                    sub.code,
                    sec.name as section_name,
                    gl.name as grade_level_name,
                    sem.name as semester_name,
                    sy.year as school_year
                FROM subject_instructors si
                JOIN subjects sub ON si.subject_id = sub.id
                JOIN sections sec ON sub.section_id = sec.id
                JOIN grade_levels gl ON sec.grade_level_id = gl.id
                JOIN semesters sem ON gl.semester_id = sem.id
                JOIN school_years sy ON sem.school_year_id = sy.id
                WHERE si.instructor_id = ?
            `)
            .bind(teacherId)
            .all();

        const subjectMap = new Map(subjectsResult.results.map((s: any, i: number) => [
            s.id,
            { ...s, color: colors[i % colors.length] }
        ]));

        // 1. Get recent student submissions (ungraded) - HIGH PRIORITY
        const pendingSubmissionsResult = await db
            .prepare(`
                SELECT
                    ss.submission_id,
                    ss.submitted_at,
                    sub_task.name as task_name,
                    sub_task.subject_id,
                    COUNT(*) as submission_count
                FROM student_submissions ss
                JOIN subject_submissions sub_task ON ss.submission_id = sub_task.id
                JOIN subject_instructors si ON sub_task.subject_id = si.subject_id
                WHERE si.instructor_id = ? 
                  AND ss.grade IS NULL
                  AND ss.submitted_at >= datetime('now', '-7 days')
                GROUP BY ss.submission_id, sub_task.subject_id, sub_task.name, date(ss.submitted_at)
                ORDER BY ss.submitted_at DESC
                LIMIT 10
            `)
            .bind(teacherId)
            .all();

        for (const submission of pendingSubmissionsResult.results as any[]) {
            const subject = subjectMap.get(submission.subject_id) as any;
            if (subject) {
                inboxItems.push({
                    id: `submission-${submission.submission_id}-${submission.submitted_at}`,
                    type: 'submission',
                    message: `${submission.submission_count} student${submission.submission_count > 1 ? 's' : ''} submitted "${submission.task_name}"`,
                    subjectId: submission.subject_id,
                    subjectName: subject.name,
                    subjectCode: subject.code || `SUB-${subject.id}`,
                    sectionName: subject.section_name,
                    gradeLevelName: subject.grade_level_name,
                    schoolYear: subject.school_year,
                    semesterName: subject.semester_name,
                    color: subject.color,
                    time: formatRelativeTime(new Date(submission.submitted_at)),
                    createdAt: new Date(submission.submitted_at),
                    priority: 'high',
                    metadata: { submissionId: submission.submission_id, count: submission.submission_count }
                });
            }
        }

        // 2. Get recent attendance sessions created - MEDIUM PRIORITY
        const recentAttendanceResult = await db
            .prepare(`
                SELECT
                    a.id,
                    a.subject_id,
                    a.session_date,
                    a.session_time,
                    a.created_at,
                    (SELECT COUNT(*) FROM attendance_records ar WHERE ar.session_id = a.id) as student_count
                FROM attendance_sessions a
                JOIN subject_instructors si ON a.subject_id = si.subject_id
                WHERE si.instructor_id = ?
                  AND a.created_at >= datetime('now', '-7 days')
                ORDER BY a.created_at DESC
                LIMIT 10
            `)
            .bind(teacherId)
            .all();

        for (const attendance of recentAttendanceResult.results as any[]) {
            const subject = subjectMap.get(attendance.subject_id) as any;
            if (subject) {
                inboxItems.push({
                    id: `attendance-${attendance.id}`,
                    type: 'attendance',
                    message: `Attendance session recorded for ${attendance.session_date}`,
                    subjectId: attendance.subject_id,
                    subjectName: subject.name,
                    subjectCode: subject.code || `SUB-${subject.id}`,
                    sectionName: subject.section_name,
                    gradeLevelName: subject.grade_level_name,
                    schoolYear: subject.school_year,
                    semesterName: subject.semester_name,
                    color: subject.color,
                    time: formatRelativeTime(new Date(attendance.created_at)),
                    createdAt: new Date(attendance.created_at),
                    priority: 'medium',
                    metadata: { sessionId: attendance.id, studentCount: attendance.student_count }
                });
            }
        }

        // 3. Get new student enrollments - MEDIUM PRIORITY
        const newEnrollmentsResult = await db
            .prepare(`
                SELECT
                    ss.subject_id,
                    ss.enrolled_at,
                    COUNT(*) as enrollment_count
                FROM subject_students ss
                JOIN subject_instructors si ON ss.subject_id = si.subject_id
                WHERE si.instructor_id = ?
                  AND ss.enrolled_at >= datetime('now', '-7 days')
                GROUP BY ss.subject_id, date(ss.enrolled_at)
                ORDER BY ss.enrolled_at DESC
                LIMIT 10
            `)
            .bind(teacherId)
            .all();

        for (const enrollment of newEnrollmentsResult.results as any[]) {
            const subject = subjectMap.get(enrollment.subject_id) as any;
            if (subject) {
                inboxItems.push({
                    id: `enrollment-${enrollment.subject_id}-${enrollment.enrolled_at}`,
                    type: 'enrollment',
                    message: `${enrollment.enrollment_count} new student${enrollment.enrollment_count > 1 ? 's' : ''} enrolled`,
                    subjectId: enrollment.subject_id,
                    subjectName: subject.name,
                    subjectCode: subject.code || `SUB-${subject.id}`,
                    sectionName: subject.section_name,
                    gradeLevelName: subject.grade_level_name,
                    schoolYear: subject.school_year,
                    semesterName: subject.semester_name,
                    color: subject.color,
                    time: formatRelativeTime(new Date(enrollment.enrolled_at)),
                    createdAt: new Date(enrollment.enrolled_at),
                    priority: 'medium',
                    metadata: { count: enrollment.enrollment_count }
                });
            }
        }

        // Sort all items by created date (most recent first)
        inboxItems.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

        // Calculate stats
        const pendingTasksResult = await db
            .prepare(`
                SELECT COUNT(DISTINCT ss.id) as count
                FROM student_submissions ss
                JOIN subject_submissions sub_task ON ss.submission_id = sub_task.id
                JOIN subject_instructors si ON sub_task.subject_id = si.subject_id
                WHERE si.instructor_id = ? AND ss.grade IS NULL
            `)
            .bind(teacherId)
            .first<{ count: number }>();

        const newSubmissionsResult = await db
            .prepare(`
                SELECT COUNT(*) as count
                FROM student_submissions ss
                JOIN subject_submissions sub_task ON ss.submission_id = sub_task.id
                JOIN subject_instructors si ON sub_task.subject_id = si.subject_id
                WHERE si.instructor_id = ? 
                  AND ss.grade IS NULL
                  AND ss.submitted_at >= datetime('now', '-1 day')
            `)
            .bind(teacherId)
            .first<{ count: number }>();

        const unreviewedResult = await db
            .prepare(`
                SELECT COUNT(*) as count
                FROM student_submissions ss
                JOIN subject_submissions sub_task ON ss.submission_id = sub_task.id
                JOIN subject_instructors si ON sub_task.subject_id = si.subject_id
                WHERE si.instructor_id = ?
                  AND ss.grade IS NULL
                  AND ss.submitted_at >= datetime('now', '-7 days')
            `)
            .bind(teacherId)
            .first<{ count: number }>();

        const stats = {
            pendingTasks: pendingTasksResult?.count || 0,
            newSubmissions: newSubmissionsResult?.count || 0,
            unreviewed: unreviewedResult?.count || 0,
        };

        return NextResponse.json({
            success: true,
            items: inboxItems.slice(0, limit),
            stats,
        });
    } catch (error: any) {
        console.error('Fetch inbox error:', error);
        return NextResponse.json({ error: 'Failed to fetch inbox: ' + error.message }, { status: 500 });
    }
}