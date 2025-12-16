import { NextResponse } from 'next/server';

async function getDB() {
    const { getCloudflareContext } = await import('@opennextjs/cloudflare');
    const ctx = await getCloudflareContext({ async: true });
    const db = (ctx.env as any)?.DB;
    if (!db) throw new Error('Database not configured');
    return { db, ctx };
}

export async function GET() {
    try {
        const { db } = await getDB();

        // Get counts for stats
        const schoolYearsCount = await db
            .prepare('SELECT COUNT(*) as count FROM school_years')
            .first<{ count: number }>();

        const sectionsCount = await db
            .prepare('SELECT COUNT(*) as count FROM sections')
            .first<{ count: number }>();

        const subjectsCount = await db
            .prepare('SELECT COUNT(*) as count FROM subjects')
            .first<{ count: number }>();

        const instructorsCount = await db
            .prepare("SELECT COUNT(*) as count FROM users WHERE role = 'teacher'")
            .first<{ count: number }>();

        const studentsCount = await db
            .prepare("SELECT COUNT(*) as count FROM users WHERE role = 'student'")
            .first<{ count: number }>();

        // Get recent activities with user info
        // Note: D1/SQLite uses COALESCE and || for string concatenation instead of CONCAT_WS
        const activitiesResult = await db
            .prepare(`
                SELECT 
                    al.id,
                    al.action_type,
                    al.description,
                    al.created_at,
                    u.username,
                    COALESCE(
                        NULLIF(TRIM(COALESCE(p.first_name, '') || ' ' || COALESCE(p.last_name, '')), ''),
                        u.username,
                        'System'
                    ) as full_name
                FROM activity_logs al
                LEFT JOIN users u ON al.user_id = u.id
                LEFT JOIN profiles p ON u.id = p.user_id
                ORDER BY al.created_at DESC
                LIMIT 10
            `)
            .all();

        return NextResponse.json({
            success: true,
            data: {
                stats: {
                    schoolYears: schoolYearsCount?.count || 0,
                    sections: sectionsCount?.count || 0,
                    subjects: subjectsCount?.count || 0,
                    instructors: instructorsCount?.count || 0,
                    students: studentsCount?.count || 0,
                },
                activities: activitiesResult.results,
            },
        });
    } catch (error: any) {
        console.error('Dashboard error:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to fetch dashboard data: ' + error.message },
            { status: 500 }
        );
    }
}