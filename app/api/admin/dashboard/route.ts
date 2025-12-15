import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import { RowDataPacket } from 'mysql2';

export async function GET() {
    try {
        // Get counts for stats
        const [schoolYearsCount] = await pool.execute<RowDataPacket[]>(
            'SELECT COUNT(*) as count FROM school_years'
        );
        const [sectionsCount] = await pool.execute<RowDataPacket[]>(
            'SELECT COUNT(*) as count FROM sections'
        );
        const [subjectsCount] = await pool.execute<RowDataPacket[]>(
            'SELECT COUNT(*) as count FROM subjects'
        );
        const [instructorsCount] = await pool.execute<RowDataPacket[]>(
            "SELECT COUNT(*) as count FROM users WHERE role = 'teacher'"
        );
        const [studentsCount] = await pool. execute<RowDataPacket[]>(
            "SELECT COUNT(*) as count FROM users WHERE role = 'student'"
        );

        // Get recent activities with user info
        const [activities] = await pool.execute<RowDataPacket[]>(`
            SELECT 
                al.id,
                al.action_type,
                al.description,
                al.created_at,
                u.username,
                COALESCE(
                    NULLIF(CONCAT_WS(' ', p.first_name, p.last_name), ''),
                    u.username,
                    'System'
                ) as full_name
            FROM activity_logs al
            LEFT JOIN users u ON al.user_id = u.id
            LEFT JOIN profiles p ON u.id = p.user_id
            ORDER BY al.created_at DESC
            LIMIT 10
        `);

        return NextResponse.json({
            success: true,
            data: {
                stats: {
                    schoolYears: schoolYearsCount[0]?.count || 0,
                    sections: sectionsCount[0]?.count || 0,
                    subjects: subjectsCount[0]?.count || 0,
                    instructors: instructorsCount[0]?.count || 0,
                    students:  studentsCount[0]?.count || 0,
                },
                activities: activities,
            },
        });
    } catch (error) {
        console.error('Dashboard error:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to fetch dashboard data' },
            { status: 500 }
        );
    }
}