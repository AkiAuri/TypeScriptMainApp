import { NextRequest, NextResponse } from 'next/server';

async function getDB() {
    const { getCloudflareContext } = await import('@opennextjs/cloudflare');
    const ctx = await getCloudflareContext({ async: true });
    const db = (ctx.env as any)?.DB;
    if (!db) throw new Error('Database not configured');
    return { db, ctx };
}

// GET - Fetch sections by grade level
export async function GET(request: NextRequest) {
    try {
        const { db } = await getDB();
        const { searchParams } = new URL(request.url);
        const gradeLevelId = searchParams.get('gradeLevelId');

        if (!gradeLevelId) {
            return NextResponse.json({ error: 'Grade level ID is required' }, { status: 400 });
        }

        const result = await db
            .prepare(`
                SELECT
                    sec.id,
                    sec.name,
                    sec.grade_level_id,
                    sec.created_at,
                    COUNT(DISTINCT sub.id) as subject_count
                FROM sections sec
                LEFT JOIN subjects sub ON sec.id = sub.section_id
                WHERE sec.grade_level_id = ?
                GROUP BY sec.id, sec.name, sec.grade_level_id, sec.created_at
                ORDER BY sec.name ASC
            `)
            .bind(gradeLevelId)
            .all();

        return NextResponse.json({ success: true, data: result.results });
    } catch (error: any) {
        console.error('Fetch sections error:', error);
        return NextResponse.json({ error: 'Failed to fetch sections: ' + error.message }, { status: 500 });
    }
}

// POST - Create new section
export async function POST(request: NextRequest) {
    try {
        const { db, ctx } = await getDB();
        const { name, gradeLevelId } = await request.json();

        if (!name || !gradeLevelId) {
            return NextResponse.json({ error: 'Name and grade level ID are required' }, { status: 400 });
        }

        // Get grade level name for logging
        const gradeLevel = await db
            .prepare('SELECT name FROM grade_levels WHERE id = ?')
            .bind(gradeLevelId)
            .first<{ name: string }>();

        const gradeLevelName = gradeLevel?.name || 'Unknown';

        const result = await db
            .prepare('INSERT INTO sections (name, grade_level_id, created_at) VALUES (?, ?, datetime(\'now\'))')
            .bind(name, gradeLevelId)
            .run();

        // Log activity (non-blocking)
        const logPromise = db
            .prepare('INSERT INTO activity_logs (user_id, action_type, description) VALUES (?, ?, ?)')
            .bind(null, 'create', `Created new section: ${name} in ${gradeLevelName}`)
            .run();

        if (ctx.ctx?.waitUntil) {
            ctx.ctx.waitUntil(logPromise);
        }

        return NextResponse.json({
            success: true,
            data: { id: result.meta.last_row_id, name, grade_level_id: gradeLevelId },
        });
    } catch (error: any) {
        console.error('Create section error:', error);
        return NextResponse.json({ error: 'Failed to create section: ' + error.message }, { status: 500 });
    }
}