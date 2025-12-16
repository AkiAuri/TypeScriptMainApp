import { NextRequest, NextResponse } from 'next/server';
import { query, queryOne, execute } from '@/lib/db';
import { logActivity } from '@/lib/activity-logger';
import bcrypt from 'bcryptjs';

export const runtime = 'edge';

// GET - Fetch all users or filter by role
export async function GET(request: NextRequest) {
    try {
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
    `; // Fixed space in SQL: p. last_name -> p.last_name
        const params: any[] = [];

        if (role && role !== 'all') {
            sql += ` AND u.role = ?`;
            params.push(role);
        }

        if (search) {
            sql += ` AND (u.username LIKE ? OR u.email LIKE ? OR p.first_name LIKE ? OR p.last_name LIKE ?)`; // Fixed extra spaces in SQL
            const searchPattern = `%${search}%`;
            params.push(searchPattern, searchPattern, searchPattern, searchPattern);
        }

        sql += ` ORDER BY u.created_at DESC`;

        const users = await query(sql, params);

        const mappedUsers = users.map((user: any) => ({ // Fixed space: user:  any
            id: user.id,
            username: user.username,
            email: user.email,
            role: user.role,
            createdAt: user.created_at,
            firstName: user.first_name,
            middleName: user.middle_name,
            lastName: user.last_name,
            fullName: [user.first_name, user.middle_name, user.last_name].filter(Boolean).join(' ') || user.username, // Fixed spaces: user. middle_name and ]. filter
            department: user.department,
            employeeId: user.employee_id,
            phone: user.phone,
        }));

        return NextResponse.json({ success: true, users: mappedUsers });
    } catch (error) {
        console.error('Fetch users error:', error);
        return NextResponse.json({ error: 'Failed to fetch users' }, { status: 500 }); // Fixed space: status:  500
    }
}

// POST - Create a new user
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { username, email, password, role, firstName, middleName, lastName, department, employeeId } = body;

        if (!username || !email || !password || !role) {
            return NextResponse.json(
                { error: 'Username, email, password, and role are required' },
                { status: 400 }
            );
        }

        // Check if username or email exists
        const existing = await queryOne(
            'SELECT id FROM users WHERE username = ? OR email = ?',
            [username, email]
        );

        if (existing) {
            return NextResponse.json(
                { error: 'Username or email already exists' },
                { status: 400 }
            );
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Insert user
        const userResult = await execute(
            `INSERT INTO users (username, email, password, role, created_at, updated_at)
       VALUES (?, ?, ?, ?, datetime('now'), datetime('now'))`,
            [username, email, hashedPassword, role]
        );

        const userId = userResult.lastRowId; // Fixed space: userResult. lastRowId

        // Insert profile
        await execute(
            `INSERT INTO profiles (user_id, first_name, middle_name, last_name, department, employee_id, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))`,
            [userId, firstName || null, middleName || null, lastName || null, department || null, employeeId || null]
        );

        // Log activity
        const fullName = [firstName, lastName].filter(Boolean).join(' ') || username; // Fixed space: ]. filter
        await logActivity(null, 'create', `Created new ${role}: ${fullName} (${username})`); // Fixed space: :  ${fullName}

        return NextResponse.json({
            success: true,
            user: { id: userId, username, email, role }
        });
    } catch (error) {
        console.error('Create user error:', error);
        return NextResponse.json({ error: 'Failed to create user' }, { status: 500 });
    }
}