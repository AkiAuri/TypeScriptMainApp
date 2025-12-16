import { NextRequest, NextResponse } from 'next/server';
import { hash, compare, genSalt } from 'bcrypt-ts';

async function getDB() {
    const { getCloudflareContext } = await import('@opennextjs/cloudflare');
    const ctx = await getCloudflareContext({ async: true });
    const db = (ctx.env as any)?.DB;
    if (!db) throw new Error('Database not configured');
    return { db, ctx };
}

// GET - Fetch student profile
export async function GET(request: NextRequest) {
    try {
        const { db } = await getDB();
        const { searchParams } = new URL(request.url);
        const userId = searchParams.get('userId');

        if (!userId) {
            return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
        }

        const user = await db
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
                    p.employee_id as student_number,
                    p.department,
                    p.phone,
                    p.address
                FROM users u
                LEFT JOIN profiles p ON u.id = p.user_id
                WHERE u.id = ? AND u.role = 'student'
            `)
            .bind(userId)
            .first<{
                id: number;
                username: string;
                email: string;
                role: string;
                created_at: string;
                first_name: string | null;
                middle_name: string | null;
                last_name: string | null;
                student_number: string | null;
                department: string | null;
                phone: string | null;
                address: string | null;
            }>();

        if (!user) {
            return NextResponse.json({ error: 'Student not found' }, { status: 404 });
        }

        const fullName = [user.first_name, user.middle_name, user.last_name]
            .filter(Boolean)
            .join(' ') || user.username;

        // Get enrolled subjects count
        const subjectsCount = await db
            .prepare('SELECT COUNT(*) as count FROM subject_students WHERE student_id = ?')
            .bind(userId)
            .first<{ count: number }>();

        // Get overall attendance rate
        const attendanceStats = await db
            .prepare(`
                SELECT 
                    COUNT(*) as total,
                    SUM(CASE WHEN ar.status IN ('present', 'late') THEN 1 ELSE 0 END) as attended
                FROM attendance_records ar
                WHERE ar.student_id = ?
            `)
            .bind(userId)
            .first<{ total: number; attended: number }>();

        const totalAttendance = attendanceStats?.total || 0;
        const attendedCount = attendanceStats?.attended || 0;
        const attendanceRate = totalAttendance > 0
            ? Math.round((attendedCount / totalAttendance) * 100)
            : null;

        return NextResponse.json({
            success: true,
            profile: {
                id: user.id,
                username: user.username,
                email: user.email,
                role: user.role,
                firstName: user.first_name || '',
                middleName: user.middle_name || '',
                lastName: user.last_name || '',
                fullName,
                studentNumber: user.student_number || '',
                department: user.department || '',
                phone: user.phone || '',
                address: user.address || '',
                createdAt: user.created_at,
            },
            stats: {
                enrolledSubjects: subjectsCount?.count || 0,
                attendanceRate,
            }
        });
    } catch (error: any) {
        console.error('Fetch student profile error:', error);
        return NextResponse.json({ error: 'Failed to fetch profile: ' + error.message }, { status: 500 });
    }
}

// PUT - Update student password
export async function PUT(request: NextRequest) {
    try {
        const { db, ctx } = await getDB();
        const body = await request.json();
        const { userId, currentPassword, newPassword } = body;

        if (!userId || !newPassword) {
            return NextResponse.json({ error: 'User ID and new password are required' }, { status: 400 });
        }

        if (newPassword.length < 6) {
            return NextResponse.json({ error: 'Password must be at least 6 characters' }, { status: 400 });
        }

        // Get current user
        const user = await db
            .prepare('SELECT id, password, username FROM users WHERE id = ? AND role = ?')
            .bind(userId, 'student')
            .first<{ id: number; password: string; username: string }>();

        if (!user) {
            return NextResponse.json({ error: 'Student not found' }, { status: 404 });
        }

        // If current password is provided, verify it
        if (currentPassword) {
            const isValidPassword = await compare(currentPassword, user.password);
            if (!isValidPassword) {
                return NextResponse.json({ error: 'Current password is incorrect' }, { status: 400 });
            }
        }

        // Hash new password
        const salt = await genSalt(10);
        const hashedPassword = await hash(newPassword, salt);

        // Update password
        await db
            .prepare('UPDATE users SET password = ?, updated_at = datetime(\'now\') WHERE id = ?')
            .bind(hashedPassword, userId)
            .run();

        // Log activity (non-blocking)
        const logPromise = db
            .prepare('INSERT INTO activity_logs (user_id, action_type, description) VALUES (?, ?, ?)')
            .bind(userId, 'update', `${user.username} (student) changed their password`)
            .run();

        if (ctx.ctx?.waitUntil) {
            ctx.ctx.waitUntil(logPromise);
        }

        return NextResponse.json({ success: true, message: 'Password updated successfully' });
    } catch (error: any) {
        console.error('Update student password error:', error);
        return NextResponse.json({ error: 'Failed to update password: ' + error.message }, { status: 500 });
    }
}