import { NextRequest, NextResponse } from 'next/server';

async function getDB() {
    const { getCloudflareContext } = await import('@opennextjs/cloudflare');
    const ctx = await getCloudflareContext({ async: true });
    const db = (ctx.env as any)?.DB;
    if (!db) throw new Error('Database not configured');
    return { db, ctx };
}

// GET - Fetch subjects by section
export async function GET(request: NextRequest) {
    try {
        const { db } = await getDB();
        const { searchParams } = new URL(request.url);
        const sectionId = searchParams.get('sectionId');

        if (!sectionId) {
            return NextResponse.json({ error: 'Section ID is required' }, { status: 400 });
        }

        const result = await db
            .prepare(`
                SELECT
                    sub.id,
                    sub.name,
                    sub.code,
                    sub.section_id,
                    sub.created_at,
                    COUNT(DISTINCT si.instructor_id) as instructor_count,
                    COUNT(DISTINCT ss.student_id) as student_count
                FROM subjects sub
                LEFT JOIN subject_instructors si ON sub.id = si.subject_id
                LEFT JOIN subject_students ss ON sub.id = ss.subject_id
                WHERE sub.section_id = ?
                GROUP BY sub.id, sub.name, sub.code, sub.section_id, sub.created_at
                ORDER BY sub.name ASC
            `)
            .bind(sectionId)
            .all();

        return NextResponse.json({ success: true, data: result.results });
    } catch (error: any) {
        console.error('Fetch subjects error:', error);
        return NextResponse.json({ error: 'Failed to fetch subjects: ' + error.message }, { status: 500 });
    }
}

// POST - Create new subject
export async function POST(request: NextRequest) {
    try {
        const { db, ctx } = await getDB();
        const { name, code, sectionId } = await request.json();

        if (!name || !sectionId) {
            return NextResponse.json({ error: 'Name and section ID are required' }, { status: 400 });
        }

        // Get section name for logging
        const section = await db
            .prepare('SELECT name FROM sections WHERE id = ?')
            .bind(sectionId)
            .first<{ name: string }>();

        const sectionName = section?.name || 'Unknown';

        const result = await db
            .prepare('INSERT INTO subjects (name, code, section_id, created_at) VALUES (?, ?, ?, datetime(\'now\'))')
            .bind(name, code || null, sectionId)
            .run();

        // Log activity (non-blocking)
        const logPromise = db
            .prepare('INSERT INTO activity_logs (user_id, action_type, description) VALUES (?, ?, ?)')
            .bind(null, 'create', `Created new subject: ${name}${code ? ` (${code})` : ''} in ${sectionName}`)
            .run();

        if (ctx.ctx?.waitUntil) {
            ctx.ctx.waitUntil(logPromise);
        }

        return NextResponse.json({
            success: true,
            data: { id: result.meta.last_row_id, name, code, section_id: sectionId },
        });
    } catch (error: any) {
        console.error('Create subject error:', error);
        return NextResponse.json({ error: 'Failed to create subject: ' + error.message }, { status: 500 });
    }
}