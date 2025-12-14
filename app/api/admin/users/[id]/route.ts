import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import bcrypt from 'bcrypt';

// PUT - Update user
export async function PUT(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const { id } = params;
        const { username, email, role, password } = await request.json();

        if (password) {
            // Update with new password
            const hashedPassword = await bcrypt.hash(password, 10);
            await pool.execute(
                'UPDATE users SET username = ?, email = ?, role = ?, password = ? WHERE id = ?',
                [username, email, role, hashedPassword, id]
            );
        } else {
            // Update without password
            await pool.execute(
                'UPDATE users SET username = ?, email = ?, role = ?  WHERE id = ?',
                [username, email, role, id]
            );
        }

        return NextResponse.json({
            success: true,
            message:  'User updated successfully',
        });
    } catch (error) {
        console.error('Update user error:', error);
        return NextResponse.json(
            { error: 'Failed to update user' },
            { status: 500 }
        );
    }
}

// DELETE - Delete user
export async function DELETE(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const { id } = params;

        await pool.execute('DELETE FROM users WHERE id = ?', [id]);

        return NextResponse.json({
            success: true,
            message: 'User deleted successfully',
        });
    } catch (error) {
        console.error('Delete user error:', error);
        return NextResponse.json(
            { error: 'Failed to delete user' },
            { status: 500 }
        );
    }
}