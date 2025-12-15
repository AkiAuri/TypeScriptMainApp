import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { RowDataPacket } from 'mysql2';
import { logActivity, getAdminIdFromRequest } from '@/lib/activity-logger';

// PUT - Update section
export async function PUT(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const adminId = getAdminIdFromRequest(request);
        const { name } = await request. json();
        const { id } = params;

        // Get old name for logging
        const [oldData] = await pool.execute<RowDataPacket[]>(
            'SELECT name FROM sections WHERE id = ?',
            [id]
        );
        const oldName = oldData[0]?.name;

        await pool.execute('UPDATE sections SET name = ? WHERE id = ?', [name, id]);

        // ✅ Log activity
        await logActivity(
            adminId,
            'update',
            `Updated section: "${oldName}" to "${name}"`
        );

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Update section error:', error);
        return NextResponse.json({ error: 'Failed to update section' }, { status:  500 });
    }
}

// DELETE - Delete section
export async function DELETE(
    request: NextRequest,
    { params }: { params: { id:  string } }
) {
    try {
        const adminId = getAdminIdFromRequest(request);
        const { id } = params;

        // Get section info for logging
        const [data] = await pool.execute<RowDataPacket[]>(
            `SELECT s.name, gl.name as grade_level_name 
            FROM sections s 
            LEFT JOIN grade_levels gl ON s.grade_level_id = gl.id 
            WHERE s.id = ? `,
            [id]
        );
        const sectionName = data[0]?. name;
        const gradeLevelName = data[0]?.grade_level_name;

        await pool.execute('DELETE FROM sections WHERE id = ?', [id]);

        // ✅ Log activity
        await logActivity(
            adminId,
            'delete',
            `Deleted section: ${sectionName}${gradeLevelName ? ` from ${gradeLevelName}` : ''}`
        );

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Delete section error:', error);
        return NextResponse.json({ error: 'Failed to delete section' }, { status: 500 });
    }
}