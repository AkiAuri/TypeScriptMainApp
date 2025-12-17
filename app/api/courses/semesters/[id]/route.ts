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
            .prepare(`
                SELECT s.*, sy.year as school_year_name 
                FROM semesters s
                JOIN school_years sy ON s.school_year_id = sy.id
                WHERE s.id = ?
            `)
            .bind(id)
            .first();

        if (!semester) {
            return NextResponse.json({ error: 'Semester not found' }, { status: 404 });
        }

        return NextResponse.json({ success: true, semester });
    } catch (error: any) {
        console.error('Fetch semester error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

// PUT - Update semester
export async function PUT(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { db } = await getDB();
        const { id } = await params;
        const body = await request.json();
        const { name, school_year_id, is_active } = body;

        // Check if updating is_active status only
        if (is_active !== undefined && name === undefined && school_year_id === undefined) {
            await db
                .prepare('UPDATE semesters SET is_active = ?, updated_at = datetime(\'now\') WHERE id = ?')
                .bind(is_active ? 1 : 0, id)
                .run();

            return NextResponse.json({ success: true, message: 'Status updated' });
        }

        if (!name?.trim()) {
            return NextResponse.json({ error: 'Semester name is required' }, { status: 400 });
        }

        if (!school_year_id) {
            return NextResponse.json({ error: 'School year is required' }, { status: 400 });
        }

        // Check for duplicate semester name in the same school year (excluding current)
        const existing = await db
            .prepare('SELECT id FROM semesters WHERE name = ? AND school_year_id = ? AND id != ?')
            .bind(name.trim(), school_year_id, id)
            .first();

        if (existing) {
            return NextResponse.json({ error: 'Semester already exists for this school year' }, { status: 400 });
        }

        await db
            .prepare(`
                UPDATE semesters 
                SET name = ?, school_year_id = ?, is_active = ?, updated_at = datetime('now') 
                WHERE id = ? 
            `)
            .bind(name.trim(), school_year_id, is_active !== undefined ? (is_active ? 1 : 0) : 1, id)
            .run();

        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error('Update semester error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

// PATCH - Toggle active status
export async function PATCH(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { db } = await getDB();
        const { id } = await params;

        const current = await db
            .prepare('SELECT is_active FROM semesters WHERE id = ?')
            .bind(id)
            .first<{ is_active: number }>();

        if (!current) {
            return NextResponse.json({ error: 'Semester not found' }, { status: 404 });
        }

        const newStatus = current.is_active ? 0 : 1;

        await db
            .prepare('UPDATE semesters SET is_active = ?, updated_at = datetime(\'now\') WHERE id = ?')
            .bind(newStatus, id)
            .run();

        return NextResponse.json({
            success: true,
            is_active: newStatus === 1,
            message: newStatus === 1 ? 'Semester activated' : 'Semester deactivated'
        });
    } catch (error: any) {
        console.error('Toggle semester status error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

// DELETE - Delete semester
export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { db } = await getDB();
        const { id } = await params;

        // Dependency check: prevent deletion if child grade levels exist
        const hasGradeLevels = await db
            .prepare('SELECT id FROM grade_levels WHERE semester_id = ? LIMIT 1')
            .bind(id)
            .first();

        if (hasGradeLevels) {
            return NextResponse.json({
                error: 'Cannot delete semester with existing grade levels. Delete grade levels first or deactivate instead.'
            }, { status: 400 });
        }

        await db.prepare('DELETE FROM semesters WHERE id = ?').bind(id).run();

        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error('Delete semester error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}