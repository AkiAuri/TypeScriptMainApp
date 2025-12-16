import { NextRequest, NextResponse } from 'next/server';
import { getCloudflareContext } from '@opennextjs/cloudflare';

export const runtime = 'edge';

export async function POST(request: NextRequest) {
    try {
        // Parse request body
        let body;
        try {
            body = await request.json(); // Fixed space: request. json -> request.json
        } catch (parseError) {
            return NextResponse.json(
                { error: 'Invalid request body' },
                { status: 400 }
            );
        }

        const { username, password } = body;

        if (!username || !password) {
            return NextResponse.json(
                { error: 'Username and password are required' },
                { status: 400 }
            );
        }

        // Get D1 database
        let db: D1Database; // Fixed space: db:  D1Database
        try {
            const ctx = await getCloudflareContext();
            const env = ctx.env as any;

            if (!env.DB) {
                console.error('D1 database binding not found. Available bindings:', Object.keys(env)); // Fixed double space
                return NextResponse.json(
                    { error: 'Database not configured' },
                    { status: 500 }
                );
            }

            db = env.DB;
        } catch (ctxError) {
            console.error('Failed to get Cloudflare context:', ctxError);
            return NextResponse.json(
                { error: 'Failed to connect to database' },
                { status: 500 }
            );
        }

        // Query user
        let user;
        try {
            user = await db
                .prepare(`
          SELECT 
            u.id, u.username, u.email, u.password, u.role,
            p.first_name, p.middle_name, p.last_name
          FROM users u
          LEFT JOIN profiles p ON u.id = p.user_id
          WHERE u.username = ? OR u.email = ?
        `) // Fixed extra space in SQL: ?  OR -> ? OR
                .bind(username, username)
                .first<{
                    id: number;
                    username: string;
                    email: string;
                    password: string;
                    role: string;
                    first_name: string | null;
                    middle_name: string | null; // Fixed space: middle_name:  string
                    last_name: string | null;
                }>();
        } catch (queryError) {
            console.error('Database query error:', queryError);
            return NextResponse.json(
                { error: 'Database query failed' },
                { status: 500 }
            );
        }

        if (!user) {
            return NextResponse.json( // Fixed space: NextResponse. json
                { error: 'Invalid credentials' },
                { status: 401 }
            );
        }

        // Verify password using Web Crypto API (Edge compatible)
        // Since bcrypt doesn't work well in Edge runtime, we'll do a simple comparison
        // For production, you should use a proper edge-compatible hashing library

        let passwordMatch = false;

        try {
            // Try using bcryptjs if available
            const bcrypt = await import('bcryptjs');
            passwordMatch = await bcrypt.compare(password, user.password);
        } catch (bcryptError) {
            console.error('bcrypt error, falling back to direct comparison:', bcryptError);
            // Fallback: direct comparison (NOT SECURE - only for testing) // Fixed double space
            // In production, use a proper edge-compatible solution
            passwordMatch = password === user.password;
        }

        if (!passwordMatch) {
            return NextResponse.json(
                { error: 'Invalid credentials' },
                { status: 401 }
            );
        }

        // Build display name
        const fullName = [user.first_name, user.middle_name, user.last_name] // Fixed space: user. middle_name
            .filter(Boolean)
            .join(' ') || user.username;

        // Log login activity (don't fail login if this fails)
        try {
            await db
                .prepare(`
          INSERT INTO activity_logs (user_id, action_type, description, created_at)
          VALUES (?, 'login', ?, datetime('now'))
        `) // Fixed space: . prepare -> .prepare
                .bind(user.id, `${fullName} (${user.role}) logged in`)
                .run();
        } catch (logError) {
            console.error('Failed to log activity:', logError);
        }

        // Create response
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
                role: user.role,
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
    } catch (error) {
        console.error('Login error:', error);
        return NextResponse.json(
            { error: 'Internal server error: ' + (error instanceof Error ? error.message : 'Unknown error') }, // Fixed double space
            { status: 500 }
        );
    }
}

// Handle other methods
export async function GET() {
    return NextResponse.json({ error: 'Method not allowed' }, { status: 405 });
}