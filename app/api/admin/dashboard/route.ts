import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import { RowDataPacket } from 'mysql2';

export async function GET() {
    try {
        // Get school years count
        const [schoolYears] = await pool.execute<RowDataPacket[]>(
            'SELECT COUNT(*) as count FROM school_years'
        );

        // Get sections count
        const [sections] = await pool.execute<RowDataPacket[]>(
            'SELECT COUNT(*) as count FROM sections'
        );

        // Get subjects count
        const [subjects] = await pool.execute<RowDataPacket[]>(
            'SELECT COUNT(*) as count FROM subjects'
        );

        // Get instructors count (teachers)
        const [instructors] = await pool.execute<RowDataPacket[]>(
            "SELECT COUNT(*) as count FROM users WHERE role = 'teacher'"
        );

        // Get students count
        const [students] = await pool.execute<RowDataPacket[]>(
            "SELECT COUNT(*) as count FROM users WHERE role = 'student'"
        );

        // Get recent activities
        const [activities] = await pool.execute<RowDataPacket[]>(
            `SELECT id, action_type, description, created_at 
       FROM activity_logs 
       ORDER BY created_at DESC 
       LIMIT 10`
        );

        return NextResponse.json({
            success: true,
            data: {
                stats: {
                    schoolYears:  schoolYears[0]?.count || 0,
                    sections: sections[0]?.count || 0,
                    subjects:  subjects[0]?.count || 0,
                    instructors: instructors[0]?.count || 0,
                    students: students[0]?.count || 0,
                },
                activities: activities,
            },
        });
    } catch (error) {
        console.error('Dashboard stats error:', error);
        return NextResponse.json(
            { error: 'Failed to fetch dashboard stats' },
            { status: 500 }
        );
    }
}