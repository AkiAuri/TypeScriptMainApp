import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { RowDataPacket } from 'mysql2';
import bcrypt from 'bcrypt';

interface UserRow extends RowDataPacket {
    id: number;
    username: string;
    email: string;
    password: string;
    role: 'teacher' | 'admin' | 'student';
}

export async function POST(request:  NextRequest) {
    try {
        const { username, password } = await request.json();

        if (!username || !password) {
            return NextResponse.json(
                { error: 'Username and password are required' },
                { status: 400 }
            );
        }

        // Query user by username or email
        const [rows] = await pool.execute<UserRow[]>(
            'SELECT id, username, email, password, role FROM users WHERE username = ? OR email = ?',
            [username, username]
        );

        if (rows.length === 0) {
            return NextResponse.json(
                { error: 'Invalid credentials' },
                { status:  401 }
            );
        }

        const user = rows[0];

        // Compare password with bcrypt hash
        const passwordMatch = await bcrypt.compare(password, user.password);

        if (!passwordMatch) {
            return NextResponse.json(
                { error: 'Invalid credentials' },
                { status: 401 }
            );
        }

        // Return user info (exclude password)
        return NextResponse.json({
            success: true,
            user: {
                id: user.id,
                username: user.username,
                email: user.email,
                role: user.role,
            },
        });
    } catch (error) {
        console.error('Login error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}