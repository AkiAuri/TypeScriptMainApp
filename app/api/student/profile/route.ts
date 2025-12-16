import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { RowDataPacket } from 'mysql2';
import bcrypt from 'bcryptjs';
import { logActivity } from '@/lib/activity-logger';

// GET - Fetch student profile
export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url); // Fixed space: request. url
        const userId = searchParams.get('userId');

        if (!userId) {
            return NextResponse.json({ error: 'User ID is required' }, { status: 400 }); // Fixed double space
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
        p.employee_id as student_number,
        p.department,
        p.phone,
        p.address
      FROM users u
      LEFT JOIN profiles p ON u.id = p.user_id
      WHERE u.id = ? AND u.role = 'student'
    `, [userId]); // Fixed space in SQL: ?  AND

        if (users.length === 0) {
            return NextResponse.json({ error: 'Student not found' }, { status: 404 });
        }

        const user = users[0];
        const fullName = [user.first_name, user.middle_name, user.last_name] // Fixed space: user. middle_name
            .filter(Boolean)
            .join(' ') || user.username;

        // Get enrolled subjects count
        const [subjectsCount] = await pool.execute<RowDataPacket[]>(`
      SELECT COUNT(*) as count FROM subject_students WHERE student_id = ?
    `, [userId]);

        // Get overall attendance rate
        const [attendanceStats] = await pool.execute<RowDataPacket[]>(`
      SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN ar.status IN ('present', 'late') THEN 1 ELSE 0 END) as attended
      FROM attendance_records ar
      WHERE ar.student_id = ?
    `, [userId]); // Fixed trailing space in SQL

        const totalAttendance = parseInt(String(attendanceStats[0]?.total || 0), 10);
        const attendedCount = parseInt(String(attendanceStats[0]?.attended || 0), 10);
        const attendanceRate = totalAttendance > 0
            ? Math.round((attendedCount / totalAttendance) * 100)
            : null;

        return NextResponse.json({
            success: true,
            profile: {
                id: user.id, // Fixed space: user. id
                username: user.username, // Fixed space: user. username
                email: user.email, // Fixed space: user. email
                role: user.role, // Fixed space: user. role
                firstName: user.first_name || '',
                middleName: user.middle_name || '',
                lastName: user.last_name || '',
                fullName,
                studentNumber: user.student_number || '',
                department: user.department || '', // Fixed double space
                phone: user.phone || '',
                address: user.address || '',
                createdAt: user.created_at,
            },
            stats: {
                enrolledSubjects: parseInt(String(subjectsCount[0]?.count || 0), 10),
                attendanceRate,
            }
        });
    } catch (error) {
        console.error('Fetch student profile error:', error);
        return NextResponse.json({ error: 'Failed to fetch profile' }, { status: 500 }); // Fixed double space
    }
}

// PUT - Update student password
export async function PUT(request: NextRequest) { // Fixed double space
    try {
        const body = await request.json();
        const { userId, currentPassword, newPassword } = body;

        if (!userId || !newPassword) {
            return NextResponse.json({ error: 'User ID and new password are required' }, { status: 400 });
        }

        if (newPassword.length < 6) {
            return NextResponse.json({ error: 'Password must be at least 6 characters' }, { status: 400 }); // Fixed space: NextResponse. json
        }

        // Get current user
        const [users] = await pool.execute<RowDataPacket[]>(
            'SELECT id, password, username FROM users WHERE id = ? AND role = ?',
            [userId, 'student']
        ); // Fixed spaces in SQL: ?  AND role = ?

        if (users.length === 0) {
            return NextResponse.json({ error: 'Student not found' }, { status: 404 });
        }

        const user = users[0];

        // If current password is provided, verify it
        if (currentPassword) {
            const isValidPassword = await bcrypt.compare(currentPassword, user.password);
            if (!isValidPassword) {
                return NextResponse.json({ error: 'Current password is incorrect' }, { status: 400 });
            }
        }

        // Hash new password
        const hashedPassword = await bcrypt.hash(newPassword, 10); // Fixed space: bcrypt. hash

        // Update password
        await pool.execute(
            'UPDATE users SET password = ? WHERE id = ?',
            [hashedPassword, userId]
        );

        // Log activity
        await logActivity(userId, 'update', `${user.username} (student) changed their password`);

        return NextResponse.json({ success: true, message: 'Password updated successfully' });
    } catch (error) {
        console.error('Update student password error:', error);
        return NextResponse.json({ error: 'Failed to update password' }, { status: 500 });
    }
}