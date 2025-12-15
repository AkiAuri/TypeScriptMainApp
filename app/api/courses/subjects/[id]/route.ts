import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { RowDataPacket } from 'mysql2';
import { logActivity, getAdminIdFromRequest } from '@/lib/activity-logger';

// PUT - Update subject
export async function PUT(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const adminId = getAdminIdFromRequest(request);
        const { name, code } = await request.json();
        const { id } = params;

        // Get old data for logging
        const [oldData] = await pool.execute<RowDataPacket[]>(
            'SELECT name, code FROM subjects WHERE id = ?',
            [id]
        );
        const oldName = oldData[0]?. name;

        await pool.execute('UPDATE subjects SET name = ?, code = ?  WHERE id = ?', [name, code || null, id]);

        // ✅ Log activity
        await logActivity(
            adminId,
            'update',
            `Updated subject: "${oldName}" to "${name}"${code ? ` (${code})` : ''}`
        );

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Update subject error:', error);
        return NextResponse.json({ error: 'Failed to update subject' }, { status: 500 });
    }
}

// DELETE - Delete subject
export async function DELETE(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const adminId = getAdminIdFromRequest(request);
        const { id } = params;

        // Get subject info for logging
        const [data] = await pool.execute<RowDataPacket[]>(
            'SELECT name, code FROM subjects WHERE id = ?',
            [id]
        );
        const subjectName = data[0]?.name;
        const subjectCode = data[0]?.code;

        await pool.execute('DELETE FROM subjects WHERE id = ?', [id]);

        // ✅ Log activity
        await logActivity(
            adminId,
            'delete',
            `Deleted subject: ${subjectName}${subjectCode ? ` (${subjectCode})` : ''}`
        );

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Delete subject error:', error);
        return NextResponse.json({ error: 'Failed to delete subject' }, { status:  500 });
    }
}