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
    first_name: string | null;
    last_name: string | null;
}

export async function POST(request: NextRequest) {
    try {
        const { username, password } = await request.json();

        if (!username || !password) {
            return NextResponse.json(
                { error: 'Username and password are required' },
                { status: 400 }
            );
        }

        // Query user with profile data (LEFT JOIN)
        const [rows] = await pool.execute<UserRow[]>(
            `SELECT 
        u.id, u.username, u.email, u.password, u.role,
        p.first_name, p.last_name
       FROM users u
       LEFT JOIN profiles p ON u.id = p. user_id
       WHERE u. username = ?  OR u.email = ?`,
            [username, username]
        );

        if (rows.length === 0) {
            return NextResponse.json(
                { error: 'Invalid credentials' },
                { status: 401 }
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

        // Log login activity
        await pool.execute(
            'INSERT INTO activity_logs (user_id, action_type, description) VALUES (?, ?, ?)',
            [user.id, 'login', `${user.username} logged in`]
        );

        // Build display name (profile name or username)
        const fullName = [user.first_name, user.last_name]
            .filter(Boolean)
            .join(' ') || user.username;

        return NextResponse. json({
            success: true,
            user: {
                id: user.id,
                username: user.username,
                email: user.email,
                firstName: user.first_name,
                lastName: user.last_name,
                fullName,
                role: user. role,
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