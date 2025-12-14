import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { RowDataPacket, ResultSetHeader } from 'mysql2';
import bcrypt from 'bcrypt';

// GET - Fetch users by role with profiles
export async function GET(request:  NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const role = searchParams.get('role');

        if (!role || ! ['student', 'teacher', 'admin'].includes(role)) {
            return NextResponse. json(
                { error: 'Valid role is required (student, teacher, admin)' },
                { status:  400 }
            );
        }

        const [users] = await pool.execute<RowDataPacket[]>(`
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
    `, [role]);

        // Map to include fullName
        const mappedUsers = users.map(user => ({
            ... user,
            fullName: [user.first_name, user.middle_name, user.last_name]
                .filter(Boolean)
                .join(' ') || user.username,
        }));

        return NextResponse. json({ success: true, users: mappedUsers });
    } catch (error) {
        console.error('Fetch users by role error:', error);
        return NextResponse.json(
            { error: 'Failed to fetch users' },
            { status: 500 }
        );
    }
}

// POST - Create new user with profile
export async function POST(request:  NextRequest) {
    try {
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

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Insert user
        const [userResult] = await pool.execute<ResultSetHeader>(
            'INSERT INTO users (username, email, password, role) VALUES (?, ?, ?, ? )',
            [username, email, hashedPassword, role]
        );

        const userId = userResult.insertId;

        // Insert profile
        await pool.execute(
            `INSERT INTO profiles (user_id, first_name, middle_name, last_name, department, employee_id, phone, address, date_of_birth)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                userId,
                firstName || null,
                middleName || null,
                lastName || null,
                department || null,
                employeeId || null,
                phone || null,
                address || null,
                dateOfBirth || null,
            ]
        );

        // Log activity
        await pool.execute(
            'INSERT INTO activity_logs (user_id, action_type, description) VALUES (?, ?, ?)',
            [userId, `${role}_registered`, `New ${role} account created:  ${username}`]
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