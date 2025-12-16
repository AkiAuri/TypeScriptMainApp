import { NextRequest, NextResponse } from 'next/server';

async function getDB() {
    const { getCloudflareContext } = await import('@opennextjs/cloudflare');
    const ctx = await getCloudflareContext({ async: true });
    const db = (ctx.env as any)?.DB;
    if (!db) throw new Error('Database not configured');
    return { db, ctx };
}

// GET - Fetch folders for a subject
export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { db } = await getDB();
        const { id: subjectId } = await params;

        const foldersResult = await db
            .prepare(`
                SELECT
                    f.id,
                    f.name,
                    f.created_at,
                    (SELECT COUNT(*) FROM subject_submissions ss WHERE ss.folder_id = f.id) as submission_count
                FROM subject_folders f
                WHERE f.subject_id = ?
                ORDER BY f.created_at ASC
            `)
            .bind(subjectId)
            .all();

        // Get submissions for each folder
        const foldersWithSubmissions = await Promise.all(
            foldersResult.results.map(async (folder: any) => {
                const submissionsResult = await db
                    .prepare(`
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
                    `)
                    .bind(folder.id)
                    .all();

                // Get files for each submission
                const submissionsWithFiles = await Promise.all(
                    submissionsResult.results.map(async (submission: any) => {
                        const filesResult = await db
                            .prepare(`
                                SELECT id, file_name, file_type, file_url
                                FROM submission_files
                                WHERE submission_id = ?
                            `)
                            .bind(submission.id)
                            .all();

                        return {
                            ...submission,
                            files: filesResult.results.map((f: any) => ({
                                id: f.id,
                                name: f.file_name,
                                type: f.file_type,
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
    } catch (error: any) {
        console.error('Fetch folders error:', error);
        return NextResponse.json({ error: 'Failed to fetch folders: ' + error.message }, { status: 500 });
    }
}

// POST - Create a new folder
export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { db, ctx } = await getDB();
        const { id: subjectId } = await params;
        const { name } = await request.json();

        if (!name?.trim()) {
            return NextResponse.json({ error: 'Folder name is required' }, { status: 400 });
        }

        const result = await db
            .prepare('INSERT INTO subject_folders (subject_id, name, created_at) VALUES (?, ?, datetime(\'now\'))')
            .bind(subjectId, name.trim())
            .run();

        // Log activity (non-blocking)
        const logPromise = db
            .prepare('INSERT INTO activity_logs (user_id, action_type, description) VALUES (?, ?, ?)')
            .bind(null, 'create', `Created folder: ${name}`)
            .run();

        if (ctx.ctx?.waitUntil) {
            ctx.ctx.waitUntil(logPromise);
        }

        return NextResponse.json({
            success: true,
            folder: { id: result.meta.last_row_id, name: name.trim(), submissions: [] }
        });
    } catch (error: any) {
        console.error('Create folder error:', error);
        return NextResponse.json({ error: 'Failed to create folder: ' + error.message }, { status: 500 });
    }
}