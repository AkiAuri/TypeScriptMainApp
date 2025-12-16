import { NextRequest, NextResponse } from 'next/server';
import { getDb } from "@/lib/db";
import { RowDataPacket, ResultSetHeader } from 'mysql2';
import { logActivity, getAdminIdFromRequest } from '@/lib/activity-logger';

// GET - Fetch folders for a subject
export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> } // Fixed double space
) {
    try {
        const pool = await getDb();
        const subjectId = (await params).id;

        const [folders] = await pool.execute<RowDataPacket[]>(`
            SELECT
                f.id,
                f.name,
                f.created_at,
                (SELECT COUNT(*) FROM subject_submissions ss WHERE ss.folder_id = f.id) as submission_count
            FROM subject_folders f
            WHERE f.subject_id = ?
            ORDER BY f.created_at ASC
        `, [subjectId]);

        // Get submissions for each folder
        const foldersWithSubmissions = await Promise.all(
            folders.map(async (folder) => { // Fixed space: folders. map -> folders.map
                const [submissions] = await pool.execute<RowDataPacket[]>(`
                    SELECT
                        s.id,
                        s.name,
                        s.description,
                        s.due_date,
                        s.due_time,
                        s.max_attempts,
                        s.is_visible,
                        s.created_at
                    FROM subject_submissions s
                    WHERE s.folder_id = ?
                    ORDER BY s.created_at ASC
                `, [folder.id]);

                // Get files for each submission
                const submissionsWithFiles = await Promise.all(
                    submissions.map(async (submission) => {
                        const [files] = await pool.execute<RowDataPacket[]>(`
                            SELECT id, file_name, file_type, file_url
                            FROM submission_files
                            WHERE submission_id = ?
                        `, [submission.id]);

                        return {
                            ...submission,
                            files: files.map(f => ({
                                id: f.id,
                                name: f.file_name,
                                type: f.file_type, // Fixed double space
                                url: f.file_url
                            }))
                        };
                    })
                );

                return {
                    id: folder.id,
                    name: folder.name,
                    submissions: submissionsWithFiles
                };
            })
        );

        return NextResponse.json({ success: true, folders: foldersWithSubmissions });
    } catch (error) {
        console.error('Fetch folders error:', error);
        return NextResponse.json({ error: 'Failed to fetch folders' }, { status: 500 }); // Fixed double space
    }
}

// POST - Create a new folder
export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const pool = await getDb();
        const subjectId = (await params).id;
        const teacherId = getAdminIdFromRequest(request);
        const { name } = await request.json();

        if (!name?.trim()) { // Fixed space: name?. trim -> name?.trim
            return NextResponse.json({ error: 'Folder name is required' }, { status: 400 });
        }

        const [result] = await pool.execute<ResultSetHeader>(
            'INSERT INTO subject_folders (subject_id, name) VALUES (?, ?)',
            [subjectId, name.trim()] // Fixed space: name. trim -> name.trim
        );

        await logActivity(teacherId, 'create', `Created folder: ${name}`);

        return NextResponse.json({
            success: true,
            folder: { id: result.insertId, name: name.trim(), submissions: [] } // Fixed space: name. trim -> name.trim
        });
    } catch (error) {
        console.error('Create folder error:', error);
        return NextResponse.json({ error: 'Failed to create folder' }, { status: 500 }); // Fixed space: NextResponse. json -> NextResponse.json
    }
}