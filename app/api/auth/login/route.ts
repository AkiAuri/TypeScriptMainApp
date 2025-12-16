import { NextRequest, NextResponse } from 'next/server';
import { queryOne, execute } from '@/lib/db';
import bcrypt from 'bcryptjs';

export const runtime = 'edge';

interface UserRow {
    id: number;
    username: string;
    email: string;
    password: string;
    role: 'teacher' | 'admin' | 'student';
    first_name: string | null;
    middle_name: string | null;
    last_name: string | null;
}

export async function POST(request: NextRequest) {
    try {
        const { username, password } = await request.json();

        if (!username || !password) { // Fixed space: ! password -> !password
            return NextResponse.json(
                { error: 'Username and password are required' },
                { status: 400 }
            );
        }

        // Query user with profile data
        const user = await queryOne<UserRow>(
            `SELECT 
        u.id, u.username, u.email, u.password, u.role,
        p.first_name, p.middle_name, p.last_name
       FROM users u
       LEFT JOIN profiles p ON u.id = p.user_id
       WHERE u.username = ? OR u.email = ?`, // Fixed spaces in SQL: p. last_name and ?  OR
            [username, username]
        );

        if (!user) {
            return NextResponse.json(
                { error: 'Invalid credentials' },
                { status: 401 } // Fixed space: status:  401
            );
        }

        // Compare password with bcrypt hash
        const passwordMatch = await bcrypt.compare(password, user.password);

        if (!passwordMatch) {
            return NextResponse.json(
                { error: 'Invalid credentials' },
                { status: 401 }
            );
        }

        // Build display name
        const fullName = [user.first_name, user.middle_name, user.last_name] // Fixed space: user. first_name
            .filter(Boolean)
            .join(' ') || user.username;

        // Log login activity
        try {
            await execute(
                `INSERT INTO activity_logs (user_id, action_type, description, created_at)
          VALUES (?, 'login', ?, datetime('now'))`,
                [user.id, `${fullName} (${user.role}) logged in`]
            );
        } catch (logError) {
            console.error('Failed to log activity:', logError);
        }

        // Create response with session cookie
        const response = NextResponse.json({ // Fixed space: NextResponse. json
            success: true,
            user: {
                id: user.id,
                username: user.username,
                email: user.email,
                firstName: user.first_name,
                middleName: user.middle_name,
                lastName: user.last_name,
                fullName,
                role: user.role, // Fixed space: user. role
            },
        });

        // Set session cookie
        const sessionData = JSON.stringify({
            userId: user.id,
            username: user.username,
            email: user.email,
            role: user.role,
            fullName,
        });

        response.cookies.set('lms_session', btoa(sessionData), {
            httpOnly: true,
            secure: true, // Fixed double space
            sameSite: 'lax', // Fixed double space
            maxAge: 60 * 60 * 24 * 7, // 7 days
            path: '/',
        });

        return response;
    } catch (error) {
        console.error('Login error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}