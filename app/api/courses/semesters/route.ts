import { NextRequest, NextResponse } from 'next/server';

async function getDB() {
    const { getCloudflareContext } = await import('@opennextjs/cloudflare');
    const ctx = await getCloudflareContext({ async: true });
    const db = (ctx.env as any)?.DB;
    if (!db) throw new Error('Database not configured');
    return { db, ctx };
}

// GET - Fetch semesters by school year
export async function GET(request: NextRequest) {
    try {
        const { db } = await getDB();
        const { searchParams } = new URL(request.url);
        const schoolYearId = searchParams.get('schoolYearId');

        if (!schoolYearId) {
            return NextResponse.json({ error: 'School year ID is required' }, { status: 400 });
        }

        const result = await db
            .prepare(`
                SELECT
                    s.id,
                    s.name,
                    s.school_year_id,
                    s.created_at,
                    COUNT(DISTINCT gl.id) as grade_level_count
                FROM semesters s
                LEFT JOIN grade_levels gl ON s.id = gl.semester_id
                WHERE s.school_year_id = ?
                GROUP BY s.id, s.name, s.school_year_id, s.created_at
                ORDER BY s.created_at ASC
            `)
            .bind(schoolYearId)
            .all();

        return NextResponse.json({ success: true, data: result.results });
    } catch (error: any) {
        console.error('Fetch semesters error:', error);
        return NextResponse.json({ error: 'Failed to fetch semesters: ' + error.message }, { status: 500 });
    }
}

// POST - Create new semester
export async function POST(request: NextRequest) {
    try {
        const { db, ctx } = await getDB();
        const { name, schoolYearId } = await request.json();

        if (!name || !schoolYearId) {
            return NextResponse.json({ error: 'Name and school year ID are required' }, { status: 400 });
        }

        const result = await db
            .prepare('INSERT INTO semesters (name, school_year_id, created_at, updated_at) VALUES (?, ?, datetime(\'now\'), datetime(\'now\'))')
            .bind(name, schoolYearId)
            .run();

        // Log activity (non-blocking)
        const logPromise = db
            .prepare('INSERT INTO activity_logs (user_id, action_type, description) VALUES (?, ?, ?)')
            .bind(null, 'create', `Created new semester: ${name}`)
            .run();

        if (ctx.ctx?.waitUntil) {
            ctx.ctx.waitUntil(logPromise);
        }

        return NextResponse.json({
            success: true,
            data: { id: result.meta.last_row_id, name, school_year_id: schoolYearId },
        });
    } catch (error: any) {
        console.error('Create semester error:', error);
        return NextResponse.json({ error: 'Failed to create semester: ' + error.message }, { status: 500 });
    }
}