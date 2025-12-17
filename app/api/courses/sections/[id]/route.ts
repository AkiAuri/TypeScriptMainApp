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
            .prepare('SELECT id, name, grade_level_id, is_active, created_at FROM sections WHERE id = ?')
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
        const body = await request.json();
        const { name, is_active } = body;
        const { id } = await params;

        // Update is_active status if only that is provided
        if (is_active !== undefined && name === undefined) {
            await db
                .prepare('UPDATE sections SET is_active = ?, updated_at = datetime(\'now\') WHERE id = ?')
                .bind(is_active ? 1 : 0, id)
                .run();

            return NextResponse.json({ success: true, message: 'Status updated' });
        }

        // Fetch old name for activity log
        const oldData = await db
            .prepare('SELECT name FROM sections WHERE id = ?')
            .bind(id)
            .first<{ name: string }>();

        const oldName = oldData?.name;

        await db
            .prepare('UPDATE sections SET name = ?, updated_at = datetime(\'now\') WHERE id = ?')
            .bind(name, id)
            .run();

        // Non-blocking log
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

// PATCH - Toggle active status
export async function PATCH(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { db, ctx } = await getDB();
        const { id } = await params;

        const current = await db
            .prepare('SELECT name, is_active FROM sections WHERE id = ?')
            .bind(id)
            .first<{ name: string; is_active: number }>();

        if (!current) {
            return NextResponse.json({ error: 'Section not found' }, { status: 404 });
        }

        const newStatus = current.is_active ? 0 : 1;

        await db
            .prepare('UPDATE sections SET is_active = ?, updated_at = datetime(\'now\') WHERE id = ?')
            .bind(newStatus, id)
            .run();

        const statusText = newStatus === 1 ? 'activated' : 'deactivated';
        const logPromise = db
            .prepare('INSERT INTO activity_logs (user_id, action_type, description) VALUES (?, ?, ?)')
            .bind(null, 'update', `Section "${current.name}" ${statusText}`)
            .run();

        if (ctx.ctx?.waitUntil) {
            ctx.ctx.waitUntil(logPromise);
        }

        return NextResponse.json({
            success: true,
            is_active: newStatus === 1,
            message: newStatus === 1 ? 'Section activated' : 'Section deactivated'
        });
    } catch (error: any) {
        console.error('Toggle section status error:', error);
        return NextResponse.json({ error: 'Failed to toggle status: ' + error.message }, { status: 500 });
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

        // Check for child dependencies (Subjects)
        const hasSubjects = await db
            .prepare('SELECT id FROM subjects WHERE section_id = ? LIMIT 1')
            .bind(id)
            .first();

        if (hasSubjects) {
            return NextResponse.json({
                error: 'Cannot delete section with existing subjects. Delete subjects first or deactivate instead.'
            }, { status: 400 });
        }

        // Enhanced query to get hierarchical context for the log
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