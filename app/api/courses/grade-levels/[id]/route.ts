import { NextRequest, NextResponse } from 'next/server';
import { getDb } from "@/lib/db";
import { RowDataPacket } from 'mysql2';
import { logActivity, getAdminIdFromRequest } from '@/lib/activity-logger';

// PUT - Update grade level
export async function PUT(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const pool = await getDb();
        const adminId = getAdminIdFromRequest(request);
        const { name } = await request.json();
        const { id } = await params;

        // Get old name for logging
        const [oldData] = await pool.execute<RowDataPacket[]>(
            'SELECT name FROM grade_levels WHERE id = ?',
            [id]
        );
        const oldName = oldData[0]?.name;

        await pool.execute('UPDATE grade_levels SET name = ?  WHERE id = ?', [name, id]);

        // ✅ Log activity
        await logActivity(
            adminId,
            'update',
            `Updated grade level: "${oldName}" to "${name}"`
        );

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Update grade level error:', error);
        return NextResponse.json({ error: 'Failed to update grade level' }, { status: 500 });
    }
}

// DELETE - Delete grade level
export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const pool = await getDb();
        const adminId = getAdminIdFromRequest(request);
        const { id } = await params;

        // Get name for logging
        const [data] = await pool.execute<RowDataPacket[]>(
            'SELECT name FROM grade_levels WHERE id = ?',
            [id]
        );
        const name = data[0]?.name;

        await pool.execute('DELETE FROM grade_levels WHERE id = ?', [id]);

        // ✅ Log activity
        await logActivity(
            adminId,
            'delete',
            `Deleted grade level: ${name}`
        );

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Delete grade level error:', error);
        return NextResponse.json({ error: 'Failed to delete grade level' }, { status: 500 });
    }
}