import { NextRequest, NextResponse } from 'next/server';
import { hash, genSalt } from 'bcrypt-ts';

async function getDB() {
    const { getCloudflareContext } = await import('@opennextjs/cloudflare');
    const ctx = await getCloudflareContext({ async: true });
    const db = (ctx.env as any)?.DB;
    if (!db) throw new Error('Database not configured');
    return { db, ctx };
}

// GET - Fetch all users
export async function GET(request: NextRequest) {
    try {
        const { db } = await getDB();
        const { searchParams } = new URL(request.url);
        const role = searchParams.get('role');
        const search = searchParams.get('search');

        let sql = `
            SELECT 
                u.id, u.username, u.email, u.role, u.created_at,
                p.first_name, p.middle_name, p.last_name, p.department, p.employee_id, p.phone
            FROM users u
            LEFT JOIN profiles p ON u.id = p.user_id
            WHERE 1=1
        `;
        const params: any[] = [];

        if (role && role !== 'all') {
            sql += ` AND u.role = ?`;
            params.push(role);
        }

        if (search) {
            sql += ` AND (u.username LIKE ? OR u.email LIKE ? OR p.first_name LIKE ? OR p.last_name LIKE ?)`;
            const searchPattern = `%${search}%`;
            params.push(searchPattern, searchPattern, searchPattern, searchPattern);
        }

        sql += ` ORDER BY u.created_at DESC`;

        const stmt = db.prepare(sql);
        const result = params.length > 0
            ? await stmt.bind(...params).all()
            : await stmt.all();

        const users = result.results.map((user: any) => ({
            id: user.id,
            username: user.username,
            email: user.email,
            role: user.role,
            createdAt: user.created_at,
            firstName: user.first_name,
            middleName: user.middle_name,
            lastName: user.last_name,
            fullName: [user.first_name, user.middle_name, user.last_name].filter(Boolean).join(' ') || user.username,
            department: user.department,
            employeeId: user.employee_id,
            phone: user.phone,
        }));

        return NextResponse.json({ success: true, users });
    } catch (error: any) {
        console.error('Fetch users error:', error);
        return NextResponse.json({ error: 'Failed to fetch users: ' + error.message }, { status: 500 });
    }
}

// POST - Create a new user
export async function POST(request: NextRequest) {
    try {
        const { db, ctx } = await getDB();
        const body = await request.json();
        const { username, email, password, role, firstName, middleName, lastName, department, employeeId } = body;

        if (!username || !email || !password || !role) {
            return NextResponse.json(
                { error: 'Username, email, password, and role are required' },
                { status: 400 }
            );
        }

        // Check if username or email exists
        const existing = await db
            .prepare('SELECT id FROM users WHERE username = ? OR email = ?')
            .bind(username, email)
            .first();

        if (existing) {
            return NextResponse.json(
                { error: 'Username or email already exists' },
                { status: 400 }
            );
        }

        // Hash password using bcrypt-ts
        const salt = await genSalt(10);
        const hashedPassword = await hash(password, salt);

        // Insert user
        const userResult = await db
            .prepare(`
                INSERT INTO users (username, email, password, role, created_at, updated_at)
                VALUES (?, ?, ?, ?, datetime('now'), datetime('now'))
            `)
            .bind(username, email, hashedPassword, role)
            .run();

        const userId = userResult.meta.last_row_id;

        // Insert profile
        await db
            .prepare(`
                INSERT INTO profiles (user_id, first_name, middle_name, last_name, department, employee_id, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
            `)
            .bind(userId, firstName || null, middleName || null, lastName || null, department || null, employeeId || null)
            .run();

        // Log activity
        const fullName = [firstName, lastName].filter(Boolean).join(' ') || username;
        const logPromise = db
            .prepare('INSERT INTO activity_logs (user_id, action_type, description) VALUES (?, ?, ?)')
            .bind(null, 'create', `Created new ${role}: ${fullName} (${username})`)
            .run();

        if (ctx.ctx?.waitUntil) {
            ctx.ctx.waitUntil(logPromise);
        }

        return NextResponse.json({
            success: true,
            user: { id: userId, username, email, role }
        });
    } catch (error: any) {
        console.error('Create user error:', error);
        return NextResponse.json({ error: 'Failed to create user: ' + error.message }, { status: 500 });
    }
}