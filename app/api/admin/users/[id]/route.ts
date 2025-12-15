import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { RowDataPacket } from 'mysql2';
import bcrypt from 'bcrypt';
import { logActivity, getAdminIdFromRequest } from '@/lib/activity-logger';

// GET - Fetch single user with profile
export async function GET(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const { id } = params;

        const [rows] = await pool.execute<RowDataPacket[]>(`
            SELECT
                u.id, u.username, u.email, u.role, u. created_at,
                p.first_name, p.middle_name, p.last_name, p.department, p.employee_id
            FROM users u
                     LEFT JOIN profiles p ON u.id = p.user_id
            WHERE u.id = ?
        `, [id]);

        if (rows.length === 0) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }

        return NextResponse.json({ success: true, user: rows[0] });
    } catch (error) {
        console.error('Fetch user error:', error);
        return NextResponse.json({ error: 'Failed to fetch user' }, { status: 500 });
    }
}

// PUT - Update user and profile
export async function PUT(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const { id } = params;
        const adminId = getAdminIdFromRequest(request);
        const body = await request.json();
        const {
            username,
            email,
            password,
            firstName,
            middleName,
            lastName,
            department,
            employeeId,
        } = body;

        // Get current user info for logging
        const [currentUser] = await pool.execute<RowDataPacket[]>(
            'SELECT u.username, u.role FROM users u WHERE u.id = ? ',
            [id]
        );
        const userRole = currentUser[0]?. role || 'user';

        // Update user table
        if (password) {
            const hashedPassword = await bcrypt.hash(password, 10);
            await pool.execute(
                'UPDATE users SET username = ?, email = ?, password = ?  WHERE id = ?',
                [username, email, hashedPassword, id]
            );
        } else {
            await pool.execute(
                'UPDATE users SET username = ?, email = ?  WHERE id = ?',
                [username, email, id]
            );
        }

        // Check if profile exists
        const [existing] = await pool.execute<RowDataPacket[]>(
            'SELECT id FROM profiles WHERE user_id = ?',
            [id]
        );

        if (existing.length === 0) {
            await pool.execute(
                `INSERT INTO profiles (user_id, first_name, middle_name, last_name, department, employee_id)
                VALUES (?, ?, ?, ?, ?, ?)`,
                [id, firstName, middleName, lastName, department, employeeId]
            );
        } else {
            await pool.execute(
                `UPDATE profiles SET first_name = ?, middle_name = ?, last_name = ?, department = ?, employee_id = ? 
                WHERE user_id = ? `,
                [firstName, middleName, lastName, department, employeeId, id]
            );
        }

        // ✅ Log activity
        const fullName = [firstName, lastName].filter(Boolean).join(' ') || username;
        await logActivity(
            adminId,
            'update',
            `Updated ${userRole}: ${fullName} (${username})`
        );

        return NextResponse.json({ success: true, message: 'User updated successfully' });
    } catch (error:  any) {
        console.error('Update user error:', error);
        if (error.code === 'ER_DUP_ENTRY') {
            return NextResponse. json({ error: 'Username or email already exists' }, { status: 400 });
        }
        return NextResponse.json({ error: 'Failed to update user' }, { status: 500 });
    }
}

// DELETE - Delete user (cascade deletes profile)
export async function DELETE(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const { id } = params;
        const adminId = getAdminIdFromRequest(request);

        // Get user info before deleting for the log
        const [users] = await pool.execute<RowDataPacket[]>(
            `SELECT u.username, u.role, p.first_name, p.last_name 
            FROM users u 
            LEFT JOIN profiles p ON u.id = p.user_id 
            WHERE u.id = ? `,
            [id]
        );
        const user = users[0];

        await pool.execute('DELETE FROM users WHERE id = ?', [id]);

        // ✅ Log activity
        const fullName = [user?. first_name, user?.last_name].filter(Boolean).join(' ') || user?.username || 'Unknown';
        await logActivity(
            adminId,
            'delete',
            `Deleted ${user?.role || 'user'}: ${fullName} (${user?.username || 'unknown'})`
        );

        return NextResponse.json({ success: true, message: 'User deleted successfully' });
    } catch (error) {
        console.error('Delete user error:', error);
        return NextResponse.json({ error: 'Failed to delete user' }, { status: 500 });
    }
}