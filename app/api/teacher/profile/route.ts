import { NextRequest, NextResponse } from 'next/server';
import { hash, compare, genSalt } from 'bcrypt-ts';

async function getDB() {
    const { getCloudflareContext } = await import('@opennextjs/cloudflare');
    const ctx = await getCloudflareContext({ async: true });
    const db = (ctx.env as any)?.DB;
    if (!db) throw new Error('Database not configured');
    return { db, ctx };
}

// GET - Fetch teacher profile
export async function GET(request: NextRequest) {
    try {
        const { db } = await getDB();
        const { searchParams } = new URL(request.url);
        const userId = searchParams.get('userId');

        if (!userId) {
            return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
        }

        const user = await db
            .prepare(`
                SELECT 
                    u.id,
                    u.username,
                    u.email,
                    u.role,
                    u.created_at,
                    p.first_name,
                    p.middle_name,
                    p.last_name,
                    p.employee_id,
                    p.department,
                    p.phone,
                    p.address
                FROM users u
                LEFT JOIN profiles p ON u.id = p.user_id
                WHERE u.id = ? AND u.role = 'teacher'
            `)
            .bind(userId)
            .first<{
                id: number;
                username: string;
                email: string;
                role: string;
                created_at: string;
                first_name: string | null;
                middle_name: string | null;
                last_name: string | null;
                employee_id: string | null;
                department: string | null;
                phone: string | null;
                address: string | null;
            }>();

        if (!user) {
            return NextResponse.json({ error: 'Teacher not found' }, { status: 404 });
        }

        const fullName = [user.first_name, user.middle_name, user.last_name]
            .filter(Boolean)
            .join(' ') || user.username;

        return NextResponse.json({
            success: true,
            profile: {
                id: user.id,
                username: user.username,
                email: user.email,
                role: user.role,
                firstName: user.first_name || '',
                middleName: user.middle_name || '',
                lastName: user.last_name || '',
                fullName,
                employeeId: user.employee_id || '',
                department: user.department || '',
                phone: user.phone || '',
                address: user.address || '',
                createdAt: user.created_at,
            }
        });
    } catch (error: any) {
        console.error('Fetch teacher profile error:', error);
        return NextResponse.json({ error: 'Failed to fetch profile: ' + error.message }, { status: 500 });
    }
}

// PUT - Update teacher password
export async function PUT(request: NextRequest) {
    try {
        const { db, ctx } = await getDB();
        const body = await request.json();
        const { userId, currentPassword, newPassword } = body;

        if (!userId || !newPassword) {
            return NextResponse.json({ error: 'User ID and new password are required' }, { status: 400 });
        }

        if (newPassword.length < 6) {
            return NextResponse.json({ error: 'Password must be at least 6 characters' }, { status: 400 });
        }

        // Get current user
        const user = await db
            .prepare('SELECT id, password, username FROM users WHERE id = ?')
            .bind(userId)
            .first<{ id: number; password: string; username: string }>();

        if (!user) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }

        // If current password is provided, verify it
        if (currentPassword) {
            const isValidPassword = await compare(currentPassword, user.password);
            if (!isValidPassword) {
                return NextResponse.json({ error: 'Current password is incorrect' }, { status: 400 });
            }
        }

        // Hash new password
        const salt = await genSalt(10);
        const hashedPassword = await hash(newPassword, salt);

        // Update password
        await db
            .prepare('UPDATE users SET password = ?, updated_at = datetime(\'now\') WHERE id = ?')
            .bind(hashedPassword, userId)
            .run();

        // Log activity (non-blocking)
        const logPromise = db
            .prepare('INSERT INTO activity_logs (user_id, action_type, description) VALUES (?, ?, ?)')
            .bind(userId, 'update', `${user.username} changed their password`)
            .run();

        if (ctx.ctx?.waitUntil) {
            ctx.ctx.waitUntil(logPromise);
        }

        return NextResponse.json({ success: true, message: 'Password updated successfully' });
    } catch (error: any) {
        console.error('Update password error:', error);
        return NextResponse.json({ error: 'Failed to update password: ' + error.message }, { status: 500 });
    }
}