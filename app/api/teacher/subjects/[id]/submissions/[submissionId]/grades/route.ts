import { NextRequest, NextResponse } from 'next/server';

async function getDB() {
    const { getCloudflareContext } = await import('@opennextjs/cloudflare');
    const ctx = await getCloudflareContext({ async: true });
    const db = (ctx.env as any)?.DB;
    if (!db) throw new Error('Database not configured');
    return { db, ctx };
}

// GET - Fetch student submissions for grading
export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string; submissionId: string }> }
) {
    try {
        const { db } = await getDB();
        const { id: subjectId, submissionId } = await params;

        // Get submission details
        const submission = await db
            .prepare(`
                SELECT 
                    ss.id,
                    ss.name,
                    ss.description,
                    ss.due_date,
                    ss.due_time,
                    ss.max_attempts
                FROM subject_submissions ss
                WHERE ss.id = ? AND ss.subject_id = ?
            `)
            .bind(submissionId, subjectId)
            .first();

        if (!submission) {
            return NextResponse.json({ error: 'Submission not found' }, { status: 404 });
        }

        // Get all students enrolled with their submission status
        const studentsResult = await db
            .prepare(`
                SELECT 
                    u.id,
                    u.username,
                    u.email,
                    p.first_name,
                    p.middle_name,
                    p.last_name,
                    p.employee_id as student_number,
                    sts.id as student_submission_id,
                    sts.attempt_number,
                    sts.submitted_at,
                    sts.grade,
                    sts.feedback,
                    sts.graded_at
                FROM subject_students ss
                JOIN users u ON ss.student_id = u.id
                LEFT JOIN profiles p ON u.id = p.user_id
                LEFT JOIN student_submissions sts ON sts.submission_id = ? AND sts.student_id = u.id
                WHERE ss.subject_id = ?
                ORDER BY p.last_name, p.first_name, u.username
            `)
            .bind(submissionId, subjectId)
            .all();

        const mappedStudents = studentsResult.results.map((student: any) => ({
            id: student.id,
            name: [student.first_name, student.middle_name, student.last_name]
                .filter(Boolean)
                .join(' ') || student.username,
            email: student.email,
            studentNumber: student.student_number,
            studentSubmissionId: student.student_submission_id,
            attemptNumber: student.attempt_number,
            submittedAt: student.submitted_at,
            grade: student.grade,
            feedback: student.feedback,
            gradedAt: student.graded_at,
            status: student.student_submission_id
                ? (student.grade !== null ? 'graded' : 'submitted')
                : 'not_submitted'
        }));

        return NextResponse.json({
            success: true,
            submission,
            students: mappedStudents
        });
    } catch (error: any) {
        console.error('Fetch grades error:', error);
        return NextResponse.json({ error: 'Failed to fetch grades: ' + error.message }, { status: 500 });
    }
}

// POST - Submit grade for a student
export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ id: string; submissionId: string }> }
) {
    try {
        const { db } = await getDB();
        const { submissionId } = await params;
        const body = await request.json();
        const { studentId, grade, feedback } = body;

        if (!studentId) {
            return NextResponse.json({ error: 'Student ID is required' }, { status: 400 });
        }

        if (grade === undefined || grade === null) {
            return NextResponse.json({ error: 'Grade is required' }, { status: 400 });
        }

        const existing = await db
            .prepare('SELECT id FROM student_submissions WHERE submission_id = ? AND student_id = ?')
            .bind(submissionId, studentId)
            .first();

        if (!existing) {
            const result = await db
                .prepare(`
                    INSERT INTO student_submissions (submission_id, student_id, attempt_number, grade, feedback, graded_at)
                    VALUES (?, ?, 1, ?, ?, datetime('now'))
                `)
                .bind(submissionId, studentId, grade, feedback || null)
                .run();

            return NextResponse.json({
                success: true,
                studentSubmissionId: result.meta.last_row_id
            });
        } else {
            await db
                .prepare(`
                    UPDATE student_submissions 
                    SET grade = ?, feedback = ?, graded_at = datetime('now')
                    WHERE submission_id = ? AND student_id = ?
                `)
                .bind(grade, feedback || null, submissionId, studentId)
                .run();

            return NextResponse.json({ success: true });
        }
    } catch (error: any) {
        console.error('Submit grade error:', error);
        return NextResponse.json({ error: 'Failed to submit grade: ' + error.message }, { status: 500 });
    }
}

// PUT - Bulk update grades
export async function PUT(
    request: NextRequest,
    { params }: { params: Promise<{ id: string; submissionId: string }> }
) {
    try {
        const { db, ctx } = await getDB();
        const { submissionId } = await params;
        const body = await request.json();
        const { grades } = body;

        if (!grades || !Array.isArray(grades)) {
            return NextResponse.json({ error: 'Grades array is required' }, { status: 400 });
        }

        for (const gradeData of grades) {
            const { studentId, grade, feedback } = gradeData;
            if (grade === undefined || grade === null) continue;

            const existing = await db
                .prepare('SELECT id FROM student_submissions WHERE submission_id = ? AND student_id = ?')
                .bind(submissionId, studentId)
                .first();

            if (!existing) {
                await db
                    .prepare(`
                        INSERT INTO student_submissions (submission_id, student_id, attempt_number, grade, feedback, graded_at)
                        VALUES (?, ?, 1, ?, ?, datetime('now'))
                    `)
                    .bind(submissionId, studentId, grade, feedback || null)
                    .run();
            } else {
                await db
                    .prepare(`
                        UPDATE student_submissions 
                        SET grade = ?, feedback = ?, graded_at = datetime('now')
                        WHERE submission_id = ? AND student_id = ?
                    `)
                    .bind(grade, feedback || null, submissionId, studentId)
                    .run();
            }
        }

        const submission = await db
            .prepare('SELECT name FROM subject_submissions WHERE id = ?')
            .bind(submissionId)
            .first<{ name: string }>();

        const logPromise = db
            .prepare('INSERT INTO activity_logs (user_id, action_type, description) VALUES (?, ?, ?)')
            .bind(null, 'update', `Updated grades for ${grades.length} students in "${submission?.name}"`)
            .run();

        if (ctx.ctx?.waitUntil) {
            ctx.ctx.waitUntil(logPromise);
        }

        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error('Bulk update grades error:', error);
        return NextResponse.json({ error: 'Failed to update grades: ' + error.message }, { status: 500 });
    }
}