import { NextRequest, NextResponse } from 'next/server';
import { getDb } from "@/lib/db";
import { RowDataPacket } from 'mysql2';
import { logActivity, getAdminIdFromRequest } from '@/lib/activity-logger';

// PUT - Update school year
export async function PUT(
    request:  NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const pool = await getDb();
        const adminId = getAdminIdFromRequest(request);
        const { year } = await request.json();
        const { id } = await params;

        // Get old year for logging
        const [oldData] = await pool.execute<RowDataPacket[]>(
            'SELECT year FROM school_years WHERE id = ?',
            [id]
        );
        const oldYear = oldData[0]?. year;

        await pool.execute('UPDATE school_years SET year = ? WHERE id = ?', [year, id]);

        // ✅ Log activity
        await logActivity(
            adminId,
            'update',
            `Updated school year: "${oldYear}" to "${year}"`
        );

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Update school year error:', error);
        return NextResponse.json({ error: 'Failed to update school year' }, { status: 500 });
    }
}

// DELETE - Delete school year
export async function DELETE(
    request:  NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const pool = await getDb();
        const adminId = getAdminIdFromRequest(request);
        const { id } = params;

        // Get school year for logging
        const [data] = await pool.execute<RowDataPacket[]>(
            'SELECT year FROM school_years WHERE id = ?',
            [id]
        );
        const year = data[0]?.year;

        await pool.execute('DELETE FROM school_years WHERE id = ? ', [id]);

        // ✅ Log activity
        await logActivity(
            adminId,
            'delete',
            `Deleted school year: ${year}`
        );

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Delete school year error:', error);
        return NextResponse.json({ error: 'Failed to delete school year' }, { status: 500 });
    }
}