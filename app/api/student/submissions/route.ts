import { NextRequest, NextResponse } from 'next/server';

async function getDB() {
    const { getCloudflareContext } = await import('@opennextjs/cloudflare');
    const ctx = await getCloudflareContext({ async: true });
    const db = (ctx.env as any)?.DB;
    if (!db) throw new Error('Database not configured');
    return { db, ctx };
}

// POST - Create a new student submission
export async function POST(request: NextRequest) {
    try {
        const { db } = await getDB();
        const body = await request.json();
        const { submissionId, studentId, files } = body;

        if (!submissionId || !studentId) {
            return NextResponse.json({ error: 'Submission ID and Student ID are required' }, { status: 400 });
        }

        // Get submission details
        const submission = await db
            .prepare(`
                SELECT
                    ss.id,
                    ss.subject_id,
                    ss.max_attempts,
                    ss.due_date,
                    ss.due_time
                FROM subject_submissions ss
                WHERE ss.id = ?
            `)
            .bind(submissionId)
            .first<{
                id: number;
                subject_id: number;
                max_attempts: number;
                due_date: string;
                due_time: string;
            }>();

        if (!submission) {
            return NextResponse.json({ error: 'Submission not found' }, { status: 404 });
        }

        // Check if student is enrolled in the subject
        const enrollment = await db
            .prepare('SELECT id FROM subject_students WHERE subject_id = ? AND student_id = ?')
            .bind(submission.subject_id, studentId)
            .first();

        if (!enrollment) {
            return NextResponse.json({ error: 'You are not enrolled in this subject' }, { status: 403 });
        }

        // Check attempt count
        const attempts = await db
            .prepare('SELECT COUNT(*) as count FROM student_submissions WHERE submission_id = ? AND student_id = ?')
            .bind(submissionId, studentId)
            .first<{ count: number }>();

        const attemptCount = attempts?.count || 0;

        if (attemptCount >= submission.max_attempts) {
            return NextResponse.json({
                error: `Maximum attempts (${submission.max_attempts}) reached`
            }, { status: 400 });
        }

        // Create student submission
        const result = await db
            .prepare(`
                INSERT INTO student_submissions (submission_id, student_id, attempt_number, submitted_at)
                VALUES (?, ?, ?, datetime('now'))
            `)
            .bind(submissionId, studentId, attemptCount + 1)
            .run();

        const studentSubmissionId = result.meta.last_row_id;

        // Insert files if any
        if (files && files.length > 0) {
            for (const file of files) {
                await db
                    .prepare(`
                        INSERT INTO student_submission_files
                            (student_submission_id, file_name, file_type, file_url)
                        VALUES (?, ?, ?, ?)
                    `)
                    .bind(studentSubmissionId, file.name, file.type, file.url)
                    .run();
            }
        }

        return NextResponse.json({
            success: true,
            submission: {
                id: studentSubmissionId,
                submissionId,
                studentId,
                attemptNumber: attemptCount + 1,
                files: files || [],
            }
        });
    } catch (error: any) {
        console.error('Create student submission error:', error);
        return NextResponse.json({ error: 'Failed to create submission: ' + error.message }, { status: 500 });
    }
}

// GET - Get student's submission for a specific task
export async function GET(request: NextRequest) {
    try {
        const { db } = await getDB();
        const { searchParams } = new URL(request.url);
        const submissionId = searchParams.get('submissionId');
        const studentId = searchParams.get('studentId');

        if (!submissionId || !studentId) {
            return NextResponse.json({ error: 'Submission ID and Student ID are required' }, { status: 400 });
        }

        // Get student's submissions for this task
        const submissionsResult = await db
            .prepare(`
                SELECT
                    ss.id,
                    ss.submission_id,
                    ss.attempt_number,
                    ss.submitted_at,
                    ss.grade,
                    ss.feedback,
                    ss.graded_at
                FROM student_submissions ss
                WHERE ss.submission_id = ? AND ss.student_id = ?
                ORDER BY ss.submitted_at DESC
            `)
            .bind(submissionId, studentId)
            .all();

        // Get files for each submission
        const submissionsWithFiles = await Promise.all(
            submissionsResult.results.map(async (sub: any) => {
                const filesResult = await db
                    .prepare(`
                        SELECT id, file_name, file_type, file_url
                        FROM student_submission_files
                        WHERE student_submission_id = ?
                    `)
                    .bind(sub.id)
                    .all();

                return {
                    id: sub.id,
                    submissionId: sub.submission_id,
                    attemptNumber: sub.attempt_number,
                    submittedAt: sub.submitted_at,
                    grade: sub.grade,
                    feedback: sub.feedback,
                    gradedAt: sub.graded_at,
                    files: filesResult.results.map((f: any) => ({
                        id: f.id,
                        name: f.file_name,
                        type: f.file_type,
                        url: f.file_url,
                    })),
                };
            })
        );

        return NextResponse.json({
            success: true,
            submissions: submissionsWithFiles,
        });
    } catch (error: any) {
        console.error('Get student submissions error:', error);
        return NextResponse.json({ error: 'Failed to get submissions: ' + error.message }, { status: 500 });
    }
}