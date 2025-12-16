import { NextRequest, NextResponse } from 'next/server';

async function getDB() {
    const { getCloudflareContext } = await import('@opennextjs/cloudflare');
    const ctx = await getCloudflareContext({ async: true });
    const db = (ctx.env as any)?.DB;
    if (!db) throw new Error('Database not configured');
    return { db, ctx };
}

// GET - Fetch attendance sessions for a subject
export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { db } = await getDB();
        const { id: subjectId } = await params;

        const sessionsResult = await db
            .prepare(`
                SELECT 
                    a.id,
                    a.session_date,
                    a.session_time,
                    a.is_visible,
                    a.created_at,
                    (SELECT COUNT(*) FROM attendance_records ar WHERE ar.session_id = a.id) as total_students,
                    (SELECT COUNT(*) FROM attendance_records ar WHERE ar.session_id = a.id AND ar.status = 'present') as present_count,
                    (SELECT COUNT(*) FROM attendance_records ar WHERE ar.session_id = a.id AND ar.status = 'absent') as absent_count,
                    (SELECT COUNT(*) FROM attendance_records ar WHERE ar.session_id = a.id AND ar.status = 'late') as late_count
                FROM attendance_sessions a
                WHERE a.subject_id = ?
                ORDER BY a.session_date DESC, a.session_time DESC
            `)
            .bind(subjectId)
            .all();

        const mappedSessions = sessionsResult.results.map((session: any) => ({
            id: session.id,
            date: session.session_date,
            time: session.session_time,
            visible: session.is_visible === 1,
            participants: session.total_students,
            present: session.present_count,
            absent: session.absent_count,
            late: session.late_count
        }));

        return NextResponse.json({ success: true, sessions: mappedSessions });
    } catch (error: any) {
        console.error('Fetch attendance sessions error:', error);
        return NextResponse.json({ error: 'Failed to fetch attendance sessions: ' + error.message }, { status: 500 });
    }
}

// POST - Create a new attendance session
export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { db, ctx } = await getDB();
        const { id: subjectId } = await params;
        const body = await request.json();
        const { date, time, isVisible, students } = body;

        if (!date) {
            return NextResponse.json({ error: 'Date is required' }, { status: 400 });
        }

        // Create session
        const result = await db
            .prepare('INSERT INTO attendance_sessions (subject_id, session_date, session_time, is_visible, created_at) VALUES (?, ?, ?, ?, datetime(\'now\'))')
            .bind(subjectId, date, time || null, isVisible ? 1 : 0)
            .run();

        const sessionId = result.meta.last_row_id;

        // Insert attendance records for each student
        if (students && students.length > 0) {
            for (const student of students) {
                await db
                    .prepare('INSERT INTO attendance_records (session_id, student_id, status) VALUES (?, ?, ?)')
                    .bind(sessionId, student.id, student.status || 'absent')
                    .run();
            }
        }

        // Log activity (non-blocking)
        const logPromise = db
            .prepare('INSERT INTO activity_logs (user_id, action_type, description) VALUES (?, ?, ?)')
            .bind(null, 'create', `Created attendance session for ${date}`)
            .run();

        if (ctx.ctx?.waitUntil) {
            ctx.ctx.waitUntil(logPromise);
        }

        return NextResponse.json({
            success: true,
            session: {
                id: sessionId,
                date,
                time,
                visible: isVisible,
                participants: students?.length || 0,
                present: students?.filter((s: any) => s.status === 'present').length || 0,
                absent: students?.filter((s: any) => s.status === 'absent').length || 0
            }
        });
    } catch (error: any) {
        console.error('Create attendance session error:', error);
        return NextResponse.json({ error: 'Failed to create attendance session: ' + error.message }, { status: 500 });
    }
}