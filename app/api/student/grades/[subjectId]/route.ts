import { NextRequest, NextResponse } from 'next/server';

async function getDB() {
    const { getCloudflareContext } = await import('@opennextjs/cloudflare');
    const ctx = await getCloudflareContext({ async: true });
    const db = (ctx.env as any)?.DB;
    if (!db) throw new Error('Database not configured');
    return { db, ctx };
}

// GET - Fetch detailed grades for a specific subject
export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ subjectId: string }> }
) {
    try {
        const { db } = await getDB();
        const { subjectId } = await params;
        const { searchParams } = new URL(request.url);
        const studentId = searchParams.get('studentId');

        if (!studentId) {
            return NextResponse.json({ error: 'Student ID is required' }, { status: 400 });
        }

        // Verify student is enrolled
        const enrollment = await db
            .prepare('SELECT id FROM subject_students WHERE subject_id = ? AND student_id = ?')
            .bind(subjectId, studentId)
            .first();

        if (!enrollment) {
            return NextResponse.json({ error: 'Not enrolled in this subject' }, { status: 403 });
        }

        // Get subject details
        const subject = await db
            .prepare(`
                SELECT 
                    sub.id,
                    sub.name,
                    sub.code,
                    sec.name as section_name,
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
                FROM subjects sub
                JOIN sections sec ON sub.section_id = sec.id
                WHERE sub.id = ?
            `)
            .bind(subjectId)
            .first();

        if (!subject) {
            return NextResponse.json({ error: 'Subject not found' }, { status: 404 });
        }

        // Get all submissions/tasks with student's grades
        const tasksResult = await db
            .prepare(`
                SELECT 
                    subm.id,
                    subm.name,
                    subm.description,
                    subm.due_date,
                    subm.due_time,
                    subm.created_at,
                    f.name as folder_name,
                    ss.id as student_submission_id,
                    ss.grade,
                    ss.feedback,
                    ss.submitted_at,
                    ss.graded_at
                FROM subject_submissions subm
                LEFT JOIN subject_folders f ON subm.folder_id = f.id
                LEFT JOIN student_submissions ss ON subm.id = ss.submission_id AND ss.student_id = ? 
                WHERE subm.subject_id = ? AND subm.is_visible = 1
                ORDER BY subm.created_at DESC
            `)
            .bind(studentId, subjectId)
            .all();

        // Process tasks
        const tasks = tasksResult.results.map((task: any) => {
            let status = 'not_submitted';
            if (task.student_submission_id) {
                if (task.grade !== null) {
                    status = 'graded';
                } else {
                    status = 'submitted';
                }
            } else {
                // Check if overdue
                if (task.due_date) {
                    const dueDateTime = new Date(`${task.due_date}T${task.due_time || '23:59:59'}`);
                    if (new Date() > dueDateTime) {
                        status = 'overdue';
                    }
                }
            }

            return {
                id: task.id,
                name: task.name,
                description: task.description,
                dueDate: task.due_date,
                dueTime: task.due_time,
                folderName: task.folder_name,
                studentSubmissionId: task.student_submission_id,
                grade: task.grade,
                feedback: task.feedback,
                submittedAt: task.submitted_at,
                gradedAt: task.graded_at,
                status,
                possiblePoints: 100,
            };
        });

        // Calculate stats
        const totalTasks = tasks.length;
        const submittedCount = tasks.filter((t: any) => t.studentSubmissionId).length;
        const gradedTasks = tasks.filter((t: any) => t.grade !== null);
        const gradedCount = gradedTasks.length;
        const pendingCount = submittedCount - gradedCount;

        const averageGrade = gradedCount > 0
            ? Math.round((gradedTasks.reduce((sum: number, t: any) => sum + t.grade, 0) / gradedCount) * 10) / 10
            : null;

        const highestGrade = gradedCount > 0
            ? Math.max(...gradedTasks.map((t: any) => t.grade))
            : null;

        const lowestGrade = gradedCount > 0
            ? Math.min(...gradedTasks.map((t: any) => t.grade))
            : null;

        const totalPoints = gradedTasks.reduce((sum: number, t: any) => sum + t.grade, 0);
        const possiblePoints = gradedCount * 100;

        // Group tasks by folder
        const tasksByFolder: Record<string, any[]> = {};
        tasks.forEach((task: any) => {
            const folderName = task.folderName || 'Uncategorized';
            if (!tasksByFolder[folderName]) {
                tasksByFolder[folderName] = [];
            }
            tasksByFolder[folderName].push(task);
        });

        return NextResponse.json({
            success: true,
            subject: {
                id: subject.id,
                name: subject.name,
                code: subject.code,
                sectionName: subject.section_name,
                instructor: subject.instructors || 'No instructor',
            },
            stats: {
                averageGrade,
                totalTasks,
                submittedCount,
                gradedCount,
                pendingCount,
                highestGrade,
                lowestGrade,
                totalPoints,
                possiblePoints,
            },
            tasks,
            tasksByFolder,
        });
    } catch (error: any) {
        console.error('Fetch subject grades error:', error);
        return NextResponse.json({
            error: 'Failed to fetch grades',
            details: error.message
        }, { status: 500 });
    }
}