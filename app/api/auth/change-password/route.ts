import { NextRequest, NextResponse } from 'next/server';
import { hash, compare, genSalt } from 'bcrypt-ts';

export const runtime = 'edge';

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { userId, currentPassword, newPassword } = body;

        if (!userId || !currentPassword || !newPassword) {
            return NextResponse.json(
                { error: 'User ID, current password, and new password are required' },
                { status: 400 }
            );
        }

        // Get D1 database
        const { getCloudflareContext } = await import('@opennextjs/cloudflare');
        const ctx = await getCloudflareContext();
        const db = (ctx.env as any).DB as D1Database;

        if (!db) {
            return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
        }

        // Get user's current password hash
        const user = await db
            .prepare('SELECT id, username, password FROM users WHERE id = ?') // Fixed trailing space: ?
            .bind(userId)
            .first<{ id: number; username: string; password: string }>();

        if (!user) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 }); // Fixed space: status:  404
        }

        // Verify current password
        const isValid = await compare(currentPassword, user.password);
        if (!isValid) {
            return NextResponse.json({ error: 'Current password is incorrect' }, { status: 401 });
        }

        // Hash new password
        const salt = await genSalt(10);
        const hashedPassword = await hash(newPassword, salt);

        // Update password
        await db
            .prepare(`UPDATE users SET password = ?, updated_at = datetime('now') WHERE id = ?`)
            .bind(hashedPassword, userId)
            .run();

        // Log activity
        await db
            .prepare(`INSERT INTO activity_logs (user_id, action_type, description) VALUES (?, ?, ?)`)
            .bind(userId, 'update', `${user.username} changed their password`)
            .run();

        return NextResponse.json({ success: true }); // Fixed space: NextResponse. json
    } catch (error: any) {
        console.error('Change password error:', error);
        return NextResponse.json({ error: 'Failed to change password: ' + error.message }, { status: 500 });
    }
}