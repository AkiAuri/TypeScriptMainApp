import { NextRequest, NextResponse } from 'next/server';

async function getDB() {
    const { getCloudflareContext } = await import('@opennextjs/cloudflare');
    const ctx = await getCloudflareContext({ async: true });
    const db = (ctx.env as any)?.DB;
    if (!db) throw new Error('Database not configured');
    return { db, ctx };
}

// GET - Fetch students for a subject
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
                    p.employee_id as student_number
                FROM subject_students ss
                JOIN users u ON ss.student_id = u.id
                LEFT JOIN profiles p ON u.id = p.user_id
                WHERE ss.subject_id = ? AND u.role = 'student'
            `)
            .bind(id)
            .all();

        return NextResponse.json({ success: true, data: result.results });
    } catch (error: any) {
        console.error('Fetch subject students error:', error);
        return NextResponse.json({ error: 'Failed to fetch students: ' + error.message }, { status: 500 });
    }
}

// POST - Assign student to subject
export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { db, ctx } = await getDB();
        const { id } = await params;
        const { studentId } = await request.json();

        // Get student name for logging
        const student = await db
            .prepare(`
                SELECT u.username, p.first_name, p.last_name 
                FROM users u 
                LEFT JOIN profiles p ON u.id = p.user_id 
                WHERE u.id = ? 
            `)
            .bind(studentId)
            .first<{ username: string; first_name: string; last_name: string }>();

        // Get subject name for logging
        const subject = await db
            .prepare('SELECT name FROM subjects WHERE id = ?')
            .bind(id)
            .first<{ name: string }>();

        const studentName = [student?.first_name, student?.last_name]
            .filter(Boolean).join(' ') || student?.username || 'Unknown';
        const subjectName = subject?.name || 'Unknown';

        // Check if already assigned
        const existing = await db
            .prepare('SELECT id FROM subject_students WHERE subject_id = ? AND student_id = ?')
            .bind(id, studentId)
            .first();

        if (existing) {
            return NextResponse.json({ error: 'Student already enrolled' }, { status: 400 });
        }

        await db
            .prepare('INSERT INTO subject_students (subject_id, student_id, enrolled_at) VALUES (?, ?, datetime(\'now\'))')
            .bind(id, studentId)
            .run();

        // Log activity (non-blocking)
        const logPromise = db
            .prepare('INSERT INTO activity_logs (user_id, action_type, description) VALUES (?, ?, ?)')
            .bind(null, 'create', `Enrolled student ${studentName} in ${subjectName}`)
            .run();

        if (ctx.ctx?.waitUntil) {
            ctx.ctx.waitUntil(logPromise);
        }

        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error('Assign student error:', error);

        // Check for unique constraint violation
        if (error.message?.includes('UNIQUE constraint failed')) {
            return NextResponse.json({ error: 'Student already enrolled' }, { status: 400 });
        }

        return NextResponse.json({ error: 'Failed to assign student: ' + error.message }, { status: 500 });
    }
}

// DELETE - Remove student from subject
export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { db, ctx } = await getDB();
        const { id } = await params;
        const { searchParams } = new URL(request.url);
        const studentId = searchParams.get('studentId');

        if (!studentId) {
            return NextResponse.json({ error: 'Student ID is required' }, { status: 400 });
        }

        // Get student name for logging
        const student = await db
            .prepare(`
                SELECT u.username, p.first_name, p.last_name 
                FROM users u 
                LEFT JOIN profiles p ON u.id = p.user_id 
                WHERE u.id = ?
            `)
            .bind(studentId)
            .first<{ username: string; first_name: string; last_name: string }>();

        // Get subject name for logging
        const subject = await db
            .prepare('SELECT name FROM subjects WHERE id = ?')
            .bind(id)
            .first<{ name: string }>();

        const studentName = [student?.first_name, student?.last_name]
            .filter(Boolean).join(' ') || student?.username || 'Unknown';
        const subjectName = subject?.name || 'Unknown';

        await db
            .prepare('DELETE FROM subject_students WHERE subject_id = ? AND student_id = ?')
            .bind(id, studentId)
            .run();

        // Log activity (non-blocking)
        const logPromise = db
            .prepare('INSERT INTO activity_logs (user_id, action_type, description) VALUES (?, ?, ?)')
            .bind(null, 'delete', `Removed student ${studentName} from ${subjectName}`)
            .run();

        if (ctx.ctx?.waitUntil) {
            ctx.ctx.waitUntil(logPromise);
        }

        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error('Remove student error:', error);
        return NextResponse.json({ error: 'Failed to remove student: ' + error.message }, { status: 500 });
    }
}