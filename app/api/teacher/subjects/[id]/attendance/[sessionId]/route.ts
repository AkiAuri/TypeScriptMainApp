import { NextRequest, NextResponse } from 'next/server';

async function getDB() {
    const { getCloudflareContext } = await import('@opennextjs/cloudflare');
    const ctx = await getCloudflareContext({ async: true });
    const db = (ctx.env as any)?.DB;
    if (!db) throw new Error('Database not configured');
    return { db, ctx };
}

// GET - Fetch single attendance session with records
export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string; sessionId: string }> }
) {
    try {
        const { db } = await getDB();
        const { sessionId } = await params;

        // Get session details
        const session = await db
            .prepare(`
                SELECT 
                    id,
                    session_date as date,
                    session_time as time,
                    is_visible as visible
                FROM attendance_sessions
                WHERE id = ?
            `)
            .bind(sessionId)
            .first();

        if (!session) {
            return NextResponse.json({ error: 'Session not found' }, { status: 404 });
        }

        // Get attendance records
        const recordsResult = await db
            .prepare(`
                SELECT 
                    ar.student_id as studentId,
                    ar.status,
                    u.username,
                    p.first_name,
                    p.last_name
                FROM attendance_records ar
                JOIN users u ON ar.student_id = u.id
                LEFT JOIN profiles p ON u.id = p.user_id
                WHERE ar.session_id = ?
            `)
            .bind(sessionId)
            .all();

        return NextResponse.json({
            success: true,
            session: {
                ...session,
                records: recordsResult.results.map((r: any) => ({
                    studentId: r.studentId,
                    status: r.status,
                    name: [r.first_name, r.last_name].filter(Boolean).join(' ') || r.username
                }))
            }
        });
    } catch (error: any) {
        console.error('Fetch attendance session error:', error);
        return NextResponse.json({ error: 'Failed to fetch session: ' + error.message }, { status: 500 });
    }
}

// PUT - Update attendance session
export async function PUT(
    request: NextRequest,
    { params }: { params: Promise<{ id: string; sessionId: string }> }
) {
    try {
        const { db, ctx } = await getDB();
        const { sessionId } = await params;
        const body = await request.json();
        const { date, time, isVisible, students } = body;

        // Update session
        await db
            .prepare(`
                UPDATE attendance_sessions SET
                    session_date = ?,
                    session_time = ?,
                    is_visible = ?,
                    updated_at = datetime('now')
                WHERE id = ?
            `)
            .bind(date, time || null, isVisible ? 1 : 0, sessionId)
            .run();

        // Update attendance records
        if (students && students.length > 0) {
            // Delete existing records
            await db
                .prepare('DELETE FROM attendance_records WHERE session_id = ?')
                .bind(sessionId)
                .run();

            // Insert new records
            for (const student of students) {
                await db
                    .prepare('INSERT INTO attendance_records (session_id, student_id, status) VALUES (?, ?, ?)')
                    .bind(sessionId, student.id, student.status)
                    .run();
            }
        }

        // Log activity (non-blocking)
        const logPromise = db
            .prepare('INSERT INTO activity_logs (user_id, action_type, description) VALUES (?, ?, ?)')
            .bind(null, 'update', `Updated attendance session for ${date}`)
            .run();

        if (ctx.ctx?.waitUntil) {
            ctx.ctx.waitUntil(logPromise);
        }

        return NextResponse.json({
            success: true,
            session: { id: parseInt(sessionId), date, time, visible: isVisible }
        });
    } catch (error: any) {
        console.error('Update attendance session error:', error);
        return NextResponse.json({ error: 'Failed to update session: ' + error.message }, { status: 500 });
    }
}

// DELETE - Delete attendance session
export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ id: string; sessionId: string }> }
) {
    try {
        const { db, ctx } = await getDB();
        const { sessionId } = await params;

        // Get session info for logging
        const session = await db
            .prepare('SELECT session_date FROM attendance_sessions WHERE id = ?')
            .bind(sessionId)
            .first<{ session_date: string }>();

        await db
            .prepare('DELETE FROM attendance_sessions WHERE id = ?')
            .bind(sessionId)
            .run();

        // Log activity (non-blocking)
        const logPromise = db
            .prepare('INSERT INTO activity_logs (user_id, action_type, description) VALUES (?, ?, ?)')
            .bind(null, 'delete', `Deleted attendance session for ${session?.session_date}`)
            .run();

        if (ctx.ctx?.waitUntil) {
            ctx.ctx.waitUntil(logPromise);
        }

        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error('Delete attendance session error:', error);
        return NextResponse.json({ error: 'Failed to delete session: ' + error.message }, { status: 500 });
    }
}