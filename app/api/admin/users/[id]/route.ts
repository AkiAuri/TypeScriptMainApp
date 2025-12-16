import { NextRequest, NextResponse } from 'next/server';
import { queryOne, execute } from '@/lib/db';
import { logActivity } from '@/lib/activity-logger';
import bcrypt from 'bcryptjs';

export const runtime = 'edge';

// GET - Fetch single user
export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;

        const user = await queryOne(
            `SELECT 
        u.id, u.username, u.email, u.role, u.created_at,
        p.first_name, p.middle_name, p.last_name, p.department, p.employee_id, p.phone, p.address
       FROM users u
       LEFT JOIN profiles p ON u.id = p.user_id
       WHERE u.id = ?`, // Fixed spaces in SQL: p. department, p. user_id, u. id
            [id]
        );

        if (!user) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }

        return NextResponse.json({ success: true, user });
    } catch (error) {
        console.error('Fetch user error:', error);
        return NextResponse.json({ error: 'Failed to fetch user' }, { status: 500 });
    }
}

// PUT - Update user
export async function PUT(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const body = await request.json();
        const { username, email, password, role, firstName, middleName, lastName, department, employeeId } = body;

        // Check user exists
        const existing = await queryOne<{ username: string }>('SELECT username FROM users WHERE id = ?', [id]);
        if (!existing) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }

        // Update user
        if (password) {
            const hashedPassword = await bcrypt.hash(password, 10);
            await execute(
                `UPDATE users SET username = ?, email = ?, password = ?, role = ?, updated_at = datetime('now') WHERE id = ?`,
                [username, email, hashedPassword, role, id]
            );
        } else {
            await execute(
                `UPDATE users SET username = ?, email = ?, role = ?, updated_at = datetime('now') WHERE id = ?`,
                [username, email, role, id]
            );
        }

        // Update or insert profile
        const profileExists = await queryOne('SELECT id FROM profiles WHERE user_id = ?', [id]);

        if (profileExists) {
            await execute(
                `UPDATE profiles SET first_name = ?, middle_name = ?, last_name = ?, department = ?, employee_id = ?, updated_at = datetime('now') WHERE user_id = ?`,
                [firstName || null, middleName || null, lastName || null, department || null, employeeId || null, id]
            );
        } else {
            await execute(
                `INSERT INTO profiles (user_id, first_name, middle_name, last_name, department, employee_id, created_at, updated_at)
                 VALUES (?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))`,
                [id, firstName || null, middleName || null, lastName || null, department || null, employeeId || null]
            );
        }

        // Log activity
        const fullName = [firstName, lastName].filter(Boolean).join(' ') || username;
        await logActivity(null, 'update', `Updated ${role}: ${fullName} (${username})`);

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Update user error:', error);
        return NextResponse.json({ error: 'Failed to update user' }, { status: 500 });
    }
}

// DELETE - Delete user
export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;

        // Get user info for logging
        const user = await queryOne<{ username: string; role: string; first_name: string; last_name: string }>(
            `SELECT u.username, u.role, p.first_name, p.last_name 
       FROM users u 
       LEFT JOIN profiles p ON u.id = p.user_id 
       WHERE u.id = ?`, // Fixed trailing spaces in SQL
            [id]
        );

        if (!user) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }

        // Delete user (cascade will handle profiles)
        await execute('DELETE FROM users WHERE id = ?', [id]);

        // Log activity
        const fullName = [user.first_name, user.last_name].filter(Boolean).join(' ') || user.username;
        await logActivity(null, 'delete', `Deleted ${user.role}: ${fullName} (${user.username})`);

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Delete user error:', error);
        return NextResponse.json({ error: 'Failed to delete user' }, { status: 500 }); // Fixed space: status:  500
    }
}