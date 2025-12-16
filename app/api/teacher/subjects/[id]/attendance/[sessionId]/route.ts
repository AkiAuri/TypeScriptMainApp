import { NextRequest, NextResponse } from 'next/server';
import { getDb } from "@/lib/db";
import { RowDataPacket } from 'mysql2';
import { logActivity, getAdminIdFromRequest } from '@/lib/activity-logger';

// GET - Fetch single attendance session with records
export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string; sessionId: string }> }
) {
    try {
        const pool = await getDb();
        const { sessionId } = await params;

        // Get session details
        const [sessions] = await pool.execute<RowDataPacket[]>(`
      SELECT 
        id,
        session_date as date,
        session_time as time,
        is_visible as visible
      FROM attendance_sessions
      WHERE id = ?
    `, [sessionId]);

        if (sessions.length === 0) {
            return NextResponse.json({ error: 'Session not found' }, { status: 404 });
        }

        // Get attendance records
        const [records] = await pool.execute<RowDataPacket[]>(`
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
    `, [sessionId]);

        return NextResponse.json({
            success: true,
            session: {
                ...sessions[0],
                records: records.map(r => ({
                    studentId: r.studentId,
                    status: r.status,
                    name: [r.first_name, r.last_name].filter(Boolean).join(' ') || r.username
                }))
            }
        });
    } catch (error) {
        console.error('Fetch attendance session error:', error);
        return NextResponse.json({ error: 'Failed to fetch session' }, { status: 500 });
    }
}

// PUT - Update attendance session
export async function PUT(
    request: NextRequest,
    { params }: { params: Promise<{ id: string; sessionId: string }> }
) {
    try {
        const pool = await getDb();
        const { sessionId } = await params;
        const teacherId = getAdminIdFromRequest(request);
        const body = await request.json();

        const { date, time, isVisible, students } = body;

        // Update session
        await pool.execute(`
      UPDATE attendance_sessions SET
        session_date = ?,
        session_time = ?,
        is_visible = ?
      WHERE id = ?
    `, [date, time || null, isVisible ? 1 : 0, sessionId]);

        // Update attendance records
        if (students && students.length > 0) {
            // Delete existing records
            await pool.execute('DELETE FROM attendance_records WHERE session_id = ?', [sessionId]);

            // Insert new records
            for (const student of students) {
                await pool.execute(
                    'INSERT INTO attendance_records (session_id, student_id, status) VALUES (?, ?, ?)',
                    [sessionId, student.id, student.status]
                );
            }
        }

        await logActivity(teacherId, 'update', `Updated attendance session for ${date}`);

        return NextResponse.json({
            success: true,
            session: { id: parseInt(sessionId), date, time, visible: isVisible }
        });
    } catch (error) {
        console.error('Update attendance session error:', error);
        return NextResponse.json({ error: 'Failed to update session' }, { status: 500 });
    }
}

// DELETE - Delete attendance session
export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ id: string; sessionId: string }> }
) {
    try {
        const pool = await getDb();
        const { sessionId } = await params;
        const teacherId = getAdminIdFromRequest(request);

        // Get session info for logging
        const [session] = await pool.execute<RowDataPacket[]>(
            'SELECT session_date FROM attendance_sessions WHERE id = ?',
            [sessionId]
        );

        await pool.execute('DELETE FROM attendance_sessions WHERE id = ?', [sessionId]);

        await logActivity(teacherId, 'delete', `Deleted attendance session for ${session[0]?.session_date}`);

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Delete attendance session error:', error);
        return NextResponse.json({ error: 'Failed to delete session' }, { status: 500 });
    }
}