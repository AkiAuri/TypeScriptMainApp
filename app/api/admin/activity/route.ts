import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';

export async function POST(request: NextRequest) {
    try {
        const { userId, actionType, description } = await request.json();

        await pool.execute(
            'INSERT INTO activity_logs (user_id, action_type, description) VALUES (?, ?, ?)',
            [userId || null, actionType, description]
        );

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Activity log error:', error);
        return NextResponse.json(
            { error: 'Failed to log activity' },
            { status: 500 }
        );
    }
}