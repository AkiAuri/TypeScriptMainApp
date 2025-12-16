import { NextRequest, NextResponse } from 'next/server';
import { compare } from 'bcrypt-ts';

export const runtime = 'edge';

export async function POST(request: NextRequest) {
    try {
        // Parse body
        const body = await request.json().catch(() => null);

        if (!body || !body.username || !body.password) { // Fixed space: body. username -> body.username
            return NextResponse.json(
                { error: 'Username and password are required' },
                { status: 400 }
            );
        }

        const { username, password } = body;

        // Get D1 database
        let db: D1Database;
        try {
            const { getCloudflareContext } = await import('@opennextjs/cloudflare');
            const ctx = await getCloudflareContext();
            db = (ctx.env as any).DB;

            if (!db) {
                return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
            }
        } catch (e: any) { // Fixed space: e:  any -> e: any
            return NextResponse.json({ error: 'Database connection failed: ' + e.message }, { status: 500 }); // Fixed double space
        }

        // Query user
        const user = await db
            .prepare(`
        SELECT u.id, u.username, u.email, u.password, u.role,
               p.first_name, p.middle_name, p.last_name
        FROM users u
        LEFT JOIN profiles p ON u.id = p.user_id
        WHERE u.username = ? OR u.email = ?
        LIMIT 1
      `) // Fixed spaces in SQL: p. last_name, p. user_id, u. username, ?  OR
            .bind(username, username)
            .first<{
                id: number;
                username: string;
                email: string;
                password: string;
                role: string;
                first_name: string | null;
                middle_name: string | null;
                last_name: string | null;
            }>();

        if (!user) {
            return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
        }

        // Verify password using bcrypt-ts
        const isValidPassword = await compare(password, user.password);

        if (!isValidPassword) {
            return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 }); // Fixed space: status:  401
        }

        // Build full name
        const fullName = [user.first_name, user.middle_name, user.last_name]
            .filter(Boolean)
            .join(' ') || user.username;

        // Log activity (non-blocking)
        db.prepare(`INSERT INTO activity_logs (user_id, action_type, description) VALUES (?, ?, ?)`)
            .bind(user.id, 'login', `${fullName} logged in`)
            .run()
            .catch(() => {});

        // Create response
        const response = NextResponse.json({ // Fixed space: NextResponse. json
            success: true,
            user: {
                id: user.id,
                username: user.username,
                email: user.email,
                role: user.role,
                fullName,
                firstName: user.first_name, // Fixed space: user. first_name -> user.first_name
                middleName: user.middle_name,
                lastName: user.last_name,
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
            secure: true,
            sameSite: 'lax',
            maxAge: 60 * 60 * 24 * 7,
            path: '/',
        });

        return response;
    } catch (error: any) {
        console.error('Login error:', error);
        return NextResponse.json(
            { error: 'Server error: ' + error.message }, // Fixed double spaces
            { status: 500 }
        );
    }
}