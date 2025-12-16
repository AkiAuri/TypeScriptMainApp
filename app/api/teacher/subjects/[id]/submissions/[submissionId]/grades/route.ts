import { NextRequest, NextResponse } from 'next/server';
import { getDb } from "@/lib/db";
import { RowDataPacket, ResultSetHeader } from 'mysql2';
import { logActivity, getAdminIdFromRequest } from '@/lib/activity-logger';

// GET - Fetch student submissions for grading
export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string; submissionId: string }> }
) {
    try {
        const pool = await getDb();
        const { id: subjectId, submissionId } = await params;

        // Get submission details
        const [submissions] = await pool.execute<RowDataPacket[]>(`
      SELECT 
        ss.id,
        ss.name,
        ss.description,
        ss.due_date,
        ss.due_time,
        ss.max_attempts
      FROM subject_submissions ss
      WHERE ss.id = ? AND ss.subject_id = ?
    `, [submissionId, subjectId]);

        if (submissions.length === 0) {
            return NextResponse.json({ error: 'Submission not found' }, { status: 404 });
        }

        // Get all students enrolled in this subject with their submission status
        const [students] = await pool.execute<RowDataPacket[]>(`
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
    `, [submissionId, subjectId]);

        const mappedStudents = students.map(student => ({
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
                ? student.grade !== null
                    ? 'graded'
                    : 'submitted'
                : 'not_submitted'
        }));

        return NextResponse.json({
            success: true,
            submission: submissions[0],
            students: mappedStudents
        });
    } catch (error) {
        console.error('Fetch grades error:', error);
        return NextResponse.json({ error: 'Failed to fetch grades' }, { status: 500 });
    }
}

// POST - Submit grade for a student
export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ id: string; submissionId: string }> }
) {
    try {
        const pool = await getDb();
        const { submissionId } = await params;
        const teacherId = getAdminIdFromRequest(request);
        const body = await request.json();

        const { studentId, grade, feedback } = body;

        if (!studentId) {
            return NextResponse.json({ error: 'Student ID is required' }, { status: 400 });
        }

        if (grade === undefined || grade === null) {
            return NextResponse.json({ error: 'Grade is required' }, { status: 400 });
        }

        // Check if student has submitted
        const [existing] = await pool.execute<RowDataPacket[]>(
            'SELECT id FROM student_submissions WHERE submission_id = ? AND student_id = ?',
            [submissionId, studentId]
        );

        if (existing.length === 0) {
            // Create a submission record for the student (for manual grading without student submission)
            const [result] = await pool.execute<ResultSetHeader>(
                `INSERT INTO student_submissions (submission_id, student_id, attempt_number, grade, feedback, graded_at, graded_by)
         VALUES (?, ?, 1, ?, ?, NOW(), ?)`,
                [submissionId, studentId, grade, feedback || null, teacherId]
            );

            return NextResponse.json({
                success: true,
                studentSubmissionId: result.insertId
            });
        } else {
            // Update existing submission
            await pool.execute(
                `UPDATE student_submissions SET grade = ?, feedback = ?, graded_at = NOW(), graded_by = ?
         WHERE submission_id = ? AND student_id = ?`,
                [grade, feedback || null, teacherId, submissionId, studentId]
            );

            return NextResponse.json({ success: true });
        }
    } catch (error) {
        console.error('Submit grade error:', error);
        return NextResponse.json({ error: 'Failed to submit grade' }, { status: 500 });
    }
}

// PUT - Bulk update grades
export async function PUT(
    request: NextRequest,
    { params }: { params: Promise<{ id: string; submissionId: string }> }
) {
    try {
        const pool = await getDb();
        const { submissionId } = await params;
        const teacherId = getAdminIdFromRequest(request);
        const body = await request.json();

        const { grades } = body; // Array of { studentId, grade, feedback }

        if (!grades || !Array.isArray(grades)) {
            return NextResponse.json({ error: 'Grades array is required' }, { status: 400 });
        }

        for (const gradeData of grades) {
            const { studentId, grade, feedback } = gradeData;

            if (grade === undefined || grade === null) continue;

            // Check if student has submitted
            const [existing] = await pool.execute<RowDataPacket[]>(
                'SELECT id FROM student_submissions WHERE submission_id = ? AND student_id = ?',
                [submissionId, studentId]
            );

            if (existing.length === 0) {
                await pool.execute(
                    `INSERT INTO student_submissions (submission_id, student_id, attempt_number, grade, feedback, graded_at, graded_by)
           VALUES (?, ?, 1, ?, ?, NOW(), ?)`,
                    [submissionId, studentId, grade, feedback || null, teacherId]
                );
            } else {
                await pool.execute(
                    `UPDATE student_submissions SET grade = ?, feedback = ?, graded_at = NOW(), graded_by = ?
           WHERE submission_id = ? AND student_id = ?`,
                    [grade, feedback || null, teacherId, submissionId, studentId]
                );
            }
        }

        // Get submission name for logging
        const [submission] = await pool.execute<RowDataPacket[]>(
            'SELECT name FROM subject_submissions WHERE id = ?',
            [submissionId]
        );

        await logActivity(
            teacherId,
            'update',
            `Updated grades for ${grades.length} students in "${submission[0]?.name}"`
        );

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Bulk update grades error:', error);
        return NextResponse.json({ error: 'Failed to update grades' }, { status: 500 });
    }
}