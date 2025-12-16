import { NextRequest, NextResponse } from 'next/server';
import { getDb } from "@/lib/db";
import { RowDataPacket } from 'mysql2';
import { logActivity, getAdminIdFromRequest } from '@/lib/activity-logger';

// GET - Fetch students for a subject
export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const pool = await getDb();
        const { id } = await params;

        const [assigned] = await pool.execute<RowDataPacket[]>(`
            SELECT
                u.id,
                u.username,
                u.email,
                p.first_name,
                p.middle_name,
                p.last_name,
                p.department,
                p.employee_id as student_number
            FROM subject_students ss
                     JOIN users u ON ss.student_id = u.id
                     LEFT JOIN profiles p ON u. id = p.user_id
            WHERE ss.subject_id = ? AND u.role = 'student'
        `, [id]);

        return NextResponse.json({ success: true, data: assigned });
    } catch (error) {
        console.error('Fetch subject students error:', error);
        return NextResponse.json({ error: 'Failed to fetch students' }, { status: 500 });
    }
}

// POST - Assign student to subject
export async function POST(
    request:  NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const pool = await getDb();
        const adminId = getAdminIdFromRequest(request);
        const { id } = params;
        const { studentId } = await request.json();

        // Get student and subject names for logging
        const [student] = await pool.execute<RowDataPacket[]>(
            `SELECT u.username, p.first_name, p.last_name 
            FROM users u 
            LEFT JOIN profiles p ON u.id = p.user_id 
            WHERE u.id = ?`,
            [studentId]
        );
        const [subject] = await pool.execute<RowDataPacket[]>(
            'SELECT name FROM subjects WHERE id = ?',
            [id]
        );

        const studentName = [student[0]?.first_name, student[0]?.last_name]
            .filter(Boolean).join(' ') || student[0]?.username || 'Unknown';
        const subjectName = subject[0]?.name || 'Unknown';

        await pool.execute(
            'INSERT INTO subject_students (subject_id, student_id) VALUES (?, ?)',
            [id, studentId]
        );

        // ✅ Log activity
        await logActivity(
            adminId,
            'create',
            `Enrolled student ${studentName} in ${subjectName}`
        );

        return NextResponse.json({ success: true });
    } catch (error: any) {
        if (error.code === 'ER_DUP_ENTRY') {
            return NextResponse.json({ error: 'Student already assigned' }, { status: 400 });
        }
        console. error('Assign student error:', error);
        return NextResponse.json({ error: 'Failed to assign student' }, { status: 500 });
    }
}

// DELETE - Remove student from subject
export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const pool = await getDb();
        const adminId = getAdminIdFromRequest(request);
        const { id } = await params;
        const { searchParams } = new URL(request.url);
        const studentId = searchParams.get('studentId');

        // Get student and subject names for logging
        const [student] = await pool.execute<RowDataPacket[]>(
            `SELECT u.username, p.first_name, p.last_name 
            FROM users u 
            LEFT JOIN profiles p ON u.id = p.user_id 
            WHERE u.id = ?`,
            [studentId]
        );
        const [subject] = await pool.execute<RowDataPacket[]>(
            'SELECT name FROM subjects WHERE id = ?',
            [id]
        );

        const studentName = [student[0]?.first_name, student[0]?.last_name]
            .filter(Boolean).join(' ') || student[0]?.username || 'Unknown';
        const subjectName = subject[0]?.name || 'Unknown';

        await pool.execute(
            'DELETE FROM subject_students WHERE subject_id = ? AND student_id = ?',
            [id, studentId]
        );

        // ✅ Log activity
        await logActivity(
            adminId,
            'delete',
            `Removed student ${studentName} from ${subjectName}`
        );

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Remove student error:', error);
        return NextResponse.json({ error: 'Failed to remove student' }, { status: 500 });
    }
}