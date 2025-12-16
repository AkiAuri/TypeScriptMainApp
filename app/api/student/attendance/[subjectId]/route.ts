import { NextRequest, NextResponse } from 'next/server';

async function getDB() {
    const { getCloudflareContext } = await import('@opennextjs/cloudflare');
    const ctx = await getCloudflareContext({ async: true });
    const db = (ctx.env as any)?.DB;
    if (!db) throw new Error('Database not configured');
    return { db, ctx };
}

// GET - Fetch detailed attendance for a specific subject
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

        // Get all attendance sessions with student's status
        const sessionsResult = await db
            .prepare(`
                SELECT 
                    asess.id,
                    asess.session_date,
                    asess.session_time,
                    asess.created_at,
                    ar.status,
                    ar.created_at as marked_at
                FROM attendance_sessions asess
                LEFT JOIN attendance_records ar ON asess.id = ar.session_id AND ar.student_id = ? 
                WHERE asess.subject_id = ?
                ORDER BY asess.session_date DESC, asess.session_time DESC
            `)
            .bind(studentId, subjectId)
            .all();

        // Map sessions with status
        const sessions = sessionsResult.results.map((session: any) => ({
            id: session.id,
            date: session.session_date,
            time: session.session_time,
            status: session.status || 'absent', // If no record, assume absent
            markedAt: session.marked_at,
        }));

        // Calculate stats
        const totalSessions = sessions.length;
        const presentCount = sessions.filter((s: any) => s.status === 'present').length;
        const lateCount = sessions.filter((s: any) => s.status === 'late').length;
        const absentCount = sessions.filter((s: any) => s.status === 'absent').length;
        const excusedCount = sessions.filter((s: any) => s.status === 'excused').length;
        const attendedCount = presentCount + lateCount;
        const attendanceRate = totalSessions > 0
            ? Math.round((attendedCount / totalSessions) * 100)
            : 0;

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
                attendanceRate,
                totalSessions,
                presentCount,
                lateCount,
                absentCount,
                excusedCount,
                attendedCount,
            },
            sessions,
        });
    } catch (error: any) {
        console.error('Fetch subject attendance error:', error);
        return NextResponse.json({
            error: 'Failed to fetch attendance',
            details: error.message
        }, { status: 500 });
    }
}