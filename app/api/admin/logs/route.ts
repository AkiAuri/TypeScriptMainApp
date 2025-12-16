import { NextRequest, NextResponse } from 'next/server';

async function getDB() {
    const { getCloudflareContext } = await import('@opennextjs/cloudflare');
    const ctx = await getCloudflareContext({ async: true });
    const db = (ctx.env as any)?.DB;
    if (!db) throw new Error('Database not configured');
    return { db, ctx };
}

export async function GET(request: NextRequest) {
    try {
        const { db } = await getDB();
        const { searchParams } = new URL(request.url);
        const limit = parseInt(searchParams.get('limit') || '50');
        const actionType = searchParams.get('action_type');

        let sql = `
            SELECT
                al.id,
                al.user_id,
                al.action_type,
                al.description,
                al.created_at,
                u.username,
                p.first_name,
                p.last_name
            FROM activity_logs al
                     LEFT JOIN users u ON al.user_id = u.id
                     LEFT JOIN profiles p ON u.id = p.user_id
        `;

        const params: any[] = [];

        if (actionType) {
            sql += ` WHERE al.action_type = ? `;
            params.push(actionType);
        }

        sql += ` ORDER BY al.created_at DESC LIMIT ?`;
        params.push(limit);

        const stmt = db.prepare(sql);
        const result = params.length > 0
            ? await stmt.bind(...params).all()
            : await stmt.all();

        const logs = result.results.map((row: any) => ({
            id: row.id,
            user_id: row.user_id,
            action_type: row.action_type,
            description: row.description,
            created_at: row.created_at,
            username: row.username,
            full_name: row.first_name && row.last_name
                ? `${row.first_name} ${row.last_name}`
                : row.username || 'System',
        }));

        return NextResponse.json(logs);
    } catch (error: any) {
        console.error('Error fetching activity logs:', error);
        return NextResponse.json(
            { error: 'Failed to fetch activity logs: ' + error.message },
            { status: 500 }
        );
    }
}

export async function POST(request: NextRequest) {
    try {
        const { db } = await getDB();
        const body = await request.json();
        const { user_id, action_type, description } = body;

        if (!action_type) {
            return NextResponse.json(
                { error: 'action_type is required' },
                { status: 400 }
            );
        }

        const result = await db
            .prepare('INSERT INTO activity_logs (user_id, action_type, description) VALUES (?, ?, ?)')
            .bind(user_id || null, action_type, description || null)
            .run();

        return NextResponse.json(
            { message: 'Activity logged successfully', id: result.meta.last_row_id },
            { status: 201 }
        );
    } catch (error: any) {
        console.error('Error creating activity log:', error);
        return NextResponse.json(
            { error: 'Failed to create activity log: ' + error.message },
            { status: 500 }
        );
    }
}