import { NextRequest, NextResponse } from 'next/server';

async function getDB() {
    const { getCloudflareContext } = await import('@opennextjs/cloudflare');
    const ctx = await getCloudflareContext({ async: true });
    const db = (ctx.env as any)?.DB;
    if (!db) throw new Error('Database not configured');
    return { db, ctx };
}

interface ProfileRow {
    id: number;
    username: string;
    email: string;
    role: string;
    created_at: string;
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
        const { db } = await getDB();
        const { searchParams } = new URL(request.url);
        const userId = searchParams.get('userId');

        if (!userId) {
            return NextResponse.json(
                { error: 'User ID is required' },
                { status: 400 }
            );
        }

        const user = await db
            .prepare(`
                SELECT
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
                         LEFT JOIN profiles p ON u.id = p.user_id
                WHERE u.id = ?
            `)
            .bind(userId)
            .first<ProfileRow>();

        if (!user) {
            return NextResponse.json(
                { error: 'User not found' },
                { status: 404 }
            );
        }

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
                createdAt: user.created_at,
                profileId: user.profile_id,
                firstName: user.first_name || '',
                middleName: user.middle_name || '',
                lastName: user.last_name || '',
                fullName,
                department: user.department || '',
                employeeId: user.employee_id || '',
                phone: user.phone || '',
                address: user.address || '',
                dateOfBirth: user.date_of_birth || '',
                profilePicture: user.profile_picture || '',
                hasProfile: user.profile_id !== null,
            },
        });
    } catch (error: any) {
        console.error('Profile fetch error:', error);
        return NextResponse.json(
            { error: 'Failed to fetch profile: ' + error.message },
            { status: 500 }
        );
    }
}

// PUT - Update profile
export async function PUT(request: NextRequest) {
    try {
        const { db, ctx } = await getDB();
        const { searchParams } = new URL(request.url);
        const userId = searchParams.get('userId');
        const body = await request.json();

        if (!userId) {
            return NextResponse.json(
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
        const existing = await db
            .prepare('SELECT id FROM profiles WHERE user_id = ?')
            .bind(userId)
            .first();

        if (!existing) {
            // Insert new profile
            await db
                .prepare(`
                    INSERT INTO profiles
                    (user_id, first_name, middle_name, last_name, department, employee_id, phone, address, date_of_birth, created_at, updated_at)
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
        } else {
            // Update existing profile
            await db
                .prepare(`
                    UPDATE profiles SET
                                        first_name = ?,
                                        middle_name = ?,
                                        last_name = ?,
                                        department = ?,
                                        employee_id = ?,
                                        phone = ?,
                                        address = ?,
                                        date_of_birth = ?,
                                        updated_at = datetime('now')
                    WHERE user_id = ?
                `)
                .bind(
                    firstName || null,
                    middleName || null,
                    lastName || null,
                    department || null,
                    employeeId || null,
                    phone || null,
                    address || null,
                    dateOfBirth || null,
                    userId
                )
                .run();
        }

        // Log activity (non-blocking)
        const fullName = [firstName, lastName].filter(Boolean).join(' ') || 'User';
        const logPromise = db
            .prepare('INSERT INTO activity_logs (user_id, action_type, description) VALUES (?, ?, ?)')
            .bind(parseInt(userId, 10), 'update', `Profile updated for ${fullName}`)
            .run();

        if (ctx.ctx?.waitUntil) {
            ctx.ctx.waitUntil(logPromise);
        }

        return NextResponse.json({
            success: true,
            message: 'Profile updated successfully',
        });
    } catch (error: any) {
        console.error('Profile update error:', error);
        return NextResponse.json(
            { error: 'Failed to update profile: ' + error.message },
            { status: 500 }
        );
    }
}