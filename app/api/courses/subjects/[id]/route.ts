import { NextRequest, NextResponse } from 'next/server';

async function getDB() {
    const { getCloudflareContext } = await import('@opennextjs/cloudflare');
    const ctx = await getCloudflareContext({ async: true });
    const db = (ctx.env as any)?.DB;
    if (!db) throw new Error('Database not configured');
    return { db, ctx };
}

// GET - Fetch single subject
export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { db } = await getDB();
        const { id } = await params;

        const subject = await db
            .prepare('SELECT id, name, code, section_id, description, created_at FROM subjects WHERE id = ?')
            .bind(id)
            .first();

        if (!subject) {
            return NextResponse.json({ error: 'Subject not found' }, { status: 404 });
        }

        return NextResponse.json({ success: true, data: subject });
    } catch (error: any) {
        console.error('Fetch subject error:', error);
        return NextResponse.json({ error: 'Failed to fetch subject: ' + error.message }, { status: 500 });
    }
}

// PUT - Update subject
export async function PUT(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { db, ctx } = await getDB();
        const { name, code } = await request.json();
        const { id } = await params;

        // Get old data for logging
        const oldData = await db
            .prepare('SELECT name, code FROM subjects WHERE id = ?')
            .bind(id)
            .first<{ name: string; code: string }>();

        const oldName = oldData?.name;

        await db
            .prepare('UPDATE subjects SET name = ?, code = ? WHERE id = ?')
            .bind(name, code || null, id)
            .run();

        // Log activity (non-blocking)
        const logPromise = db
            .prepare('INSERT INTO activity_logs (user_id, action_type, description) VALUES (?, ?, ?)')
            .bind(null, 'update', `Updated subject: "${oldName}" to "${name}"${code ? ` (${code})` : ''}`)
            .run();

        if (ctx.ctx?.waitUntil) {
            ctx.ctx.waitUntil(logPromise);
        }

        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error('Update subject error:', error);
        return NextResponse.json({ error: 'Failed to update subject: ' + error.message }, { status: 500 });
    }
}

// DELETE - Delete subject
export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { db, ctx } = await getDB();
        const { id } = await params;

        // Get subject info for logging
        const data = await db
            .prepare('SELECT name, code FROM subjects WHERE id = ?')
            .bind(id)
            .first<{ name: string; code: string }>();

        const subjectName = data?.name;
        const subjectCode = data?.code;

        await db
            .prepare('DELETE FROM subjects WHERE id = ?')
            .bind(id)
            .run();

        // Log activity (non-blocking)
        const logPromise = db
            .prepare('INSERT INTO activity_logs (user_id, action_type, description) VALUES (?, ?, ?)')
            .bind(null, 'delete', `Deleted subject: ${subjectName}${subjectCode ? ` (${subjectCode})` : ''}`)
            .run();

        if (ctx.ctx?.waitUntil) {
            ctx.ctx.waitUntil(logPromise);
        }

        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error('Delete subject error:', error);
        return NextResponse.json({ error: 'Failed to delete subject: ' + error.message }, { status: 500 });
    }
}