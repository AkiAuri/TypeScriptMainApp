import { NextRequest, NextResponse } from 'next/server';
import { compare } from 'bcrypt-ts';
// If bcrypt-ts continues to crash, try: import { compare } from 'bcryptjs';

// 1. REMOVED: export const runtime = 'edge';

export async function POST(request: NextRequest) {
    try {
        const body = await request.json().catch(() => null);

        if (!body || !body.username || !body.password) {
            return NextResponse.json(
                { error: 'Username and password are required' },
                { status: 400 }
            );
        }

        const { username, password } = body;

        let db;
        try {
            // 2. Add { async: true } to be safe with OpenNext
            const { getCloudflareContext } = await import('@opennextjs/cloudflare');
            const ctx = await getCloudflareContext({ async: true });

            if (!ctx || !ctx.env) {
                console.error("Cloudflare context or env missing");
                return NextResponse.json({ error: 'System configuration error' }, { status: 500 });
            }

            db = (ctx.env as any).DB;
        } catch (e: any) {
            console.error("DB Context Error:", e);
            return NextResponse.json({ error: 'Database connection failed' }, { status: 500 });
        }

        const user = await db
            .prepare(`
                SELECT u.id, u.username, u.email, u.password, u.role,
                       p.first_name, p.middle_name, p.last_name
                FROM users u
                LEFT JOIN profiles p ON u.id = p.user_id
                WHERE u.username = ? OR u.email = ?
                LIMIT 1
            `)
            .bind(username, username)
            .first(); // Removed strict typing for brevity, add back if needed

        if (!user) {
            return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
        }

        // 3. This is the DANGER ZONE for CPU limits
        // If this line crashes the worker, you must switch to a lighter hash or WebCrypto
        const isValidPassword = await compare(password, user.password);

        if (!isValidPassword) {
            return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
        }

        const fullName = [user.first_name, user.middle_name, user.last_name]
            .filter(Boolean)
            .join(' ') || user.username;

        // Log activity (fire and forget)
        try {
            // Use waitUntil if available to ensure this finishes after response
            const { getCloudflareContext } = await import('@opennextjs/cloudflare');
            const ctx = await getCloudflareContext({ async: true });

            const logPromise = db.prepare(`INSERT INTO activity_logs (user_id, action_type, description) VALUES (?, ?, ?)`)
                .bind(user.id, 'login', `${fullName} logged in`)
                .run();

            if (ctx.ctx && ctx.ctx.waitUntil) {
                ctx.ctx.waitUntil(logPromise);
            } else {
                // Fallback for dev environment
                logPromise.catch(console.error);
            }
        } catch (e) {
            console.error("Logging failed", e);
        }

        const response = NextResponse.json({
            success: true,
            user: {
                id: user.id,
                username: user.username,
                email: user.email,
                role: user.role,
                fullName,
                firstName: user.first_name,
                middleName: user.middle_name,
                lastName: user.last_name,
            },
        });

        // ... Cookie setting code remains the same ...
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
            { error: 'Server error: ' + error.message },
            { status: 500 }
        );
    }
}