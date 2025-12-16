import { NextRequest, NextResponse } from 'next/server';

async function getDB() {
    const { getCloudflareContext } = await import('@opennextjs/cloudflare');
    const ctx = await getCloudflareContext({ async: true });
    const db = (ctx.env as any)?.DB;
    if (!db) throw new Error('Database not configured');
    return { db, ctx };
}

// GET - Fetch all school years with counts
export async function GET() {
    try {
        const { db } = await getDB();

        const result = await db
            .prepare(`
                SELECT 
                    sy.id,
                    sy.year,
                    sy.is_active,
                    sy.created_at,
                    COUNT(DISTINCT s.id) as semester_count
                FROM school_years sy
                LEFT JOIN semesters s ON sy.id = s.school_year_id
                GROUP BY sy.id, sy.year, sy.is_active, sy.created_at
                ORDER BY sy.year DESC
            `)
            .all();

        return NextResponse.json({ success: true, data: result.results });
    } catch (error: any) {
        console.error('Fetch school years error:', error);
        return NextResponse.json({ error: 'Failed to fetch school years: ' + error.message }, { status: 500 });
    }
}

// POST - Create new school year
export async function POST(request: NextRequest) {
    try {
        const { db, ctx } = await getDB();
        const { year } = await request.json();

        if (!year) {
            return NextResponse.json({ error: 'Year is required' }, { status: 400 });
        }

        const result = await db
            .prepare('INSERT INTO school_years (year, start_date, end_date, created_at) VALUES (?, ?, ?, datetime(\'now\'))')
            .bind(year, '', '')
            .run();

        // Log activity (non-blocking)
        const logPromise = db
            .prepare('INSERT INTO activity_logs (user_id, action_type, description) VALUES (?, ?, ?)')
            .bind(null, 'create', `Created new school year: ${year}`)
            .run();

        if (ctx.ctx?.waitUntil) {
            ctx.ctx.waitUntil(logPromise);
        }

        return NextResponse.json({
            success: true,
            data: { id: result.meta.last_row_id, year },
        });
    } catch (error: any) {
        console.error('Create school year error:', error);
        return NextResponse.json({ error: 'Failed to create school year: ' + error.message }, { status: 500 });
    }
}