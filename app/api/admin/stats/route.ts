import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import { RowDataPacket } from 'mysql2';

export async function GET() {
    try {
        // Get total users count
        const [usersCount] = await pool.execute<RowDataPacket[]>(
            'SELECT COUNT(*) as total FROM users'
        );

        // Get user distribution by role
        const [userDistribution] = await pool.execute<RowDataPacket[]>(
            'SELECT role, COUNT(*) as count FROM users GROUP BY role'
        );

        // Get recent activity (last 7 days)
        const [activityData] = await pool.execute<RowDataPacket[]>(`
      SELECT 
        DAYNAME(created_at) as day,
        SUM(CASE WHEN action_type = 'login' THEN 1 ELSE 0 END) as logins,
        SUM(CASE WHEN action_type = 'submission' THEN 1 ELSE 0 END) as submissions,
        SUM(CASE WHEN action_type = 'upload' THEN 1 ELSE 0 END) as uploads
      FROM activity_logs
      WHERE created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)
      GROUP BY DAYNAME(created_at), DAYOFWEEK(created_at)
      ORDER BY DAYOFWEEK(created_at)
    `);

        return NextResponse.json({
            success: true,
            data: {
                totalUsers: usersCount[0]?.total || 0,
                userDistribution:  userDistribution,
                activityData: activityData,
            },
        });
    } catch (error) {
        console.error('Stats error:', error);
        return NextResponse.json(
            { error: 'Failed to fetch stats' },
            { status: 500 }
        );
    }
}