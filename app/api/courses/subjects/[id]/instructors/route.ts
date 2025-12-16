import { NextRequest, NextResponse } from 'next/server';

async function getDB() {
    const { getCloudflareContext } = await import('@opennextjs/cloudflare');
    const ctx = await getCloudflareContext({ async: true });
    const db = (ctx.env as any)?.DB;
    if (!db) throw new Error('Database not configured');
    return { db, ctx };
}

// GET - Fetch instructors for a subject
export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { db } = await getDB();
        const { id } = await params;

        const result = await db
            .prepare(`
                SELECT
                    u.id,
                    u.username,
                    u.email,
                    p.first_name,
                    p.middle_name,
                    p.last_name,
                    p.department,
                    p.employee_id
                FROM subject_instructors si
                JOIN users u ON si.instructor_id = u.id
                LEFT JOIN profiles p ON u.id = p.user_id
                WHERE si.subject_id = ? AND u.role = 'teacher'
            `)
            .bind(id)
            .all();

        return NextResponse.json({ success: true, data: result.results });
    } catch (error: any) {
        console.error('Fetch subject instructors error:', error);
        return NextResponse.json({ error: 'Failed to fetch instructors: ' + error.message }, { status: 500 });
    }
}

// POST - Assign instructor to subject
export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { db, ctx } = await getDB();
        const { id } = await params;
        const { instructorId } = await request.json();

        // Get instructor name for logging
        const instructor = await db
            .prepare(`
                SELECT u.username, p.first_name, p.last_name 
                FROM users u 
                LEFT JOIN profiles p ON u.id = p.user_id 
                WHERE u.id = ? 
            `)
            .bind(instructorId)
            .first<{ username: string; first_name: string; last_name: string }>();

        // Get subject name for logging
        const subject = await db
            .prepare('SELECT name FROM subjects WHERE id = ?')
            .bind(id)
            .first<{ name: string }>();

        const instructorName = [instructor?.first_name, instructor?.last_name]
            .filter(Boolean).join(' ') || instructor?.username || 'Unknown';
        const subjectName = subject?.name || 'Unknown';

        // Check if already assigned
        const existing = await db
            .prepare('SELECT id FROM subject_instructors WHERE subject_id = ? AND instructor_id = ?')
            .bind(id, instructorId)
            .first();

        if (existing) {
            return NextResponse.json({ error: 'Instructor already assigned' }, { status: 400 });
        }

        await db
            .prepare('INSERT INTO subject_instructors (subject_id, instructor_id, assigned_at) VALUES (?, ?, datetime(\'now\'))')
            .bind(id, instructorId)
            .run();

        // Log activity (non-blocking)
        const logPromise = db
            .prepare('INSERT INTO activity_logs (user_id, action_type, description) VALUES (?, ?, ?)')
            .bind(null, 'create', `Assigned instructor ${instructorName} to ${subjectName}`)
            .run();

        if (ctx.ctx?.waitUntil) {
            ctx.ctx.waitUntil(logPromise);
        }

        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error('Assign instructor error:', error);

        // Check for unique constraint violation
        if (error.message?.includes('UNIQUE constraint failed')) {
            return NextResponse.json({ error: 'Instructor already assigned' }, { status: 400 });
        }

        return NextResponse.json({ error: 'Failed to assign instructor: ' + error.message }, { status: 500 });
    }
}

// DELETE - Remove instructor from subject
export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { db, ctx } = await getDB();
        const { id } = await params;
        const { searchParams } = new URL(request.url);
        const instructorId = searchParams.get('instructorId');

        if (!instructorId) {
            return NextResponse.json({ error: 'Instructor ID is required' }, { status: 400 });
        }

        // Get instructor name for logging
        const instructor = await db
            .prepare(`
                SELECT u.username, p.first_name, p.last_name 
                FROM users u 
                LEFT JOIN profiles p ON u.id = p.user_id 
                WHERE u.id = ?
            `)
            .bind(instructorId)
            .first<{ username: string; first_name: string; last_name: string }>();

        // Get subject name for logging
        const subject = await db
            .prepare('SELECT name FROM subjects WHERE id = ?')
            .bind(id)
            .first<{ name: string }>();

        const instructorName = [instructor?.first_name, instructor?.last_name]
            .filter(Boolean).join(' ') || instructor?.username || 'Unknown';
        const subjectName = subject?.name || 'Unknown';

        await db
            .prepare('DELETE FROM subject_instructors WHERE subject_id = ? AND instructor_id = ?')
            .bind(id, instructorId)
            .run();

        // Log activity (non-blocking)
        const logPromise = db
            .prepare('INSERT INTO activity_logs (user_id, action_type, description) VALUES (?, ?, ?)')
            .bind(null, 'delete', `Removed instructor ${instructorName} from ${subjectName}`)
            .run();

        if (ctx.ctx?.waitUntil) {
            ctx.ctx.waitUntil(logPromise);
        }

        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error('Remove instructor error:', error);
        return NextResponse.json({ error: 'Failed to remove instructor: ' + error.message }, { status: 500 });
    }
}