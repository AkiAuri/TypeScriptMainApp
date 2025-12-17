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
            .prepare('SELECT * FROM school_years WHERE id = ?')
            .bind(id)
            .first();

        if (!schoolYear) {
            return NextResponse.json({ error: 'School year not found' }, { status: 404 });
        }

        return NextResponse.json({ success: true, schoolYear });
    } catch (error: any) {
        console.error('Fetch school year error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

// PUT - Update school year
export async function PUT(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { db } = await getDB();
        const { id } = await params;
        const body = await request.json();
        const { year, is_active } = body;

        // Check if updating is_active status only
        if (is_active !== undefined && year === undefined) {
            await db
                .prepare('UPDATE school_years SET is_active = ?, updated_at = datetime(\'now\') WHERE id = ?')
                .bind(is_active ? 1 : 0, id)
                .run();

            return NextResponse.json({ success: true, message: 'Status updated' });
        }

        if (!year?.trim()) {
            return NextResponse.json({ error: 'School year is required' }, { status: 400 });
        }

        // Check for duplicate year (excluding current)
        const existing = await db
            .prepare('SELECT id FROM school_years WHERE year = ? AND id != ?')
            .bind(year.trim(), id)
            .first();

        if (existing) {
            return NextResponse.json({ error: 'School year already exists' }, { status: 400 });
        }

        await db
            .prepare('UPDATE school_years SET year = ?, is_active = ?, updated_at = datetime(\'now\') WHERE id = ?')
            .bind(year.trim(), is_active !== undefined ? (is_active ? 1 : 0) : 1, id)
            .run();

        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error('Update school year error:', error);
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
            .prepare('SELECT is_active FROM school_years WHERE id = ?')
            .bind(id)
            .first<{ is_active: number }>();

        if (!current) {
            return NextResponse.json({ error: 'School year not found' }, { status: 404 });
        }

        const newStatus = current.is_active ? 0 : 1;

        await db
            .prepare('UPDATE school_years SET is_active = ?, updated_at = datetime(\'now\') WHERE id = ?')
            .bind(newStatus, id)
            .run();

        return NextResponse.json({
            success: true,
            is_active: newStatus === 1,
            message: newStatus === 1 ? 'School year activated' : 'School year deactivated'
        });
    } catch (error: any) {
        console.error('Toggle school year status error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

// DELETE - Delete school year
export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { db } = await getDB();
        const { id } = await params;

        // Check for dependencies (Referential Integrity)
        const hasSemesters = await db
            .prepare('SELECT id FROM semesters WHERE school_year_id = ? LIMIT 1')
            .bind(id)
            .first();

        if (hasSemesters) {
            return NextResponse.json({
                error: 'Cannot delete school year with existing semesters. Delete semesters first or deactivate instead.'
            }, { status: 400 });
        }

        await db.prepare('DELETE FROM school_years WHERE id = ?').bind(id).run();

        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error('Delete school year error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}