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
            .prepare('SELECT id, name, semester_id, is_active, created_at FROM grade_levels WHERE id = ?')
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
        const body = await request.json();
        const { name, is_active } = body;
        const { id } = await params;

        // Check if updating is_active status only
        if (is_active !== undefined && name === undefined) {
            await db
                .prepare('UPDATE grade_levels SET is_active = ?, updated_at = datetime(\'now\') WHERE id = ?')
                .bind(is_active ? 1 : 0, id)
                .run();

            return NextResponse.json({ success: true, message: 'Status updated' });
        }

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

// PATCH - Toggle active status
export async function PATCH(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { db, ctx } = await getDB();
        const { id } = await params;

        // Get current status and name
        const current = await db
            .prepare('SELECT name, is_active FROM grade_levels WHERE id = ?')
            .bind(id)
            .first<{ name: string; is_active: number }>();

        if (!current) {
            return NextResponse.json({ error: 'Grade level not found' }, { status: 404 });
        }

        // Toggle the status
        const newStatus = current.is_active ? 0 : 1;

        await db
            .prepare('UPDATE grade_levels SET is_active = ?, updated_at = datetime(\'now\') WHERE id = ?')
            .bind(newStatus, id)
            .run();

        // Log activity (non-blocking)
        const statusText = newStatus === 1 ? 'activated' : 'deactivated';
        const logPromise = db
            .prepare('INSERT INTO activity_logs (user_id, action_type, description) VALUES (?, ?, ?)')
            .bind(null, 'update', `Grade level "${current.name}" ${statusText}`)
            .run();

        if (ctx.ctx?.waitUntil) {
            ctx.ctx.waitUntil(logPromise);
        }

        return NextResponse.json({
            success: true,
            is_active: newStatus === 1,
            message: newStatus === 1 ? 'Grade level activated' : 'Grade level deactivated'
        });
    } catch (error: any) {
        console.error('Toggle grade level status error:', error);
        return NextResponse.json({ error: 'Failed to toggle status: ' + error.message }, { status: 500 });
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

        // Check if grade level has sections
        const hasSections = await db
            .prepare('SELECT id FROM sections WHERE grade_level_id = ? LIMIT 1')
            .bind(id)
            .first();

        if (hasSections) {
            return NextResponse.json({
                error: 'Cannot delete grade level with existing sections. Delete sections first or deactivate instead.'
            }, { status: 400 });
        }

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