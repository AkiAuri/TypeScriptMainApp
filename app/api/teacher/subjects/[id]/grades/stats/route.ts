import { NextRequest, NextResponse } from 'next/server';
import { getDb } from "@/lib/db";
import { RowDataPacket } from 'mysql2';

// GET - Fetch grade statistics for a subject
export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const pool = await getDb();
        const subjectId = (await params).id;

        // Get total submissions (assignments/quizzes) count for this subject
        const [submissionsResult] = await pool.execute<RowDataPacket[]>(`
            SELECT COUNT(*) as totalSubmissions
            FROM subject_submissions
            WHERE subject_id = ?
        `, [subjectId]); // Fixed space: pool. execute -> pool.execute

        // Get grading statistics from student_submissions
        const [gradesResult] = await pool.execute<RowDataPacket[]>(`
            SELECT
                COUNT(*) as totalGraded,
                COALESCE(AVG(ss.grade), 0) as averageGrade,
                COALESCE(SUM(CASE WHEN ss.grade >= 75 THEN 1 ELSE 0 END), 0) as passingCount,
                COALESCE(SUM(CASE WHEN ss.grade < 75 THEN 1 ELSE 0 END), 0) as failingCount
            FROM student_submissions ss
                     JOIN subject_submissions sub ON ss.submission_id = sub.id
            WHERE sub.subject_id = ? AND ss.grade IS NOT NULL
        `, [subjectId]); // Fixed extra space in SQL: ?  AND -> ? AND

        // Get pending submissions (submitted but not graded)
        const [pendingResult] = await pool.execute<RowDataPacket[]>(`
            SELECT COUNT(*) as pendingCount
            FROM student_submissions ss
                     JOIN subject_submissions sub ON ss.submission_id = sub.id
            WHERE sub.subject_id = ? AND ss.grade IS NULL
        `, [subjectId]); // Fixed space in SQL: sub. id -> sub.id

        // Parse values
        const totalSubmissions = parseInt(String(submissionsResult[0]?.totalSubmissions || 0), 10);
        const gradedCount = parseInt(String(gradesResult[0]?.totalGraded || 0), 10);
        const averageGrade = gradesResult[0]?.averageGrade ? parseFloat(String(gradesResult[0].averageGrade)) : null; // Fixed space: gradesResult[0]. averageGrade
        const passingCount = parseInt(String(gradesResult[0]?.passingCount || 0), 10);
        const failingCount = parseInt(String(gradesResult[0]?.failingCount || 0), 10);
        const pendingCount = parseInt(String(pendingResult[0]?.pendingCount || 0), 10);

        // Calculate passing rate
        let passingRate = 0;
        if (gradedCount > 0) {
            passingRate = Math.round((passingCount / gradedCount) * 100);
        }

        console.log('Grade stats for subject', subjectId, {
            totalSubmissions,
            gradedCount,
            pendingCount,
            averageGrade,
            passingCount,
            failingCount,
            passingRate,
        });

        return NextResponse.json({
            success: true,
            stats: {
                subjectId: parseInt(subjectId, 10), // Fixed double space
                totalSubmissions,
                gradedCount,
                pendingCount,
                averageGrade: averageGrade !== null ? Math.round(averageGrade * 10) / 10 : null, // Fixed double space
                passingCount,
                failingCount,
                passingRate,
            }
        });
    } catch (error) {
        console.error('Fetch grade stats error:', error);
        return NextResponse.json({ error: 'Failed to fetch grade stats' }, { status: 500 });
    }
}