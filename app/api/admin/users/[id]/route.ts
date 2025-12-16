import { NextRequest, NextResponse } from 'next/server';
import { hash, genSalt } from 'bcrypt-ts';

async function getDB() {
    const { getCloudflareContext } = await import('@opennextjs/cloudflare');
    const ctx = await getCloudflareContext({ async: true });
    const db = (ctx.env as any)?.DB;
    if (!db) throw new Error('Database not configured');
    return { db, ctx };
}

// GET - Fetch single user
export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { db } = await getDB();
        const { id } = await params;

        const user = await db
            .prepare(`
                SELECT 
                    u.id, u.username, u.email, u.role, u.created_at,
                    p.first_name, p.middle_name, p.last_name, p.department, p.employee_id, p.phone, p.address
                FROM users u
                LEFT JOIN profiles p ON u.id = p.user_id
                WHERE u.id = ? 
            `)
            .bind(id)
            .first();

        if (!user) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }

        return NextResponse.json({ success: true, user });
    } catch (error: any) {
        console.error('Fetch user error:', error);
        return NextResponse.json({ error: 'Failed to fetch user: ' + error.message }, { status: 500 });
    }
}

// PUT - Update user
export async function PUT(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { db, ctx } = await getDB();
        const { id } = await params;
        const body = await request.json();
        const { username, email, password, role, firstName, middleName, lastName, department, employeeId } = body;

        // Check user exists
        const existing = await db
            .prepare('SELECT username FROM users WHERE id = ?')
            .bind(id)
            .first<{ username: string }>();

        if (!existing) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }

        // Update user
        if (password) {
            const salt = await genSalt(10);
            const hashedPassword = await hash(password, salt);
            await db
                .prepare(`UPDATE users SET username = ?, email = ?, password = ?, role = ?, updated_at = datetime('now') WHERE id = ?`)
                .bind(username, email, hashedPassword, role, id)
                .run();
        } else {
            await db
                .prepare(`UPDATE users SET username = ?, email = ?, role = ?, updated_at = datetime('now') WHERE id = ?`)
                .bind(username, email, role, id)
                .run();
        }

        // Update or insert profile
        const profileExists = await db
            .prepare('SELECT id FROM profiles WHERE user_id = ?')
            .bind(id)
            .first();

        if (profileExists) {
            await db
                .prepare(`UPDATE profiles SET first_name = ?, middle_name = ?, last_name = ?, department = ?, employee_id = ?, updated_at = datetime('now') WHERE user_id = ?`)
                .bind(firstName || null, middleName || null, lastName || null, department || null, employeeId || null, id)
                .run();
        } else {
            await db
                .prepare(`
                    INSERT INTO profiles (user_id, first_name, middle_name, last_name, department, employee_id, created_at, updated_at)
                    VALUES (?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
                `)
                .bind(id, firstName || null, middleName || null, lastName || null, department || null, employeeId || null)
                .run();
        }

        // Log activity
        const fullName = [firstName, lastName].filter(Boolean).join(' ') || username;
        const logPromise = db
            .prepare('INSERT INTO activity_logs (user_id, action_type, description) VALUES (?, ?, ?)')
            .bind(null, 'update', `Updated ${role}: ${fullName} (${username})`)
            .run();

        if (ctx.ctx?.waitUntil) {
            ctx.ctx.waitUntil(logPromise);
        }

        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error('Update user error:', error);
        return NextResponse.json({ error: 'Failed to update user: ' + error.message }, { status: 500 });
    }
}

// DELETE - Delete user
export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { db, ctx } = await getDB();
        const { id } = await params;

        // Get user info for logging
        const user = await db
            .prepare(`
                SELECT u.username, u.role, p.first_name, p.last_name 
                FROM users u 
                LEFT JOIN profiles p ON u.id = p.user_id 
                WHERE u.id = ? 
            `)
            .bind(id)
            .first<{ username: string; role: string; first_name: string; last_name: string }>();

        if (!user) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }

        // Delete user (cascade will handle profiles)
        await db
            .prepare('DELETE FROM users WHERE id = ?')
            .bind(id)
            .run();

        // Log activity
        const fullName = [user.first_name, user.last_name].filter(Boolean).join(' ') || user.username;
        const logPromise = db
            .prepare('INSERT INTO activity_logs (user_id, action_type, description) VALUES (?, ?, ?)')
            .bind(null, 'delete', `Deleted ${user.role}: ${fullName} (${user.username})`)
            .run();

        if (ctx.ctx?.waitUntil) {
            ctx.ctx.waitUntil(logPromise);
        }

        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error('Delete user error:', error);
        return NextResponse.json({ error: 'Failed to delete user: ' + error.message }, { status: 500 });
    }
}