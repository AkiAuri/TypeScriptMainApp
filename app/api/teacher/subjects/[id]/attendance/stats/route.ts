import { NextRequest, NextResponse } from 'next/server';

async function getDB() {
    const { getCloudflareContext } = await import('@opennextjs/cloudflare');
    const ctx = await getCloudflareContext({ async: true });
    const db = (ctx.env as any)?.DB;
    if (!db) throw new Error('Database not configured');
    return { db, ctx };
}

// GET - Fetch attendance statistics for a subject
export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { db } = await getDB();
        const { id: subjectId } = await params;

        // Get total sessions count
        const sessionsResult = await db
            .prepare('SELECT COUNT(*) as totalSessions FROM attendance_sessions WHERE subject_id = ?')
            .bind(subjectId)
            .first<{ totalSessions: number }>();

        // Get attendance records aggregation
        const recordsResult = await db
            .prepare(`
                SELECT
                    COALESCE(SUM(CASE WHEN ar.status = 'present' THEN 1 ELSE 0 END), 0) as totalPresent,
                    COALESCE(SUM(CASE WHEN ar.status = 'absent' THEN 1 ELSE 0 END), 0) as totalAbsent,
                    COALESCE(SUM(CASE WHEN ar.status = 'late' THEN 1 ELSE 0 END), 0) as totalLate,
                    COALESCE(SUM(CASE WHEN ar.status = 'excused' THEN 1 ELSE 0 END), 0) as totalExcused,
                    COUNT(*) as totalRecords
                FROM attendance_records ar
                JOIN attendance_sessions a ON ar.session_id = a.id
                WHERE a.subject_id = ?
            `)
            .bind(subjectId)
            .first<{
                totalPresent: number;
                totalAbsent: number;
                totalLate: number;
                totalExcused: number;
                totalRecords: number;
            }>();

        // Get total students enrolled
        const studentsResult = await db
            .prepare('SELECT COUNT(*) as totalStudents FROM subject_students WHERE subject_id = ?')
            .bind(subjectId)
            .first<{ totalStudents: number }>();

        const totalSessions = sessionsResult?.totalSessions || 0;
        const totalPresent = recordsResult?.totalPresent || 0;
        const totalAbsent = recordsResult?.totalAbsent || 0;
        const totalLate = recordsResult?.totalLate || 0;
        const totalRecords = recordsResult?.totalRecords || 0;
        const totalStudents = studentsResult?.totalStudents || 0;

        // Calculate average attendance percentage
        let averageAttendance = 0;
        if (totalRecords > 0) {
            averageAttendance = Math.round(((totalPresent + totalLate) / totalRecords) * 100);
        }

        return NextResponse.json({
            success: true,
            stats: {
                subjectId: parseInt(subjectId, 10),
                totalSessions,
                totalPresent,
                totalAbsent,
                totalLate,
                totalStudents,
                averageAttendance,
            }
        });
    } catch (error: any) {
        console.error('Fetch attendance stats error:', error);
        return NextResponse.json({ error: 'Failed to fetch attendance stats: ' + error.message }, { status: 500 });
    }
}