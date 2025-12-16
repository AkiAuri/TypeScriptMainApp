import { NextRequest, NextResponse } from 'next/server';

async function getDB() {
    const { getCloudflareContext } = await import('@opennextjs/cloudflare');
    const ctx = await getCloudflareContext({ async: true });
    const db = (ctx.env as any)?.DB;
    if (!db) throw new Error('Database not configured');
    return { db, ctx };
}

// GET - Fetch single folder
export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string; folderId: string }> }
) {
    try {
        const { db } = await getDB();
        const { folderId } = await params;

        const folder = await db
            .prepare('SELECT id, name, subject_id, created_at FROM subject_folders WHERE id = ?')
            .bind(folderId)
            .first();

        if (!folder) {
            return NextResponse.json({ error: 'Folder not found' }, { status: 404 });
        }

        return NextResponse.json({ success: true, folder });
    } catch (error: any) {
        console.error('Fetch folder error:', error);
        return NextResponse.json({ error: 'Failed to fetch folder: ' + error.message }, { status: 500 });
    }
}

// PUT - Update folder
export async function PUT(
    request: NextRequest,
    { params }: { params: Promise<{ id: string; folderId: string }> }
) {
    try {
        const { db, ctx } = await getDB();
        const { folderId } = await params;
        const { name } = await request.json();

        if (!name?.trim()) {
            return NextResponse.json({ error: 'Folder name is required' }, { status: 400 });
        }

        // Get old name for logging
        const oldData = await db
            .prepare('SELECT name FROM subject_folders WHERE id = ?')
            .bind(folderId)
            .first<{ name: string }>();

        await db
            .prepare('UPDATE subject_folders SET name = ?, updated_at = datetime(\'now\') WHERE id = ?')
            .bind(name.trim(), folderId)
            .run();

        // Log activity (non-blocking)
        const logPromise = db
            .prepare('INSERT INTO activity_logs (user_id, action_type, description) VALUES (?, ?, ?)')
            .bind(null, 'update', `Updated folder: "${oldData?.name}" to "${name.trim()}"`)
            .run();

        if (ctx.ctx?.waitUntil) {
            ctx.ctx.waitUntil(logPromise);
        }

        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error('Update folder error:', error);
        return NextResponse.json({ error: 'Failed to update folder: ' + error.message }, { status: 500 });
    }
}

// DELETE - Delete folder
export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ id: string; folderId: string }> }
) {
    try {
        const { db, ctx } = await getDB();
        const { folderId } = await params;

        // Get folder name for logging
        const folder = await db
            .prepare('SELECT name FROM subject_folders WHERE id = ?')
            .bind(folderId)
            .first<{ name: string }>();

        await db
            .prepare('DELETE FROM subject_folders WHERE id = ?')
            .bind(folderId)
            .run();

        // Log activity (non-blocking)
        const logPromise = db
            .prepare('INSERT INTO activity_logs (user_id, action_type, description) VALUES (?, ?, ?)')
            .bind(null, 'delete', `Deleted folder: ${folder?.name}`)
            .run();

        if (ctx.ctx?.waitUntil) {
            ctx.ctx.waitUntil(logPromise);
        }

        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error('Delete folder error:', error);
        return NextResponse.json({ error: 'Failed to delete folder: ' + error.message }, { status: 500 });
    }
}