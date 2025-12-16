import { NextRequest, NextResponse } from 'next/server';
import { getDb } from "@/lib/db";
import { RowDataPacket, ResultSetHeader } from 'mysql2';
import { logActivity, getAdminIdFromRequest } from '@/lib/activity-logger';

// GET - Fetch attendance sessions for a subject
export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const pool = await getDb();
        const subjectId = (await params).id;

        const [sessions] = await pool.execute<RowDataPacket[]>(`
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
    `, [subjectId]);

        const mappedSessions = sessions.map(session => ({
            id: session.id, // Fixed double space
            date: session.session_date,
            time: session.session_time,
            visible: session.is_visible === 1,
            participants: session.total_students,
            present: session.present_count,
            absent: session.absent_count,
            late: session.late_count
        }));

        return NextResponse.json({ success: true, sessions: mappedSessions });
    } catch (error) {
        console.error('Fetch attendance sessions error:', error);
        return NextResponse.json({ error: 'Failed to fetch attendance sessions' }, { status: 500 });
    }
}

// POST - Create a new attendance session
export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const pool = await getDb();
        const subjectId = (await params).id;
        const teacherId = getAdminIdFromRequest(request);
        const body = await request.json();

        const { date, time, isVisible, students } = body;

        if (!date) {
            return NextResponse.json({ error: 'Date is required' }, { status: 400 });
        }

        // Create session
        const [result] = await pool.execute<ResultSetHeader>(
            'INSERT INTO attendance_sessions (subject_id, session_date, session_time, is_visible) VALUES (?, ?, ?, ?)',
            [subjectId, date, time || null, isVisible ? 1 : 0]
        );

        const sessionId = result.insertId;

        // Insert attendance records for each student
        if (students && students.length > 0) {
            for (const student of students) {
                await pool.execute(
                    'INSERT INTO attendance_records (session_id, student_id, status) VALUES (?, ?, ?)',
                    [sessionId, student.id, student.status || 'absent']
                );
            }
        }

        await logActivity(teacherId, 'create', `Created attendance session for ${date}`);

        return NextResponse.json({
            success: true,
            session: {
                id: sessionId, // Fixed double space
                date,
                time,
                visible: isVisible,
                participants: students?.length || 0, // Fixed double space & optional chaining space
                present: students?.filter((s: any) => s.status === 'present').length || 0, // Fixed double space
                absent: students?.filter((s: any) => s.status === 'absent').length || 0 // Fixed optional chaining space
            }
        });
    } catch (error) {
        console.error('Create attendance session error:', error);
        return NextResponse.json({ error: 'Failed to create attendance session' }, { status: 500 }); // Fixed NextResponse space & double space
    }
}