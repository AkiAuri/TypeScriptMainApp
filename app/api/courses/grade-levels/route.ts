import { NextRequest, NextResponse } from 'next/server';

async function getDB() {
    const { getCloudflareContext } = await import('@opennextjs/cloudflare');
    const ctx = await getCloudflareContext({ async: true });
    const db = (ctx.env as any)?.DB;
    if (!db) throw new Error('Database not configured');
    return { db, ctx };
}

// GET - Fetch grade levels by semester
export async function GET(request: NextRequest) {
    try {
        const { db } = await getDB();
        const { searchParams } = new URL(request.url);
        const semesterId = searchParams.get('semesterId');

        if (!semesterId) {
            return NextResponse.json({ error: 'Semester ID is required' }, { status: 400 });
        }

        const result = await db
            .prepare(`
                SELECT
                    gl.id,
                    gl.name,
                    gl.semester_id,
                    gl.created_at,
                    COUNT(DISTINCT sec.id) as section_count
                FROM grade_levels gl
                         LEFT JOIN sections sec ON gl.id = sec.grade_level_id
                WHERE gl.semester_id = ?
                GROUP BY gl.id, gl.name, gl.semester_id, gl.created_at
                ORDER BY gl.name ASC
            `)
            .bind(semesterId)
            .all();

        return NextResponse.json({ success: true, data: result.results });
    } catch (error: any) {
        console.error('Fetch grade levels error:', error);
        return NextResponse.json({ error: 'Failed to fetch grade levels: ' + error.message }, { status: 500 });
    }
}

// POST - Create new grade level
export async function POST(request: NextRequest) {
    try {
        const { db, ctx } = await getDB();
        const { name, semesterId } = await request.json();

        if (!name || !semesterId) {
            return NextResponse.json({ error: 'Name and semester ID are required' }, { status: 400 });
        }

        const result = await db
            .prepare('INSERT INTO grade_levels (name, semester_id, created_at, updated_at) VALUES (?, ?, datetime(\'now\'), datetime(\'now\'))')
            .bind(name, semesterId)
            .run();

        // Log activity (non-blocking)
        const logPromise = db
            .prepare('INSERT INTO activity_logs (user_id, action_type, description) VALUES (?, ?, ?)')
            .bind(null, 'create', `Created new grade level: ${name}`)
            .run();

        if (ctx.ctx?.waitUntil) {
            ctx.ctx.waitUntil(logPromise);
        }

        return NextResponse.json({
            success: true,
            data: { id: result.meta.last_row_id, name, semester_id: semesterId },
        });
    } catch (error: any) {
        console.error('Create grade level error:', error);
        return NextResponse.json({ error: 'Failed to create grade level: ' + error.message }, { status: 500 });
    }
}