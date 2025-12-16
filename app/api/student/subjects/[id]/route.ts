import { NextRequest, NextResponse } from 'next/server';
import { getDb } from "@/lib/db";
import { RowDataPacket } from 'mysql2';

// GET - Fetch subject details for a student
export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const pool = await getDb();
        const subjectId = (await params).id;
        const { searchParams } = new URL(request.url); // Fixed space: request. url -> request.url
        const studentId = searchParams.get('studentId');

        if (!studentId) {
            return NextResponse.json({ error: 'Student ID is required' }, { status: 400 }); // Fixed space: NextResponse. json
        }

        // Verify student is enrolled
        const [enrollment] = await pool.execute<RowDataPacket[]>(
            'SELECT id FROM subject_students WHERE subject_id = ? AND student_id = ?',
            [subjectId, studentId]
        );

        if (enrollment.length === 0) {
            return NextResponse.json({ error: 'You are not enrolled in this subject' }, { status: 403 });
        }

        // Get subject details
        const [subjects] = await pool.execute<RowDataPacket[]>(`
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
        `, [subjectId]); // Fixed spaces in SQL: gl. semester_id and trailing space in sub.id = ?

        if (subjects.length === 0) {
            return NextResponse.json({ error: 'Subject not found' }, { status: 404 }); // Fixed double space
        }

        // Get instructors
        const [instructors] = await pool.execute<RowDataPacket[]>(`
            SELECT
                u.id,
                u.username,
                u.email,
                CONCAT(COALESCE(p.first_name, ''), ' ', COALESCE(p.last_name, u.username)) as name
            FROM subject_instructors si
                     JOIN users u ON si.instructor_id = u.id
                     LEFT JOIN profiles p ON u.id = p.user_id
            WHERE si.subject_id = ?
        `, [subjectId]); // Fixed spaces in SQL: p. user_id and si. subject_id

        // Get folders with submissions (visible only)
        const [folders] = await pool.execute<RowDataPacket[]>(`
            SELECT id, name, created_at
            FROM subject_folders
            WHERE subject_id = ?
            ORDER BY created_at ASC
        `, [subjectId]);

        // Get submissions for each folder with student's submission status
        const foldersWithSubmissions = await Promise.all(
            folders.map(async (folder) => { // Fixed space: folders. map -> folders.map
                const [submissions] = await pool.execute<RowDataPacket[]>(`
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
                `, [studentId, studentId, studentId, studentId, studentId, folder.id]); // Fixed spaces in SQL: stu_sub. submission_id, student_id = ?, ss. folder_id

                // Get files for each submission
                const submissionsWithFiles = await Promise.all(
                    submissions.map(async (submission) => {
                        const [files] = await pool.execute<RowDataPacket[]>(`
                            SELECT id, file_name, file_type, file_url
                            FROM submission_files
                            WHERE submission_id = ?
                        `, [submission.id]);

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

                        const canSubmit = !submission.student_submission_id || // Fixed space: ! submission -> !submission
                            (submission.attempt_count < submission.max_attempts);

                        return {
                            id: submission.id, // Fixed double space
                            name: submission.name,
                            description: submission.description,
                            dueDate: submission.due_date,
                            dueTime: submission.due_time,
                            maxAttempts: submission.max_attempts, // Fixed double space
                            attemptCount: parseInt(String(submission.attempt_count || 0), 10),
                            studentSubmissionId: submission.student_submission_id,
                            grade: submission.grade, // Fixed double space
                            feedback: submission.feedback,
                            submittedAt: submission.submitted_at,
                            status,
                            canSubmit,
                            files: files.map(f => ({
                                id: f.id, // Fixed space: f. id -> f.id
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
                ...subjects[0], // Fixed space: ... subjects -> ...subjects
                instructors: instructors.map(i => ({ id: i.id, name: i.name, email: i.email })), // Fixed space: instructors. map -> instructors.map
            },
            folders: foldersWithSubmissions,
        });
    } catch (error) {
        console.error('Fetch student subject detail error:', error);
        return NextResponse.json({ error: 'Failed to fetch subject details' }, { status: 500 });
    }
}