import { NextRequest, NextResponse } from 'next/server';

async function getDB() {
    const { getCloudflareContext } = await import('@opennextjs/cloudflare');
    const ctx = await getCloudflareContext({ async: true });
    const db = (ctx.env as any)?.DB;
    if (!db) throw new Error('Database not configured');
    return { db, ctx };
}

// GET - Fetch grade statistics for a subject
export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { db } = await getDB();
        const { id: subjectId } = await params;

        // Get total submissions (assignments/quizzes) count for this subject
        const submissionsResult = await db
            .prepare('SELECT COUNT(*) as totalSubmissions FROM subject_submissions WHERE subject_id = ?')
            .bind(subjectId)
            .first<{ totalSubmissions: number }>();

        // Get grading statistics from student_submissions
        const gradesResult = await db
            .prepare(`
                SELECT
                    COUNT(*) as totalGraded,
                    COALESCE(AVG(ss.grade), 0) as averageGrade,
                    COALESCE(SUM(CASE WHEN ss.grade >= 75 THEN 1 ELSE 0 END), 0) as passingCount,
                    COALESCE(SUM(CASE WHEN ss.grade < 75 THEN 1 ELSE 0 END), 0) as failingCount
                FROM student_submissions ss
                JOIN subject_submissions sub ON ss.submission_id = sub.id
                WHERE sub.subject_id = ? AND ss.grade IS NOT NULL
            `)
            .bind(subjectId)
            .first<{
                totalGraded: number;
                averageGrade: number;
                passingCount: number;
                failingCount: number;
            }>();

        // Get pending submissions (submitted but not graded)
        const pendingResult = await db
            .prepare(`
                SELECT COUNT(*) as pendingCount
                FROM student_submissions ss
                JOIN subject_submissions sub ON ss.submission_id = sub.id
                WHERE sub.subject_id = ? AND ss.grade IS NULL
            `)
            .bind(subjectId)
            .first<{ pendingCount: number }>();

        const totalSubmissions = submissionsResult?.totalSubmissions || 0;
        const gradedCount = gradesResult?.totalGraded || 0;
        const averageGrade = gradesResult?.averageGrade || null;
        const passingCount = gradesResult?.passingCount || 0;
        const failingCount = gradesResult?.failingCount || 0;
        const pendingCount = pendingResult?.pendingCount || 0;

        // Calculate passing rate
        let passingRate = 0;
        if (gradedCount > 0) {
            passingRate = Math.round((passingCount / gradedCount) * 100);
        }

        return NextResponse.json({
            success: true,
            stats: {
                subjectId: parseInt(subjectId, 10),
                totalSubmissions,
                gradedCount,
                pendingCount,
                averageGrade: averageGrade !== null ? Math.round(averageGrade * 10) / 10 : null,
                passingCount,
                failingCount,
                passingRate,
            }
        });
    } catch (error: any) {
        console.error('Fetch grade stats error:', error);
        return NextResponse.json({ error: 'Failed to fetch grade stats: ' + error.message }, { status: 500 });
    }
}