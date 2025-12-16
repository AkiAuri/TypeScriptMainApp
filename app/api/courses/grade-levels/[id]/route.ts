import { NextRequest, NextResponse } from 'next/server';

async function getDB() {
    const { getCloudflareContext } = await import('@opennextjs/cloudflare');
    const ctx = await getCloudflareContext({ async: true });
    const db = (ctx.env as any)?.DB;
    if (!db) throw new Error('Database not configured');
    return { db, ctx };
}

// GET - Fetch single grade level
export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { db } = await getDB();
        const { id } = await params;

        const gradeLevel = await db
            .prepare('SELECT id, name, semester_id, created_at FROM grade_levels WHERE id = ?')
            .bind(id)
            .first();

        if (!gradeLevel) {
            return NextResponse.json({ error: 'Grade level not found' }, { status: 404 });
        }

        return NextResponse.json({ success: true, data: gradeLevel });
    } catch (error: any) {
        console.error('Fetch grade level error:', error);
        return NextResponse.json({ error: 'Failed to fetch grade level: ' + error.message }, { status: 500 });
    }
}

// PUT - Update grade level
export async function PUT(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { db, ctx } = await getDB();
        const { name } = await request.json();
        const { id } = await params;

        // Get old name for logging
        const oldData = await db
            .prepare('SELECT name FROM grade_levels WHERE id = ?')
            .bind(id)
            .first<{ name: string }>();

        const oldName = oldData?.name;

        await db
            .prepare('UPDATE grade_levels SET name = ?, updated_at = datetime(\'now\') WHERE id = ?')
            .bind(name, id)
            .run();

        // Log activity (non-blocking)
        const logPromise = db
            .prepare('INSERT INTO activity_logs (user_id, action_type, description) VALUES (?, ?, ?)')
            .bind(null, 'update', `Updated grade level: "${oldName}" to "${name}"`)
            .run();

        if (ctx.ctx?.waitUntil) {
            ctx.ctx.waitUntil(logPromise);
        }

        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error('Update grade level error:', error);
        return NextResponse.json({ error: 'Failed to update grade level: ' + error.message }, { status: 500 });
    }
}

// DELETE - Delete grade level
export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { db, ctx } = await getDB();
        const { id } = await params;

        // Get name for logging
        const data = await db
            .prepare('SELECT name FROM grade_levels WHERE id = ?')
            .bind(id)
            .first<{ name: string }>();

        const name = data?.name;

        await db
            .prepare('DELETE FROM grade_levels WHERE id = ?')
            .bind(id)
            .run();

        // Log activity (non-blocking)
        const logPromise = db
            .prepare('INSERT INTO activity_logs (user_id, action_type, description) VALUES (?, ?, ?)')
            .bind(null, 'delete', `Deleted grade level: ${name}`)
            .run();

        if (ctx.ctx?.waitUntil) {
            ctx.ctx.waitUntil(logPromise);
        }

        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error('Delete grade level error:', error);
        return NextResponse.json({ error: 'Failed to delete grade level: ' + error.message }, { status: 500 });
    }
}