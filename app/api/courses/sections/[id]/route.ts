import { NextRequest, NextResponse } from 'next/server';

async function getDB() {
    const { getCloudflareContext } = await import('@opennextjs/cloudflare');
    const ctx = await getCloudflareContext({ async: true });
    const db = (ctx.env as any)?.DB;
    if (!db) throw new Error('Database not configured');
    return { db, ctx };
}

// GET - Fetch single section
export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { db } = await getDB();
        const { id } = await params;

        const section = await db
            .prepare('SELECT id, name, grade_level_id, school_year_id, created_at FROM sections WHERE id = ?')
            .bind(id)
            .first();

        if (!section) {
            return NextResponse.json({ error: 'Section not found' }, { status: 404 });
        }

        return NextResponse.json({ success: true, data: section });
    } catch (error: any) {
        console.error('Fetch section error:', error);
        return NextResponse.json({ error: 'Failed to fetch section: ' + error.message }, { status: 500 });
    }
}

// PUT - Update section
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
            .prepare('SELECT name FROM sections WHERE id = ?')
            .bind(id)
            .first<{ name: string }>();

        const oldName = oldData?.name;

        await db
            .prepare('UPDATE sections SET name = ? WHERE id = ?')
            .bind(name, id)
            .run();

        // Log activity (non-blocking)
        const logPromise = db
            .prepare('INSERT INTO activity_logs (user_id, action_type, description) VALUES (?, ?, ?)')
            .bind(null, 'update', `Updated section: "${oldName}" to "${name}"`)
            .run();

        if (ctx.ctx?.waitUntil) {
            ctx.ctx.waitUntil(logPromise);
        }

        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error('Update section error:', error);
        return NextResponse.json({ error: 'Failed to update section: ' + error.message }, { status: 500 });
    }
}

// DELETE - Delete section
export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { db, ctx } = await getDB();
        const { id } = await params;

        // Get section info for logging
        const data = await db
            .prepare(`
                SELECT s.name, gl.name as grade_level_name 
                FROM sections s 
                LEFT JOIN grade_levels gl ON s.grade_level_id = gl.id 
                WHERE s.id = ? 
            `)
            .bind(id)
            .first<{ name: string; grade_level_name: string }>();

        const sectionName = data?.name;
        const gradeLevelName = data?.grade_level_name;

        await db
            .prepare('DELETE FROM sections WHERE id = ?')
            .bind(id)
            .run();

        // Log activity (non-blocking)
        const logPromise = db
            .prepare('INSERT INTO activity_logs (user_id, action_type, description) VALUES (?, ?, ?)')
            .bind(null, 'delete', `Deleted section: ${sectionName}${gradeLevelName ? ` from ${gradeLevelName}` : ''}`)
            .run();

        if (ctx.ctx?.waitUntil) {
            ctx.ctx.waitUntil(logPromise);
        }

        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error('Delete section error:', error);
        return NextResponse.json({ error: 'Failed to delete section: ' + error.message }, { status: 500 });
    }
}