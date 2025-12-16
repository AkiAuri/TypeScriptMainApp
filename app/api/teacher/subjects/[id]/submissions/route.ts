import { NextRequest, NextResponse } from 'next/server';

async function getDB() {
    const { getCloudflareContext } = await import('@opennextjs/cloudflare');
    const ctx = await getCloudflareContext({ async: true });
    const db = (ctx.env as any)?.DB;
    if (!db) throw new Error('Database not configured');
    return { db, ctx };
}

// GET - Fetch all submissions for a subject
export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { db } = await getDB();
        const { id: subjectId } = await params;

        const submissionsResult = await db
            .prepare(`
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
            `)
            .bind(subjectId)
            .all();

        return NextResponse.json({ success: true, submissions: submissionsResult.results });
    } catch (error: any) {
        console.error('Fetch submissions error:', error);
        return NextResponse.json({ error: 'Failed to fetch submissions: ' + error.message }, { status: 500 });
    }
}

// POST - Create a new submission
export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { db, ctx } = await getDB();
        const { id: subjectId } = await params;
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
        const result = await db
            .prepare(`
                INSERT INTO subject_submissions
                (folder_id, subject_id, name, description, due_date, due_time, max_attempts, is_visible, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
            `)
            .bind(
                folderId,
                subjectId,
                name.trim(),
                description || null,
                dueDate || null,
                dueTime || null,
                maxAttempts || 1,
                isVisible ? 1 : 0
            )
            .run();

        const submissionId = result.meta.last_row_id;

        // Insert files if any
        if (files && files.length > 0) {
            for (const file of files) {
                await db
                    .prepare('INSERT INTO submission_files (submission_id, file_name, file_type, file_url) VALUES (?, ?, ?, ?)')
                    .bind(submissionId, file.name, file.type, file.url)
                    .run();
            }
        }

        // Log activity (non-blocking)
        const logPromise = db
            .prepare('INSERT INTO activity_logs (user_id, action_type, description) VALUES (?, ?, ?)')
            .bind(null, 'create', `Created submission: ${name}`)
            .run();

        if (ctx.ctx?.waitUntil) {
            ctx.ctx.waitUntil(logPromise);
        }

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
    } catch (error: any) {
        console.error('Create submission error:', error);
        return NextResponse.json({ error: 'Failed to create submission: ' + error.message }, { status: 500 });
    }
}