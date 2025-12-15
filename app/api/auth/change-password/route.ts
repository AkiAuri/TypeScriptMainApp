import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { RowDataPacket } from 'mysql2';
import bcrypt from 'bcrypt';
import { logActivity, getAdminIdFromRequest } from '@/lib/activity-logger';

interface UserRow extends RowDataPacket {
    id:  number;
    username: string;
    password: string;
    first_name: string | null;
    last_name: string | null;
}

export async function POST(request:  NextRequest) {
    try {
        const adminId = getAdminIdFromRequest(request);
        const { userId, currentPassword, newPassword } = await request.json();

        if (!userId || !newPassword) {
            return NextResponse.json(
                { error: 'User ID and new password are required' },
                { status: 400 }
            );
        }

        // Get current user info
        const [rows] = await pool.execute<UserRow[]>(
            `SELECT u.id, u.username, u.password, p.first_name, p.last_name 
            FROM users u 
            LEFT JOIN profiles p ON u.id = p.user_id 
            WHERE u.id = ?`,
            [userId]
        );

        if (rows.length === 0) {
            return NextResponse. json(
                { error: 'User not found' },
                { status: 404 }
            );
        }

        const user = rows[0];

        // If current password provided, verify it
        if (currentPassword) {
            const passwordMatch = await bcrypt.compare(currentPassword, user.password);

            if (!passwordMatch) {
                return NextResponse.json(
                    { error: 'Current password is incorrect' },
                    { status: 401 }
                );
            }
        }

        // Hash new password
        const hashedPassword = await bcrypt.hash(newPassword, 10);

        // Update password
        await pool.execute(
            'UPDATE users SET password = ? WHERE id = ?',
            [hashedPassword, userId]
        );

        // ✅ Log activity
        const fullName = [user.first_name, user.last_name]. filter(Boolean).join(' ') || user.username;

        // Check if admin changed someone else's password or user changed their own
        const isAdminAction = adminId && adminId !== parseInt(userId, 10);

        await logActivity(
            adminId || parseInt(userId, 10),
            'update',
            isAdminAction
                ? `Admin reset password for ${fullName} (${user.username})`
                : `${fullName} (${user.username}) changed their password`
        );

        return NextResponse.json({
            success: true,
            message: 'Password updated successfully',
        });
    } catch (error) {
        console.error('Password change error:', error);
        return NextResponse.json(
            { error: 'Failed to change password' },
            { status: 500 }
        );
    }
}