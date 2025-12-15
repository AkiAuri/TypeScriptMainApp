import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { RowDataPacket } from 'mysql2';
import { logActivity, getAdminIdFromRequest } from '@/lib/activity-logger';

// PUT - Update semester
export async function PUT(
    request:  NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const adminId = getAdminIdFromRequest(request);
        const { name } = await request.json();
        const { id } = params;

        // Get old name for logging
        const [oldData] = await pool.execute<RowDataPacket[]>(
            'SELECT name FROM semesters WHERE id = ?',
            [id]
        );
        const oldName = oldData[0]?.name;

        await pool.execute('UPDATE semesters SET name = ? WHERE id = ? ', [name, id]);

        // ✅ Log activity
        await logActivity(
            adminId,
            'update',
            `Updated semester:  "${oldName}" to "${name}"`
        );

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Update semester error:', error);
        return NextResponse.json({ error: 'Failed to update semester' }, { status: 500 });
    }
}

// DELETE - Delete semester
export async function DELETE(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const adminId = getAdminIdFromRequest(request);
        const { id } = params;

        // Get semester info for logging
        const [data] = await pool.execute<RowDataPacket[]>(
            `SELECT s.name, sy.year as school_year 
            FROM semesters s 
            LEFT JOIN school_years sy ON s.school_year_id = sy.id 
            WHERE s.id = ?`,
            [id]
        );
        const semesterName = data[0]?. name;
        const schoolYear = data[0]?.school_year;

        await pool.execute('DELETE FROM semesters WHERE id = ?', [id]);

        // ✅ Log activity
        await logActivity(
            adminId,
            'delete',
            `Deleted semester: ${semesterName}${schoolYear ? ` from ${schoolYear}` : ''}`
        );

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Delete semester error:', error);
        return NextResponse.json({ error: 'Failed to delete semester' }, { status: 500 });
    }
}