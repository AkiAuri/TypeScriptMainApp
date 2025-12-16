import { NextRequest, NextResponse } from 'next/server';
import { hash, compare, genSalt } from 'bcrypt-ts';

async function getDB() {
    const { getCloudflareContext } = await import('@opennextjs/cloudflare');
    const ctx = await getCloudflareContext({ async: true });
    const db = (ctx.env as any)?.DB;
    if (!db) throw new Error('Database not configured');
    return { db, ctx };
}

export async function POST(request: NextRequest) {
    try {
        const { db, ctx } = await getDB();
        const body = await request.json();
        const { userId, currentPassword, newPassword } = body;

        if (!userId || !currentPassword || !newPassword) {
            return NextResponse.json(
                { error: 'User ID, current password, and new password are required' },
                { status:  400 }
            );
        }

        // Get user's current password hash
        const user = await db
            .prepare('SELECT id, username, password FROM users WHERE id = ?')
            .bind(userId)
            .first<{ id: number; username: string; password: string }>();

        if (!user) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }

        // Verify current password
        const isValid = await compare(currentPassword, user.password);
        if (!isValid) {
            return NextResponse.json({ error: 'Current password is incorrect' }, { status:  401 });
        }

        // Hash new password
        const salt = await genSalt(10);
        const hashedPassword = await hash(newPassword, salt);

        // Update password
        await db
            .prepare(`UPDATE users SET password = ?, updated_at = datetime('now') WHERE id = ?`)
            .bind(hashedPassword, userId)
            .run();

        // Log activity (non-blocking)
        const logPromise = db
            . prepare('INSERT INTO activity_logs (user_id, action_type, description) VALUES (?, ?, ?)')
            .bind(userId, 'update', `${user.username} changed their password`)
            .run();

        if (ctx.ctx?.waitUntil) {
            ctx.ctx.waitUntil(logPromise);
        }

        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error('Change password error:', error);
        return NextResponse.json({ error: 'Failed to change password: ' + error.message }, { status: 500 });
    }
}