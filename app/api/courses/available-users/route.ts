import { NextRequest, NextResponse } from 'next/server';

async function getDB() {
    const { getCloudflareContext } = await import('@opennextjs/cloudflare');
    const ctx = await getCloudflareContext({ async: true });
    const db = (ctx.env as any)?.DB;
    if (!db) throw new Error('Database not configured');
    return { db, ctx };
}

// GET - Fetch available instructors or students
export async function GET(request: NextRequest) {
    try {
        const { db } = await getDB();
        const { searchParams } = new URL(request.url);
        const role = searchParams.get('role'); // 'teacher' or 'student'

        if (!role || !['teacher', 'student'].includes(role)) {
            return NextResponse.json({ error: 'Valid role is required (teacher or student)' }, { status: 400 });
        }

        const result = await db
            .prepare(`
                SELECT 
                    u.id,
                    u.username,
                    u.email,
                    u.role,
                    p.first_name,
                    p.middle_name,
                    p.last_name,
                    p.department,
                    p.employee_id
                FROM users u
                LEFT JOIN profiles p ON u.id = p.user_id
                WHERE u.role = ?
                ORDER BY p.last_name, p.first_name, u.username
            `)
            .bind(role)
            .all();

        return NextResponse.json({ success: true, data: result.results });
    } catch (error: any) {
        console.error('Fetch available users error:', error);
        return NextResponse.json({ error: 'Failed to fetch users: ' + error.message }, { status: 500 });
    }
}