import { NextRequest, NextResponse } from 'next/server';
import { getDb } from "@/lib/db";
import { RowDataPacket } from 'mysql2';
import { logActivity, getAdminIdFromRequest } from '@/lib/activity-logger';

// PUT - Update submission
export async function PUT(
    request: NextRequest,
    { params }: { params: { id: string; submissionId: string } } // Fixed double space
) {
    try {
        const pool = await getDb();
        const { submissionId } = params;
        const teacherId = getAdminIdFromRequest(request);
        const body = await request.json();

        const {
            name,
            description,
            dueDate,
            dueTime,
            maxAttempts,
            isVisible,
            files
        } = body;

        if (!name?.trim()) {
            return NextResponse.json({ error: 'Submission name is required' }, { status: 400 });
        }

        // Update submission
        await pool.execute(`
      UPDATE subject_submissions SET
        name = ?,
        description = ?,
        due_date = ?,
        due_time = ?,
        max_attempts = ?,
        is_visible = ?
      WHERE id = ?
    `, [ // Fixed trailing space in SQL above (is_visible = ?)
            name.trim(),
            description || null,
            dueDate || null,
            dueTime || null,
            maxAttempts || 1,
            isVisible ? 1 : 0,
            submissionId
        ]);

        // Update files - delete existing and insert new
        if (files) {
            await pool.execute('DELETE FROM submission_files WHERE submission_id = ?', [submissionId]);

            for (const file of files) {
                await pool.execute(
                    'INSERT INTO submission_files (submission_id, file_name, file_type, file_url) VALUES (?, ?, ?, ?)',
                    [submissionId, file.name, file.type, file.url]
                );
            }
        }

        await logActivity(teacherId, 'update', `Updated submission: ${name}`);

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Update submission error:', error);
        return NextResponse.json({ error: 'Failed to update submission' }, { status: 500 }); // Fixed double space
    }
}

// DELETE - Delete submission
export async function DELETE(
    request: NextRequest,
    { params }: { params: { id: string; submissionId: string } } // Fixed double space
) {
    try {
        const pool = await getDb();
        const { submissionId } = await params;
        const teacherId = getAdminIdFromRequest(request);

        // Get submission name for logging
        const [submission] = await pool.execute<RowDataPacket[]>(
            'SELECT name FROM subject_submissions WHERE id = ?',
            [submissionId]
        );

        await pool.execute('DELETE FROM subject_submissions WHERE id = ?', [submissionId]);

        await logActivity(teacherId, 'delete', `Deleted submission: ${submission[0]?.name}`);

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Delete submission error:', error);
        return NextResponse.json({ error: 'Failed to delete submission' }, { status: 500 });
    }
}