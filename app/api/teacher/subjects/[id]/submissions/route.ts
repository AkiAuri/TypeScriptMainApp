import { NextRequest, NextResponse } from 'next/server';
import { getDb } from "@/lib/db";
import { RowDataPacket, ResultSetHeader } from 'mysql2';
import { logActivity, getAdminIdFromRequest } from '@/lib/activity-logger';

// GET - Fetch all submissions for a subject
export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const pool = await getDb();
        const subjectId = (await params).id;

        const [submissions] = await pool.execute<RowDataPacket[]>(`
            SELECT
                s.id,
                s.folder_id,
                s.name,
                s.description,
                s.due_date,
                s.due_time,
                s.max_attempts,
                s.is_visible,
                s.created_at,
                f.name as folder_name
            FROM subject_submissions s
                     LEFT JOIN subject_folders f ON s.folder_id = f.id
            WHERE s.subject_id = ?
            ORDER BY s.created_at DESC
        `, [subjectId]);

        return NextResponse.json({ success: true, submissions });
    } catch (error) {
        console.error('Fetch submissions error:', error);
        return NextResponse.json({ error: 'Failed to fetch submissions' }, { status: 500 });
    }
}

// POST - Create a new submission
export async function POST(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const pool = await getDb();
        const subjectId = params.id;
        const teacherId = getAdminIdFromRequest(request);
        const body = await request.json();

        const {
            folderId,
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

        if (!folderId) {
            return NextResponse.json({ error: 'Folder is required' }, { status: 400 });
        }

        // Insert submission
        const [result] = await pool.execute<ResultSetHeader>(`
            INSERT INTO subject_submissions
            (folder_id, subject_id, name, description, due_date, due_time, max_attempts, is_visible)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `, [
            folderId,
            subjectId,
            name.trim(),
            description || null,
            dueDate || null,
            dueTime || null,
            maxAttempts || 1,
            isVisible ? 1 : 0
        ]);

        const submissionId = result.insertId;

        // Insert files if any
        if (files && files.length > 0) {
            for (const file of files) {
                await pool.execute(
                    'INSERT INTO submission_files (submission_id, file_name, file_type, file_url) VALUES (?, ?, ?, ?)',
                    [submissionId, file.name, file.type, file.url]
                );
            }
        }

        await logActivity(teacherId, 'create', `Created submission: ${name}`);

        return NextResponse.json({
            success: true,
            submission: {
                id: submissionId,
                folderId,
                name: name.trim(),
                description,
                dueDate,
                dueTime,
                maxAttempts,
                isVisible,
                files: files || []
            }
        });
    } catch (error) {
        console.error('Create submission error:', error);
        return NextResponse.json({ error: 'Failed to create submission' }, { status: 500 });
    }
}