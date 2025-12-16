import { NextRequest, NextResponse } from 'next/server';

async function getDB() {
    const { getCloudflareContext } = await import('@opennextjs/cloudflare');
    const ctx = await getCloudflareContext({ async: true });
    const db = (ctx.env as any)?.DB;
    if (!db) throw new Error('Database not configured');
    return { db, ctx };
}

// GET - Fetch single school year
export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { db } = await getDB();
        const { id } = await params;

        const schoolYear = await db
            .prepare('SELECT id, year, is_active, start_date, end_date, created_at FROM school_years WHERE id = ?')
            .bind(id)
            .first();

        if (!schoolYear) {
            return NextResponse.json({ error: 'School year not found' }, { status: 404 });
        }

        return NextResponse.json({ success: true, data: schoolYear });
    } catch (error: any) {
        console.error('Fetch school year error:', error);
        return NextResponse.json({ error: 'Failed to fetch school year: ' + error.message }, { status: 500 });
    }
}

// PUT - Update school year
export async function PUT(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { db, ctx } = await getDB();
        const { year, is_active } = await request.json();
        const { id } = await params;

        // Get old data for logging
        const oldData = await db
            .prepare('SELECT year, is_active FROM school_years WHERE id = ?')
            .bind(id)
            .first<{ year: string; is_active: number }>();

        const oldYear = oldData?.year;

        // If setting this year to active, deactivate all others first
        if (is_active === true || is_active === 1) {
            await db
                .prepare('UPDATE school_years SET is_active = 0 WHERE id != ?')
                .bind(id)
                .run();
        }

        // Update the target school year
        // We use COALESCE so we don't accidentally overwrite fields if they aren't provided in the body
        await db
            .prepare(`
                UPDATE school_years 
                SET year = COALESCE(?, year), 
                    is_active = COALESCE(?, is_active), 
                    updated_at = datetime('now') 
                WHERE id = ?
            `)
            .bind(year, is_active, id)
            .run();

        // Log activity (non-blocking)
        const activeStatusChange = (is_active === true || is_active === 1) ? ' (Set to Active)' : '';
        const logPromise = db
            .prepare('INSERT INTO activity_logs (user_id, action_type, description) VALUES (?, ?, ?)')
            .bind(null, 'update', `Updated school year: "${oldYear}" to "${year || oldYear}"${activeStatusChange}`)
            .run();

        if (ctx.ctx?.waitUntil) {
            ctx.ctx.waitUntil(logPromise);
        }

        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error('Update school year error:', error);
        return NextResponse.json({ error: 'Failed to update school year: ' + error.message }, { status: 500 });
    }
}

// DELETE - Delete school year
export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { db, ctx } = await getDB();
        const { id } = await params;

        // Get school year for logging
        const data = await db
            .prepare('SELECT year FROM school_years WHERE id = ?')
            .bind(id)
            .first<{ year: string }>();

        const year = data?.year;

        await db
            .prepare('DELETE FROM school_years WHERE id = ?')
            .bind(id)
            .run();

        // Log activity (non-blocking)
        const logPromise = db
            .prepare('INSERT INTO activity_logs (user_id, action_type, description) VALUES (?, ?, ?)')
            .bind(null, 'delete', `Deleted school year: ${year}`)
            .run();

        if (ctx.ctx?.waitUntil) {
            ctx.ctx.waitUntil(logPromise);
        }

        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error('Delete school year error:', error);
        return NextResponse.json({ error: 'Failed to delete school year: ' + error.message }, { status: 500 });
    }
}