import { NextRequest, NextResponse } from 'next/server';

async function getDB() {
    const { getCloudflareContext } = await import('@opennextjs/cloudflare');
    const ctx = await getCloudflareContext({ async: true });
    const db = (ctx.env as any)?.DB;
    if (!db) throw new Error('Database not configured');
    return { db, ctx };
}

// GET - Fetch single subject with details
export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { db } = await getDB();
        const { id } = await params;

        const subject = await db
            .prepare(`
                SELECT 
                    s.*,
                    sec.name as section_name,
                    gl.name as grade_level_name,
                    sem.name as semester_name,
                    sy.year as school_year
                FROM subjects s
                JOIN sections sec ON s.section_id = sec.id
                JOIN grade_levels gl ON sec.grade_level_id = gl.id
                JOIN semesters sem ON gl.semester_id = sem.id
                JOIN school_years sy ON sem.school_year_id = sy.id
                WHERE s.id = ?
            `)
            .bind(id)
            .first();

        if (!subject) {
            return NextResponse.json({ error: 'Subject not found' }, { status: 404 });
        }

        // Get instructors
        const instructorsResult = await db
            .prepare(`
                SELECT u.id, u.username, u.email, p.first_name, p.last_name
                FROM subject_instructors si
                JOIN users u ON si.instructor_id = u.id
                LEFT JOIN profiles p ON u.id = p.user_id
                WHERE si.subject_id = ?
            `)
            .bind(id)
            .all();

        // Get student count
        const studentCount = await db
            .prepare('SELECT COUNT(*) as count FROM subject_students WHERE subject_id = ?')
            .bind(id)
            .first<{ count: number }>();

        return NextResponse.json({
            success: true,
            subject: {
                ...subject,
                instructors: instructorsResult.results,
                studentCount: studentCount?.count || 0
            }
        });
    } catch (error: any) {
        console.error('Fetch subject error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

// PUT - Update subject
export async function PUT(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { db } = await getDB();
        const { id } = await params;
        const body = await request.json();
        const { name, code, description, section_id, is_active } = body;

        // Check if updating is_active status only
        if (is_active !== undefined && name === undefined && section_id === undefined) {
            await db
                .prepare('UPDATE subjects SET is_active = ?, updated_at = datetime(\'now\') WHERE id = ?')
                .bind(is_active ? 1 : 0, id)
                .run();

            return NextResponse.json({ success: true, message: 'Status updated' });
        }

        if (!name?.trim()) {
            return NextResponse.json({ error: 'Subject name is required' }, { status: 400 });
        }

        if (!section_id) {
            return NextResponse.json({ error: 'Section is required' }, { status: 400 });
        }

        await db
            .prepare(`
                UPDATE subjects 
                SET name = ?, code = ?, description = ?, section_id = ?, is_active = ?, updated_at = datetime('now') 
                WHERE id = ? 
            `)
            .bind(
                name.trim(),
                code?.trim() || null,
                description?.trim() || null,
                section_id,
                is_active !== undefined ? (is_active ? 1 : 0) : 1,
                id
            )
            .run();

        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error('Update subject error:', error);
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
            .prepare('SELECT is_active FROM subjects WHERE id = ?')
            .bind(id)
            .first<{ is_active: number }>();

        if (!current) {
            return NextResponse.json({ error: 'Subject not found' }, { status: 404 });
        }

        const newStatus = current.is_active ? 0 : 1;

        await db
            .prepare('UPDATE subjects SET is_active = ?, updated_at = datetime(\'now\') WHERE id = ?')
            .bind(newStatus, id)
            .run();

        return NextResponse.json({
            success: true,
            is_active: newStatus === 1,
            message: newStatus === 1 ? 'Subject activated' : 'Subject deactivated'
        });
    } catch (error: any) {
        console.error('Toggle subject status error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

// DELETE - Delete subject
export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { db } = await getDB();
        const { id } = await params;

        // Dependency check
        const hasSubmissions = await db
            .prepare('SELECT id FROM subject_submissions WHERE subject_id = ? LIMIT 1')
            .bind(id)
            .first();

        const hasAttendance = await db
            .prepare('SELECT id FROM attendance_sessions WHERE subject_id = ? LIMIT 1')
            .bind(id)
            .first();

        if (hasSubmissions || hasAttendance) {
            return NextResponse.json({
                error: 'Cannot delete subject with existing submissions or attendance records. Deactivate instead.'
            }, { status: 400 });
        }

        // Transaction-like cleanup of join tables
        await db.prepare('DELETE FROM subject_instructors WHERE subject_id = ?').bind(id).run();
        await db.prepare('DELETE FROM subject_students WHERE subject_id = ?').bind(id).run();
        await db.prepare('DELETE FROM subjects WHERE id = ?').bind(id).run();

        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error('Delete subject error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}