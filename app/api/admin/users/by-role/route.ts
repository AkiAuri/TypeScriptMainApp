import { NextRequest, NextResponse } from 'next/server';
import { hash, genSalt } from 'bcrypt-ts';

async function getDB() {
    const { getCloudflareContext } = await import('@opennextjs/cloudflare');
    const ctx = await getCloudflareContext({ async: true });
    const db = (ctx.env as any)?.DB;
    if (!db) throw new Error('Database not configured');
    return { db, ctx };
}

// GET - Fetch users by role with profiles
export async function GET(request: NextRequest) {
    try {
        const { db } = await getDB();
        const { searchParams } = new URL(request.url);
        const role = searchParams.get('role');

        if (!role || !['student', 'teacher', 'admin'].includes(role)) {
            return NextResponse.json(
                { error: 'Valid role is required (student, teacher, admin)' },
                { status: 400 }
            );
        }

        const result = await db
            .prepare(`
                SELECT
                    u.id,
                    u.username,
                    u.email,
                    u.role,
                    u.created_at,
                    p.first_name,
                    p.middle_name,
                    p.last_name,
                    p.department,
                    p.employee_id,
                    p.phone,
                    p.address,
                    p.date_of_birth
                FROM users u
                LEFT JOIN profiles p ON u.id = p.user_id
                WHERE u.role = ?
                ORDER BY u.created_at DESC
            `)
            .bind(role)
            .all();

        // Map to include fullName
        const mappedUsers = result.results.map((user: any) => ({
            ...user,
            fullName: [user.first_name, user.middle_name, user.last_name]
                .filter(Boolean)
                .join(' ') || user.username,
        }));

        return NextResponse.json({ success: true, users: mappedUsers });
    } catch (error: any) {
        console.error('Fetch users by role error:', error);
        return NextResponse.json(
            { error: 'Failed to fetch users: ' + error.message },
            { status: 500 }
        );
    }
}

// POST - Create new user with profile
export async function POST(request: NextRequest) {
    try {
        const { db, ctx } = await getDB();
        const body = await request.json();
        const {
            username,
            email,
            password,
            role,
            firstName,
            middleName,
            lastName,
            department,
            employeeId,
            phone,
            address,
            dateOfBirth,
        } = body;

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

        // Hash password
        const salt = await genSalt(10);
        const hashedPassword = await hash(password, salt);

        // Insert user
        const userResult = await db
            .prepare('INSERT INTO users (username, email, password, role, created_at, updated_at) VALUES (?, ?, ?, ?, datetime(\'now\'), datetime(\'now\'))')
            .bind(username, email, hashedPassword, role)
            .run();

        const userId = userResult.meta.last_row_id;

        // Insert profile
        await db
            .prepare(`
                INSERT INTO profiles (user_id, first_name, middle_name, last_name, department, employee_id, phone, address, date_of_birth, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
            `)
            .bind(
                userId,
                firstName || null,
                middleName || null,
                lastName || null,
                department || null,
                employeeId || null,
                phone || null,
                address || null,
                dateOfBirth || null
            )
            .run();

        // Log activity
        const fullName = [firstName, lastName].filter(Boolean).join(' ') || username;
        const roleLabel = role === 'teacher' ? 'instructor' : role;

        const logPromise = db
            .prepare('INSERT INTO activity_logs (user_id, action_type, description) VALUES (?, ?, ?)')
            .bind(null, 'create', `Created new ${roleLabel}: ${fullName} (${username})`)
            .run();

        if (ctx.ctx?.waitUntil) {
            ctx.ctx.waitUntil(logPromise);
        }

        return NextResponse.json({
            success: true,
            message: 'User created successfully',
            userId,
        });
    } catch (error: any) {
        console.error('Create user error:', error);

        // Check for unique constraint violation
        if (error.message?.includes('UNIQUE constraint failed')) {
            return NextResponse.json(
                { error: 'Username or email already exists' },
                { status: 400 }
            );
        }

        return NextResponse.json(
            { error: 'Failed to create user: ' + error.message },
            { status: 500 }
        );
    }
}