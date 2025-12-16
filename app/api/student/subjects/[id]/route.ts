import { NextRequest, NextResponse } from 'next/server';

async function getDB() {
    const { getCloudflareContext } = await import('@opennextjs/cloudflare');
    const ctx = await getCloudflareContext({ async: true });
    const db = (ctx.env as any)?.DB;
    if (!db) throw new Error('Database not configured');
    return { db, ctx };
}

// GET - Fetch subject details for a student
export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { db } = await getDB();
        const { id: subjectId } = await params;
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
            return NextResponse.json({ error: 'You are not enrolled in this subject' }, { status: 403 });
        }

        // Get subject details
        const subject = await db
            .prepare(`
                SELECT
                    sub.id,
                    sub.name,
                    sub.code,
                    sec.name as section_name,
                    gl.name as grade_level_name,
                    sem.name as semester_name,
                    sy.year as school_year
                FROM subjects sub
                JOIN sections sec ON sub.section_id = sec.id
                JOIN grade_levels gl ON sec.grade_level_id = gl.id
                JOIN semesters sem ON gl.semester_id = sem.id
                JOIN school_years sy ON sem.school_year_id = sy.id
                WHERE sub.id = ?
            `)
            .bind(subjectId)
            .first();

        if (!subject) {
            return NextResponse.json({ error: 'Subject not found' }, { status: 404 });
        }

        // Get instructors
        const instructorsResult = await db
            .prepare(`
                SELECT
                    u.id,
                    u.username,
                    u.email,
                    COALESCE(p.first_name, '') || ' ' || COALESCE(p.last_name, u.username) as name
                FROM subject_instructors si
                JOIN users u ON si.instructor_id = u.id
                LEFT JOIN profiles p ON u.id = p.user_id
                WHERE si.subject_id = ?
            `)
            .bind(subjectId)
            .all();

        // Get folders
        const foldersResult = await db
            .prepare(`
                SELECT id, name, created_at
                FROM subject_folders
                WHERE subject_id = ?
                ORDER BY created_at ASC
            `)
            .bind(subjectId)
            .all();

        // Get submissions for each folder with student's submission status
        const foldersWithSubmissions = await Promise.all(
            foldersResult.results.map(async (folder: any) => {
                const submissionsResult = await db
                    .prepare(`
                        SELECT
                            ss.id,
                            ss.name,
                            ss.description,
                            ss.due_date,
                            ss.due_time,
                            ss.max_attempts,
                            ss.is_visible,
                            ss.created_at,
                            (
                                SELECT COUNT(*) FROM student_submissions
                                WHERE submission_id = ss.id AND student_id = ?
                            ) as attempt_count,
                            (
                                SELECT stu_sub.id FROM student_submissions stu_sub
                                WHERE stu_sub.submission_id = ss.id AND stu_sub.student_id = ?
                                ORDER BY stu_sub.submitted_at DESC LIMIT 1
                            ) as student_submission_id,
                            (
                                SELECT stu_sub.grade FROM student_submissions stu_sub
                                WHERE stu_sub.submission_id = ss.id AND stu_sub.student_id = ? 
                                ORDER BY stu_sub.submitted_at DESC LIMIT 1
                            ) as grade,
                            (
                                SELECT stu_sub.feedback FROM student_submissions stu_sub
                                WHERE stu_sub.submission_id = ss.id AND stu_sub.student_id = ?
                                ORDER BY stu_sub.submitted_at DESC LIMIT 1
                            ) as feedback,
                            (
                                SELECT stu_sub.submitted_at FROM student_submissions stu_sub
                                WHERE stu_sub.submission_id = ss.id AND stu_sub.student_id = ?
                                ORDER BY stu_sub.submitted_at DESC LIMIT 1
                            ) as submitted_at
                        FROM subject_submissions ss
                        WHERE ss.folder_id = ? AND ss.is_visible = 1
                        ORDER BY ss.created_at ASC
                    `)
                    .bind(studentId, studentId, studentId, studentId, studentId, folder.id)
                    .all();

                // Get files for each submission
                const submissionsWithFiles = await Promise.all(
                    submissionsResult.results.map(async (submission: any) => {
                        const filesResult = await db
                            .prepare(`
                                SELECT id, file_name, file_type, file_url
                                FROM submission_files
                                WHERE submission_id = ?
                            `)
                            .bind(submission.id)
                            .all();

                        // Determine submission status
                        let status = 'not_submitted';
                        const now = new Date();
                        const dueDate = submission.due_date
                            ? new Date(`${submission.due_date}T${submission.due_time || '23:59:59'}`)
                            : null;

                        if (submission.student_submission_id) {
                            if (submission.grade !== null) {
                                status = 'graded';
                            } else {
                                status = 'submitted';
                            }
                        } else if (dueDate && now > dueDate) {
                            status = 'overdue';
                        }

                        const canSubmit = !submission.student_submission_id ||
                            (submission.attempt_count < submission.max_attempts);

                        return {
                            id: submission.id,
                            name: submission.name,
                            description: submission.description,
                            dueDate: submission.due_date,
                            dueTime: submission.due_time,
                            maxAttempts: submission.max_attempts,
                            attemptCount: submission.attempt_count || 0,
                            studentSubmissionId: submission.student_submission_id,
                            grade: submission.grade,
                            feedback: submission.feedback,
                            submittedAt: submission.submitted_at,
                            status,
                            canSubmit,
                            files: filesResult.results.map((f: any) => ({
                                id: f.id,
                                name: f.file_name,
                                type: f.file_type,
                                url: f.file_url,
                            })),
                        };
                    })
                );

                return {
                    id: folder.id,
                    name: folder.name,
                    submissions: submissionsWithFiles,
                };
            })
        );

        return NextResponse.json({
            success: true,
            subject: {
                ...subject,
                instructors: instructorsResult.results.map((i: any) => ({ id: i.id, name: i.name, email: i.email })),
            },
            folders: foldersWithSubmissions,
        });
    } catch (error: any) {
        console.error('Fetch student subject detail error:', error);
        return NextResponse.json({ error: 'Failed to fetch subject details: ' + error.message }, { status: 500 });
    }
}