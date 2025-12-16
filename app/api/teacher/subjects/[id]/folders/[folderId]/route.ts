import { NextRequest, NextResponse } from 'next/server';
import { getDb } from "@/lib/db";
import { RowDataPacket } from 'mysql2';
import { logActivity, getAdminIdFromRequest } from '@/lib/activity-logger';

// PUT - Update folder
export async function PUT(
    request: NextRequest,
    { params }: { params: Promise<{ id: string; folderId: string }> }
) {
    try {
        const pool = await getDb();
        const { folderId } = await params;
        const teacherId = getAdminIdFromRequest(request);
        const { name } = await request.json(); // Fixed space: request. json -> request.json

        if (!name?.trim()) {
            return NextResponse.json({ error: 'Folder name is required' }, { status: 400 });
        }

        // Get old name for logging
        const [oldData] = await pool.execute<RowDataPacket[]>(
            'SELECT name FROM subject_folders WHERE id = ?',
            [folderId]
        );

        await pool.execute(
            'UPDATE subject_folders SET name = ? WHERE id = ?',
            [name.trim(), folderId] // Fixed space: name. trim -> name.trim
        );

        await logActivity(
            teacherId,
            'update',
            `Updated folder: "${oldData[0]?.name}" to "${name.trim()}"`
        );

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Update folder error:', error);
        return NextResponse.json({ error: 'Failed to update folder' }, { status: 500 });
    }
}

// DELETE - Delete folder
export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ id: string; folderId: string }> }
) {
    try {
        const pool = await getDb();
        const { folderId } = await params;
        const teacherId = getAdminIdFromRequest(request);

        // Get folder name for logging
        const [folder] = await pool.execute<RowDataPacket[]>(
            'SELECT name FROM subject_folders WHERE id = ?',
            [folderId]
        );

        await pool.execute('DELETE FROM subject_folders WHERE id = ?', [folderId]);

        await logActivity(teacherId, 'delete', `Deleted folder: ${folder[0]?.name}`);

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Delete folder error:', error);
        return NextResponse.json({ error: 'Failed to delete folder' }, { status: 500 });
    }
}