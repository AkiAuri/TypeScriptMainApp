import { NextRequest, NextResponse } from 'next/server';

async function getDB() {
    const { getCloudflareContext } = await import('@opennextjs/cloudflare');
    const ctx = await getCloudflareContext({ async: true });
    const db = (ctx.env as any)?.DB;
    if (!db) throw new Error('Database not configured');
    return { db, ctx };
}

// GET - Fetch single semester
export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { db } = await getDB();
        const { id } = await params;

        const semester = await db
            .prepare('SELECT id, name, school_year_id, created_at FROM semesters WHERE id = ?')
            .bind(id)
            .first();

        if (!semester) {
            return NextResponse.json({ error: 'Semester not found' }, { status: 404 });
        }

        return NextResponse.json({ success: true, data: semester });
    } catch (error: any) {
        console.error('Fetch semester error:', error);
        return NextResponse.json({ error: 'Failed to fetch semester: ' + error.message }, { status: 500 });
    }
}

// PUT - Update semester
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
            .prepare('SELECT name FROM semesters WHERE id = ?')
            .bind(id)
            .first<{ name: string }>();

        const oldName = oldData?.name;

        await db
            .prepare('UPDATE semesters SET name = ?, updated_at = datetime(\'now\') WHERE id = ?')
            .bind(name, id)
            .run();

        // Log activity (non-blocking)
        const logPromise = db
            .prepare('INSERT INTO activity_logs (user_id, action_type, description) VALUES (?, ?, ?)')
            .bind(null, 'update', `Updated semester: "${oldName}" to "${name}"`)
            .run();

        if (ctx.ctx?.waitUntil) {
            ctx.ctx.waitUntil(logPromise);
        }

        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error('Update semester error:', error);
        return NextResponse.json({ error: 'Failed to update semester: ' + error.message }, { status: 500 });
    }
}

// DELETE - Delete semester
export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { db, ctx } = await getDB();
        const { id } = await params;

        // Get semester info for logging
        const data = await db
            .prepare(`
                SELECT s.name, sy.year as school_year 
                FROM semesters s 
                LEFT JOIN school_years sy ON s.school_year_id = sy.id 
                WHERE s.id = ? 
            `)
            .bind(id)
            .first<{ name: string; school_year: string }>();

        const semesterName = data?.name;
        const schoolYear = data?.school_year;

        await db
            .prepare('DELETE FROM semesters WHERE id = ?')
            .bind(id)
            .run();

        // Log activity (non-blocking)
        const logPromise = db
            .prepare('INSERT INTO activity_logs (user_id, action_type, description) VALUES (?, ?, ?)')
            .bind(null, 'delete', `Deleted semester: ${semesterName}${schoolYear ? ` from ${schoolYear}` : ''}`)
            .run();

        if (ctx.ctx?.waitUntil) {
            ctx.ctx.waitUntil(logPromise);
        }

        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error('Delete semester error:', error);
        return NextResponse.json({ error: 'Failed to delete semester: ' + error.message }, { status: 500 });
    }
}