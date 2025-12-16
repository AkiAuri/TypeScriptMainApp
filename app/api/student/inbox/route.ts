import { NextRequest, NextResponse } from 'next/server';

async function getDB() {
    const { getCloudflareContext } = await import('@opennextjs/cloudflare');
    const ctx = await getCloudflareContext({ async: true });
    const db = (ctx.env as any)?.DB;
    if (!db) throw new Error('Database not configured');
    return { db, ctx };
}

// GET - Fetch inbox data for a student (tasks, attendance, grades)
export async function GET(request: NextRequest) {
    try {
        const { db } = await getDB();
        const { searchParams } = new URL(request.url);
        const studentId = searchParams.get('studentId');
        const limit = parseInt(searchParams.get('limit') || '10');

        if (!studentId) {
            return NextResponse.json({ error: 'Student ID is required' }, { status: 400 });
        }

        const now = new Date();
        const today = now.toISOString().split('T')[0];
        const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

        // 1. Get upcoming/pending tasks (submissions)
        const tasksResult = await db
            .prepare(`
                SELECT 
                    subm.id,
                    subm.name as task_name,
                    subm.description,
                    subm.due_date,
                    subm.due_time,
                    subm.created_at,
                    sub.id as subject_id,
                    sub.name as subject_name,
                    sub.code as subject_code,
                    f.name as folder_name,
                    ss.id as student_submission_id,
                    ss.submitted_at,
                    ss.grade,
                    (
                        SELECT group_concat(
                            COALESCE(p.first_name || ' ', '') || COALESCE(p.last_name, u.username),
                            ', '
                        )
                        FROM subject_instructors si
                        JOIN users u ON si.instructor_id = u.id
                        LEFT JOIN profiles p ON u.id = p.user_id
                        WHERE si.subject_id = sub.id
                    ) as instructors
                FROM subject_submissions subm
                JOIN subjects sub ON subm.subject_id = sub.id
                JOIN subject_students sst ON sub.id = sst.subject_id AND sst.student_id = ? 
                LEFT JOIN subject_folders f ON subm.folder_id = f.id
                LEFT JOIN student_submissions ss ON subm.id = ss.submission_id AND ss.student_id = ? 
                WHERE subm.is_visible = 1
                ORDER BY 
                    CASE 
                        WHEN subm.due_date IS NULL THEN 1 
                        ELSE 0 
                    END,
                    subm.due_date ASC,
                    subm.due_time ASC
                LIMIT ?
            `)
            .bind(studentId, studentId, limit * 3)
            .all();

        // Categorize tasks
        const tasks = tasksResult.results.map((task: any) => {
            let category: 'overdue' | 'today' | 'upcoming' | 'recent' = 'upcoming';
            let status: 'pending' | 'submitted' | 'graded' | 'overdue' = 'pending';

            if (task.student_submission_id) {
                if (task.grade !== null) {
                    status = 'graded';
                    category = 'recent';
                } else {
                    status = 'submitted';
                    category = 'recent';
                }
            } else if (task.due_date) {
                const dueDateTime = new Date(`${task.due_date}T${task.due_time || '23:59:59'}`);

                if (dueDateTime < now) {
                    status = 'overdue';
                    category = 'overdue';
                } else if (task.due_date === today) {
                    category = 'today';
                } else {
                    category = 'upcoming';
                }
            }

            let daysUntilDue = null;
            if (task.due_date) {
                const dueDate = new Date(task.due_date);
                const todayDate = new Date(today);
                daysUntilDue = Math.ceil((dueDate.getTime() - todayDate.getTime()) / (1000 * 60 * 60 * 24));
            }

            return {
                id: task.id,
                taskName: task.task_name,
                description: task.description,
                dueDate: task.due_date,
                dueTime: task.due_time,
                subjectId: task.subject_id,
                subjectName: task.subject_name,
                subjectCode: task.subject_code,
                folderName: task.folder_name,
                instructor: task.instructors || 'No instructor',
                studentSubmissionId: task.student_submission_id,
                submittedAt: task.submitted_at,
                grade: task.grade,
                category,
                status,
                daysUntilDue,
                createdAt: task.created_at,
            };
        });

        const overdueTasks = tasks.filter((t: any) => t.category === 'overdue' && t.status === 'overdue');
        const todayTasks = tasks.filter((t: any) => t.category === 'today' && t.status === 'pending');
        const upcomingTasks = tasks.filter((t: any) => t.category === 'upcoming' && t.status === 'pending');
        const recentTasks = tasks.filter((t: any) => t.status === 'submitted' || t.status === 'graded').slice(0, limit);

        // 2. Get recent attendance records
        const attendanceResult = await db
            .prepare(`
                SELECT 
                    ar.id,
                    ar.status,
                    ar.created_at as marked_at,
                    asess.session_date,
                    asess.session_time,
                    sub.id as subject_id,
                    sub.name as subject_name,
                    sub.code as subject_code
                FROM attendance_records ar
                JOIN attendance_sessions asess ON ar.session_id = asess.id
                JOIN subjects sub ON asess.subject_id = sub.id
                WHERE ar.student_id = ?
                ORDER BY asess.session_date DESC, asess.session_time DESC
                LIMIT ?
            `)
            .bind(studentId, limit)
            .all();

        const recentAttendance = attendanceResult.results.map((att: any) => ({
            id: att.id,
            subjectId: att.subject_id,
            subjectName: att.subject_name,
            subjectCode: att.subject_code,
            date: att.session_date,
            time: att.session_time,
            status: att.status,
            markedAt: att.marked_at,
        }));

        // 3. Get recent grades
        const gradesResult = await db
            .prepare(`
                SELECT 
                    ss.id,
                    ss.grade,
                    ss.feedback,
                    ss.graded_at,
                    ss.submitted_at,
                    subm.id as task_id,
                    subm.name as task_name,
                    sub.id as subject_id,
                    sub.name as subject_name,
                    sub.code as subject_code
                FROM student_submissions ss
                JOIN subject_submissions subm ON ss.submission_id = subm.id
                JOIN subjects sub ON subm.subject_id = sub.id
                WHERE ss.student_id = ? AND ss.grade IS NOT NULL
                ORDER BY ss.graded_at DESC
                LIMIT ?
            `)
            .bind(studentId, limit)
            .all();

        const recentGrades = gradesResult.results.map((grade: any) => ({
            id: grade.id,
            taskId: grade.task_id,
            taskName: grade.task_name,
            subjectId: grade.subject_id,
            subjectName: grade.subject_name,
            subjectCode: grade.subject_code,
            grade: grade.grade,
            feedback: grade.feedback,
            gradedAt: grade.graded_at,
            submittedAt: grade.submitted_at,
        }));

        const unreadCount = 0;

        const stats = {
            overdueTasks: overdueTasks.length,
            todayTasks: todayTasks.length,
            upcomingTasks: upcomingTasks.length,
            pendingGrades: tasks.filter((t: any) => t.status === 'submitted').length,
            recentGradesCount: recentGrades.length,
            attendanceThisWeek: recentAttendance.filter((a: any) => a.date >= weekAgo).length,
        };

        return NextResponse.json({
            success: true,
            stats,
            tasks: {
                overdue: overdueTasks.slice(0, limit),
                today: todayTasks.slice(0, limit),
                upcoming: upcomingTasks.slice(0, limit),
                recent: recentTasks.slice(0, limit),
            },
            recentAttendance,
            recentGrades,
            unreadCount,
        });
    } catch (error: any) {
        console.error('Fetch student inbox error:', error);
        return NextResponse.json({
            error: 'Failed to fetch inbox',
            details: error.message
        }, { status: 500 });
    }
}