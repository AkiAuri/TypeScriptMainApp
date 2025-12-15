import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { RowDataPacket } from 'mysql2';
import { logActivity, getAdminIdFromRequest } from '@/lib/activity-logger';

// GET - Fetch instructors for a subject
export async function GET(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const { id } = params;

        const [assigned] = await pool.execute<RowDataPacket[]>(`
            SELECT
                u.id,
                u.username,
                u.email,
                p.first_name,
                p.middle_name,
                p.last_name,
                p.department,
                p.employee_id
            FROM subject_instructors si
                     JOIN users u ON si.instructor_id = u.id
                     LEFT JOIN profiles p ON u.id = p.user_id
            WHERE si.subject_id = ?  AND u.role = 'teacher'
        `, [id]);

        return NextResponse.json({ success: true, data: assigned });
    } catch (error) {
        console.error('Fetch subject instructors error:', error);
        return NextResponse.json({ error: 'Failed to fetch instructors' }, { status: 500 });
    }
}

// POST - Assign instructor to subject
export async function POST(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const adminId = getAdminIdFromRequest(request);
        const { id } = params;
        const { instructorId } = await request.json();

        // Get instructor and subject names for logging
        const [instructor] = await pool.execute<RowDataPacket[]>(
            `SELECT u.username, p.first_name, p.last_name 
            FROM users u 
            LEFT JOIN profiles p ON u.id = p.user_id 
            WHERE u.id = ?`,
            [instructorId]
        );
        const [subject] = await pool.execute<RowDataPacket[]>(
            'SELECT name FROM subjects WHERE id = ? ',
            [id]
        );

        const instructorName = [instructor[0]?.first_name, instructor[0]?. last_name]
            .filter(Boolean).join(' ') || instructor[0]?.username || 'Unknown';
        const subjectName = subject[0]?. name || 'Unknown';

        await pool.execute(
            'INSERT INTO subject_instructors (subject_id, instructor_id) VALUES (?, ?)',
            [id, instructorId]
        );

        // ✅ Log activity
        await logActivity(
            adminId,
            'create',
            `Assigned instructor ${instructorName} to ${subjectName}`
        );

        return NextResponse.json({ success: true });
    } catch (error:  any) {
        if (error.code === 'ER_DUP_ENTRY') {
            return NextResponse.json({ error: 'Instructor already assigned' }, { status: 400 });
        }
        console.error('Assign instructor error:', error);
        return NextResponse. json({ error: 'Failed to assign instructor' }, { status: 500 });
    }
}

// DELETE - Remove instructor from subject
export async function DELETE(
    request: NextRequest,
    { params }: { params: { id:  string } }
) {
    try {
        const adminId = getAdminIdFromRequest(request);
        const { id } = params;
        const { searchParams } = new URL(request. url);
        const instructorId = searchParams.get('instructorId');

        // Get instructor and subject names for logging
        const [instructor] = await pool.execute<RowDataPacket[]>(
            `SELECT u.username, p.first_name, p.last_name 
            FROM users u 
            LEFT JOIN profiles p ON u.id = p.user_id 
            WHERE u.id = ?`,
            [instructorId]
        );
        const [subject] = await pool. execute<RowDataPacket[]>(
            'SELECT name FROM subjects WHERE id = ?',
            [id]
        );

        const instructorName = [instructor[0]?.first_name, instructor[0]?.last_name]
            .filter(Boolean).join(' ') || instructor[0]?.username || 'Unknown';
        const subjectName = subject[0]?.name || 'Unknown';

        await pool.execute(
            'DELETE FROM subject_instructors WHERE subject_id = ? AND instructor_id = ?',
            [id, instructorId]
        );

        // ✅ Log activity
        await logActivity(
            adminId,
            'delete',
            `Removed instructor ${instructorName} from ${subjectName}`
        );

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Remove instructor error:', error);
        return NextResponse.json({ error: 'Failed to remove instructor' }, { status: 500 });
    }
}