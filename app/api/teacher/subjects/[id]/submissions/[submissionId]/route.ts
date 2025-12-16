import { NextRequest, NextResponse } from 'next/server';

async function getDB() {
    const { getCloudflareContext } = await import('@opennextjs/cloudflare');
    const ctx = await getCloudflareContext({ async: true });
    const db = (ctx.env as any)?.DB;
    if (!db) throw new Error('Database not configured');
    return { db, ctx };
}

// GET - Fetch single submission
export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string; submissionId: string }> }
) {
    try {
        const { db } = await getDB();
        const { submissionId } = await params;

        const submission = await db
            .prepare(`
                SELECT 
                    id, folder_id, subject_id, name, description, 
                    due_date, due_time, max_attempts, is_visible, created_at
                FROM subject_submissions 
                WHERE id = ?
            `)
            .bind(submissionId)
            .first();

        if (!submission) {
            return NextResponse.json({ error: 'Submission not found' }, { status: 404 });
        }

        // Get files
        const filesResult = await db
            .prepare('SELECT id, file_name, file_type, file_url FROM submission_files WHERE submission_id = ?')
            .bind(submissionId)
            .all();

        return NextResponse.json({
            success: true,
            submission: {
                ...submission,
                files: filesResult.results.map((f: any) => ({
                    id: f.id,
                    name: f.file_name,
                    type: f.file_type,
                    url: f.file_url
                }))
            }
        });
    } catch (error: any) {
        console.error('Fetch submission error:', error);
        return NextResponse.json({ error: 'Failed to fetch submission: ' + error.message }, { status: 500 });
    }
}

// PUT - Update submission
export async function PUT(
    request: NextRequest,
    { params }: { params: Promise<{ id: string; submissionId: string }> }
) {
    try {
        const { db, ctx } = await getDB();
        const { submissionId } = await params;
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
        await db
            .prepare(`
                UPDATE subject_submissions SET
                    name = ?,
                    description = ?,
                    due_date = ?,
                    due_time = ?,
                    max_attempts = ?,
                    is_visible = ?,
                    updated_at = datetime('now')
                WHERE id = ?
            `)
            .bind(
                name.trim(),
                description || null,
                dueDate || null,
                dueTime || null,
                maxAttempts || 1,
                isVisible ? 1 : 0,
                submissionId
            )
            .run();

        // Update files - delete existing and insert new
        if (files) {
            await db
                .prepare('DELETE FROM submission_files WHERE submission_id = ?')
                .bind(submissionId)
                .run();

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
            .bind(null, 'update', `Updated submission: ${name}`)
            .run();

        if (ctx.ctx?.waitUntil) {
            ctx.ctx.waitUntil(logPromise);
        }

        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error('Update submission error:', error);
        return NextResponse.json({ error: 'Failed to update submission: ' + error.message }, { status: 500 });
    }
}

// DELETE - Delete submission
export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ id: string; submissionId: string }> }
) {
    try {
        const { db, ctx } = await getDB();
        const { submissionId } = await params;

        // Get submission name for logging
        const submission = await db
            .prepare('SELECT name FROM subject_submissions WHERE id = ?')
            .bind(submissionId)
            .first<{ name: string }>();

        await db
            .prepare('DELETE FROM subject_submissions WHERE id = ?')
            .bind(submissionId)
            .run();

        // Log activity (non-blocking)
        const logPromise = db
            .prepare('INSERT INTO activity_logs (user_id, action_type, description) VALUES (?, ?, ?)')
            .bind(null, 'delete', `Deleted submission: ${submission?.name}`)
            .run();

        if (ctx.ctx?.waitUntil) {
            ctx.ctx.waitUntil(logPromise);
        }

        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error('Delete submission error:', error);
        return NextResponse.json({ error: 'Failed to delete submission: ' + error.message }, { status: 500 });
    }
}