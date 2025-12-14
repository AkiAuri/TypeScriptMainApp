import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { RowDataPacket } from 'mysql2';
import bcrypt from 'bcrypt';

interface UserRow extends RowDataPacket {
    id:  number;
    password:  string;
}

export async function POST(request: NextRequest) {
    try {
        const { userId, currentPassword, newPassword } = await request.json();

        if (!userId || !newPassword) {
            return NextResponse.json(
                { error: 'User ID and new password are required' },
                { status:  400 }
            );
        }

        // Get current user password
        const [rows] = await pool.execute<UserRow[]>(
            'SELECT id, password FROM users WHERE id = ? ',
            [userId]
        );

        if (rows.length === 0) {
            return NextResponse.json(
                { error: 'User not found' },
                { status: 404 }
            );
        }

        // If current password provided, verify it
        if (currentPassword) {
            const user = rows[0];
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

        // Log activity
        await pool.execute(
            'INSERT INTO activity_logs (user_id, action_type, description) VALUES (?, ?, ?)',
            [userId, 'password_changed', 'User changed their password']
        );

        return NextResponse.json({
            success: true,
            message: 'Password updated successfully',
        });
    } catch (error) {
        console.error('Password change error:', error);
        return NextResponse.json(
            { error: 'Failed to change password' },
            { status:  500 }
        );
    }
}