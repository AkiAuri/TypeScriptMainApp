import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { RowDataPacket, ResultSetHeader } from 'mysql2';
import bcrypt from 'bcrypt';
import { logActivity, getAdminIdFromRequest } from '@/lib/activity-logger';

// GET - Fetch all users with profiles
export async function GET() {
    try {
        const [rows] = await pool.execute<RowDataPacket[]>(
            `SELECT
                 u.id, u.username, u.email, u.role, u.created_at,
                 p.first_name, p.middle_name, p.last_name, p.department, p.employee_id
             FROM users u
                      LEFT JOIN profiles p ON u.id = p.user_id
             ORDER BY u.created_at DESC`
        );

        const users = rows.map(user => ({
            ... user,
            fullName: [user.first_name, user.middle_name, user.last_name]
                .filter(Boolean)
                .join(' ') || user.username,
        }));

        return NextResponse.json({
            success: true,
            users,
        });
    } catch (error) {
        console.error('Fetch users error:', error);
        return NextResponse.json(
            { error: 'Failed to fetch users' },
            { status:  500 }
        );
    }
}

// POST - Create new user with profile
export async function POST(request: NextRequest) {
    try {
        const adminId = getAdminIdFromRequest(request);
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
        } = await request.json();

        if (!username || !email || !password || !role) {
            return NextResponse.json(
                { error: 'Username, email, password, and role are required' },
                { status: 400 }
            );
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Insert user
        const [userResult] = await pool.execute<ResultSetHeader>(
            'INSERT INTO users (username, email, password, role) VALUES (?, ?, ?, ?)',
            [username, email, hashedPassword, role]
        );

        const userId = userResult.insertId;

        // Insert profile if any profile data provided
        if (firstName || middleName || lastName || department || employeeId) {
            await pool.execute(
                `INSERT INTO profiles (user_id, first_name, middle_name, last_name, department, employee_id)
                 VALUES (?, ?, ?, ?, ?, ?)`,
                [userId, firstName || null, middleName || null, lastName || null, department || null, employeeId || null]
            );
        }

        // ✅ Log activity with admin who performed the action
        const fullName = [firstName, lastName].filter(Boolean).join(' ') || username;
        await logActivity(
            adminId,
            'create',
            `Created new ${role}:  ${fullName} (${username})`
        );

        return NextResponse.json({
            success: true,
            message: 'User created successfully',
            userId,
        });
    } catch (error:  any) {
        console.error('Create user error:', error);
        if (error.code === 'ER_DUP_ENTRY') {
            return NextResponse. json(
                { error: 'Username or email already exists' },
                { status: 400 }
            );
        }
        return NextResponse.json(
            { error: 'Failed to create user' },
            { status: 500 }
        );
    }
}