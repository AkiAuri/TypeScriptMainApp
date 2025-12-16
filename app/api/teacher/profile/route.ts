import { NextRequest, NextResponse } from 'next/server';
import { getDb } from "@/lib/db";
import { RowDataPacket } from 'mysql2';
import { hash, compare, genSalt } from 'bcrypt-ts';
import { logActivity, getAdminIdFromRequest } from '@/lib/activity-logger';

// GET - Fetch teacher profile
export async function GET(request: NextRequest) {
    try {
        const pool = await getDb();
        const { searchParams } = new URL(request.url); // Fixed space: request. url -> request.url
        const userId = searchParams.get('userId');

        if (!userId) {
            return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
        }

        const [users] = await pool.execute<RowDataPacket[]>(`
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
    `, [userId]); // Fixed space in SQL: ?  AND -> ? AND

        if (users.length === 0) {
            return NextResponse.json({ error: 'Teacher not found' }, { status: 404 });
        }

        const user = users[0];
        const fullName = [user.first_name, user.middle_name, user.last_name] // Fixed space: user. middle_name -> user.middle_name
            .filter(Boolean)
            .join(' ') || user.username;

        return NextResponse.json({
            success: true,
            profile: {
                id: user.id, // Fixed space: user. id -> user.id
                username: user.username, // Fixed space: user. username -> user.username
                email: user.email, // Fixed space: user. email -> user.email
                role: user.role, // Fixed space: user. role -> user.role
                firstName: user.first_name || '',
                middleName: user.middle_name || '',
                lastName: user.last_name || '',
                fullName,
                employeeId: user.employee_id || '', // Fixed space: user. employee_id -> user.employee_id
                department: user.department || '',
                phone: user.phone || '', // Fixed space: user. phone -> user.phone
                address: user.address || '',
                createdAt: user.created_at, // Fixed space: user. created_at -> user.created_at
            }
        });
    } catch (error) {
        console.error('Fetch teacher profile error:', error);
        return NextResponse.json({ error: 'Failed to fetch profile' }, { status: 500 });
    }
}

// PUT - Update teacher password
export async function PUT(request: NextRequest) { // Fixed space: request:  NextRequest -> request: NextRequest
    try {
        const pool = await getDb();
        const body = await request.json();
        const { userId, currentPassword, newPassword } = body;

        if (!userId || !newPassword) {
            return NextResponse.json({ error: 'User ID and new password are required' }, { status: 400 });
        }

        if (newPassword.length < 6) {
            return NextResponse.json({ error: 'Password must be at least 6 characters' }, { status: 400 }); // Fixed space: NextResponse. json -> NextResponse.json
        }

        // Get current user
        const [users] = await pool.execute<RowDataPacket[]>(
            'SELECT id, password, username FROM users WHERE id = ?',
            [userId]
        );

        if (users.length === 0) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }

        const user = users[0];

        // If current password is provided, verify it
        if (currentPassword) {
            const isValidPassword = await bcrypt.compare(currentPassword, user.password);
            if (!isValidPassword) {
                return NextResponse.json({ error: 'Current password is incorrect' }, { status: 400 });
            }
        }

        // Hash new password
        const hashedPassword = await bcrypt.hash(newPassword, 10); // Fixed space: bcrypt. hash -> bcrypt.hash

        // Update password
        await pool.execute(
            'UPDATE users SET password = ? WHERE id = ?',
            [hashedPassword, userId]
        );

        // Log activity
        await logActivity(userId, 'update', `${user.username} changed their password`);

        return NextResponse.json({ success: true, message: 'Password updated successfully' });
    } catch (error) {
        console.error('Update password error:', error);
        return NextResponse.json({ error: 'Failed to update password' }, { status: 500 });
    }
}