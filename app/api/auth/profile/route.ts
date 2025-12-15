import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { RowDataPacket } from 'mysql2';
import { logActivity, getAdminIdFromRequest } from '@/lib/activity-logger';

interface ProfileRow extends RowDataPacket {
    id: number;
    username: string;
    email: string;
    role: string;
    profile_id: number | null;
    first_name: string | null;
    middle_name: string | null;
    last_name: string | null;
    department: string | null;
    employee_id: string | null;
    phone: string | null;
    address: string | null;
    date_of_birth: string | null;
    profile_picture: string | null;
}

// GET - Fetch user profile (JOIN users + profiles)
export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const userId = searchParams.get('userId');

        if (!userId) {
            return NextResponse.json(
                { error: 'User ID is required' },
                { status:  400 }
            );
        }

        const [rows] = await pool.execute<ProfileRow[]>(
            `SELECT
                 u.id,
                 u.username,
                 u.email,
                 u.role,
                 u.created_at,
                 p.id as profile_id,
                 p.first_name,
                 p.middle_name,
                 p.last_name,
                 p.department,
                 p.employee_id,
                 p.phone,
                 p.address,
                 p.date_of_birth,
                 p.profile_picture
             FROM users u
                      LEFT JOIN profiles p ON u. id = p.user_id
             WHERE u.id = ?`,
            [userId]
        );

        if (rows.length === 0) {
            return NextResponse.json(
                { error: 'User not found' },
                { status: 404 }
            );
        }

        const user = rows[0];

        const fullName = [user.first_name, user.middle_name, user.last_name]
            .filter(Boolean)
            .join(' ') || user.username;

        return NextResponse.json({
            success: true,
            user: {
                id: user.id,
                username: user.username,
                email: user.email,
                role: user.role,
                profileId: user.profile_id,
                firstName: user.first_name || '',
                middleName: user.middle_name || '',
                lastName: user.last_name || '',
                fullName,
                department: user.department || '',
                employeeId: user.employee_id || '',
                phone: user.phone || '',
                address: user. address || '',
                dateOfBirth: user.date_of_birth || '',
                profilePicture: user.profile_picture || '',
                hasProfile: user. profile_id !== null,
            },
        });
    } catch (error) {
        console.error('Profile fetch error:', error);
        return NextResponse.json(
            { error: 'Failed to fetch profile' },
            { status: 500 }
        );
    }
}

// PUT - Update profile
export async function PUT(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const userId = searchParams.get('userId');
        const body = await request.json();
        const adminId = getAdminIdFromRequest(request);

        if (!userId) {
            return NextResponse. json(
                { error: 'User ID is required' },
                { status: 400 }
            );
        }

        const {
            firstName,
            middleName,
            lastName,
            department,
            employeeId,
            phone,
            address,
            dateOfBirth,
        } = body;

        // Check if profile exists
        const [existing] = await pool. execute<RowDataPacket[]>(
            'SELECT id FROM profiles WHERE user_id = ?',
            [userId]
        );

        if (existing.length === 0) {
            await pool.execute(
                `INSERT INTO profiles
                 (user_id, first_name, middle_name, last_name, department, employee_id, phone, address, date_of_birth)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [userId, firstName, middleName, lastName, department, employeeId, phone, address, dateOfBirth]
            );
        } else {
            await pool.execute(
                `UPDATE profiles SET
                                     first_name = ?,
                                     middle_name = ?,
                                     last_name = ?,
                                     department = ?,
                                     employee_id = ?,
                                     phone = ?,
                                     address = ?,
                                     date_of_birth = ?
                 WHERE user_id = ? `,
                [firstName, middleName, lastName, department, employeeId, phone, address, dateOfBirth, userId]
            );
        }

        // ✅ Log activity
        const fullName = [firstName, lastName]. filter(Boolean).join(' ') || 'User';
        await logActivity(
            adminId || parseInt(userId, 10),
            'update',
            `Profile updated for ${fullName}`
        );

        return NextResponse.json({
            success: true,
            message: 'Profile updated successfully',
        });
    } catch (error) {
        console.error('Profile update error:', error);
        return NextResponse.json(
            { error: 'Failed to update profile' },
            { status:  500 }
        );
    }
}