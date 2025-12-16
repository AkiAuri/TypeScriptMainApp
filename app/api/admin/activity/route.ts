import { NextRequest, NextResponse } from 'next/server';

async function getDB() {
    const { getCloudflareContext } = await import('@opennextjs/cloudflare');
    const ctx = await getCloudflareContext({ async: true });
    const db = (ctx.env as any)?.DB;
    if (!db) throw new Error('Database not configured');
    return { db, ctx };
}

export async function POST(request: NextRequest) {
    try {
        const { db } = await getDB();
        const { userId, actionType, description } = await request.json();

        await db
            .prepare('INSERT INTO activity_logs (user_id, action_type, description) VALUES (?, ?, ?)')
            .bind(userId || null, actionType, description)
            .run();

        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error('Activity log error:', error);
        return NextResponse.json(
            { error: 'Failed to log activity: ' + error.message },
            { status: 500 }
        );
    }
}