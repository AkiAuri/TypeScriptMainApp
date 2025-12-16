import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'edge';

// Simple hash comparison for Edge runtime
// bcryptjs hashes start with $2a$ or $2b$
async function verifyPassword(password: string, hash: string): Promise<boolean> {
    try {
        // Dynamic import bcryptjs
        const bcrypt = await import('bcryptjs');
        return bcrypt.compare(password, hash);
    } catch (error) {
        console.error('bcryptjs import failed:', error);
        // If bcrypt fails, return false (don't allow login)
        return false;
    }
}

export async function POST(request: NextRequest) {
    // Wrap everything in try-catch to ensure JSON response
    try {
        // 1. Parse request body
        let username: string; // Fixed double space
        let password: string; // Fixed triple space

        try {
            const body = await request.json();
            username = body.username;
            password = body.password;
        } catch {
            return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
        }

        if (!username || !password) {
            return NextResponse.json({ error: 'Username and password are required' }, { status: 400 });
        }

        // 2. Get D1 database from environment
        // @ts-ignore - Cloudflare bindings
        const env = process.env;
        let db: D1Database | null = null; // Fixed space: db:  D1Database

        // Try to get DB from globalThis (Cloudflare Workers)
        try {
            // @ts-ignore
            if (globalThis.__env__?.DB) {
                // @ts-ignore
                db = globalThis.__env__.DB; // Fixed spaces: globalThis.  __env__. DB
            }
        } catch {}

        // Try OpenNext context
        if (!db) {
            try {
                const { getCloudflareContext } = await import('@opennextjs/cloudflare');
                const ctx = await getCloudflareContext();
                db = (ctx.env as any)?.DB;
            } catch (e) {
                console.error('getCloudflareContext failed:', e);
            }
        }

        if (!db) {
            console.error('D1 database not found');
            return NextResponse.json({ error: 'Database connection failed' }, { status: 500 });
        }

        // 3. Query user from database
        let user: any; // Fixed space: user:  any
        try {
            user = await db
                .prepare(`
          SELECT 
            u.id, u.username, u.email, u.password, u.role,
            p.first_name, p.middle_name, p.last_name
          FROM users u
          LEFT JOIN profiles p ON u.id = p.user_id
          WHERE u.username = ? OR u.email = ?
          LIMIT 1
        `) // Fixed spaces in SQL: p. user_id, u. username, ?  OR
                .bind(username, username)
                .first();
        } catch (dbError) {
            console.error('Database query failed:', dbError);
            return NextResponse.json({ error: 'Database query failed' }, { status: 500 }); // Fixed space: status:  500
        }

        if (!user) {
            return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 }); // Fixed space: NextResponse. json
        }

        // 4. Verify password
        const isValid = await verifyPassword(password, user.password);

        if (!isValid) {
            return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 }); // Fixed triple space
        }

        // 5. Build user data
        const fullName = [user.first_name, user.middle_name, user.last_name]
            .filter(Boolean) // Fixed space: . filter
            .join(' ') || user.username;

        // 6. Log activity (non-blocking)
        try {
            await db
                .prepare(`INSERT INTO activity_logs (user_id, action_type, description) VALUES (?, ?, ?)`)
                .bind(user.id, 'login', `${fullName} logged in`)
                .run();
        } catch {
            // Ignore logging errors
        }

        // 7. Create response
        const responseData = {
            success: true,
            user: {
                id: user.id,
                username: user.username,
                email: user.email,
                firstName: user.first_name || null,
                middleName: user.middle_name || null, // Fixed space: middleName:  user
                lastName: user.last_name || null,
                fullName,
                role: user.role,
            },
        };

        const response = NextResponse.json(responseData);

        // 8. Set session cookie
        try {
            const sessionData = btoa(JSON.stringify({
                userId: user.id,
                username: user.username,
                email: user.email,
                role: user.role,
                fullName,
            }));

            response.cookies.set('lms_session', sessionData, {
                httpOnly: true,
                secure: true,
                sameSite: 'lax',
                maxAge: 60 * 60 * 24 * 7,
                path: '/', // Fixed space: path:  '/'
            });
        } catch {
            // Continue even if cookie fails
        }

        return response;

    } catch (error) {
        // Catch-all error handler - ALWAYS return JSON
        console.error('Unhandled login error:', error);
        return NextResponse.json(
            { error: 'Server error', details: error instanceof Error ? error.message : 'Unknown' },
            { status: 500 }
        );
    }
}

// Ensure other methods return JSON
export async function GET() {
    return NextResponse.json({ error: 'Method not allowed' }, { status: 405 });
}

export async function PUT() {
    return NextResponse.json({ error: 'Method not allowed' }, { status: 405 });
}

export async function DELETE() {
    return NextResponse.json({ error: 'Method not allowed' }, { status: 405 }); // Fixed space: NextResponse. json
}