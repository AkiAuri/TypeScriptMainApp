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

        // Get total users count
        const usersCount = await db
            .prepare('SELECT COUNT(*) as total FROM users')
            .first<{ total: number }>();

        // Get user distribution by role
        const userDistributionResult = await db
            .prepare('SELECT role, COUNT(*) as count FROM users GROUP BY role')
            .all();

        // Get recent activity (last 7 days)
        // D1/SQLite uses different date functions than MySQL
        const activityDataResult = await db
            .prepare(`
                SELECT 
                    CASE CAST(strftime('%w', created_at) AS INTEGER)
                        WHEN 0 THEN 'Sunday'
                        WHEN 1 THEN 'Monday'
                        WHEN 2 THEN 'Tuesday'
                        WHEN 3 THEN 'Wednesday'
                        WHEN 4 THEN 'Thursday'
                        WHEN 5 THEN 'Friday'
                        WHEN 6 THEN 'Saturday'
                    END as day,
                    SUM(CASE WHEN action_type = 'login' THEN 1 ELSE 0 END) as logins,
                    SUM(CASE WHEN action_type = 'submission' THEN 1 ELSE 0 END) as submissions,
                    SUM(CASE WHEN action_type = 'upload' THEN 1 ELSE 0 END) as uploads
                FROM activity_logs
                WHERE created_at >= datetime('now', '-7 days')
                GROUP BY strftime('%w', created_at)
                ORDER BY CAST(strftime('%w', created_at) AS INTEGER)
            `)
            .all();

        return NextResponse.json({
            success: true,
            data: {
                totalUsers: usersCount?.total || 0,
                userDistribution: userDistributionResult.results,
                activityData: activityDataResult.results,
            },
        });
    } catch (error: any) {
        console.error('Stats error:', error);
        return NextResponse.json(
            { error: 'Failed to fetch stats: ' + error.message },
            { status: 500 }
        );
    }
}