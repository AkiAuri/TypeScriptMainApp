import { NextRequest, NextResponse } from 'next/server';

async function getDB() {
    const { getCloudflareContext } = await import('@opennextjs/cloudflare');
    const ctx = await getCloudflareContext({ async: true });
    const db = (ctx.env as any)?.DB;
    if (!db) throw new Error('Database not configured');
    return { db, ctx };
}

// Generate random hex token (Edge-compatible)
function generateToken(length: number = 32): string {
    const array = new Uint8Array(length);
    crypto.getRandomValues(array);
    return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
}

// POST - Generate QR token for a session
export async function POST(request: NextRequest) {
    try {
        const { db } = await getDB();
        const body = await request.json();
        const { sessionId, subjectId, expiresInMinutes = 60, lateAfterMinutes = 15 } = body;

        if (!sessionId || !subjectId) {
            return NextResponse.json({ error: 'Session ID and Subject ID are required' }, { status: 400 });
        }

        // Generate unique token
        const qrToken = generateToken(32);
        const expiresAt = new Date(Date.now() + expiresInMinutes * 60 * 1000);

        // Update session with QR token
        await db
            .prepare(`
                UPDATE attendance_sessions 
                SET qr_token = ?, qr_expires_at = ?, allow_late_after_minutes = ?
                WHERE id = ? AND subject_id = ?
            `)
            .bind(qrToken, expiresAt.toISOString(), lateAfterMinutes, sessionId, subjectId)
            .run();

        // Build QR URL - this will be scanned by students
        const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
        const qrUrl = `${baseUrl}/attendance/scan?token=${qrToken}`;

        return NextResponse.json({
            success: true,
            qrToken,
            qrUrl,
            expiresAt: expiresAt.toISOString(),
            lateAfterMinutes,
        });
    } catch (error: any) {
        console.error('Generate QR token error:', error);
        return NextResponse.json({ error: 'Failed to generate QR token: ' + error.message }, { status: 500 });
    }
}

// GET - Validate QR token and get session info (for students)
export async function GET(request: NextRequest) {
    try {
        const { db } = await getDB();
        const { searchParams } = new URL(request.url);
        const token = searchParams.get('token');

        if (!token) {
            return NextResponse.json({ error: 'Token is required' }, { status: 400 });
        }

        // Find session by token
        const session = await db
            .prepare(`
                SELECT 
                    a.id as session_id,
                    a.subject_id,
                    a.session_date,
                    a.session_time,
                    a.qr_expires_at,
                    a.allow_late_after_minutes,
                    a.created_at as session_created_at,
                    sub.name as subject_name,
                    sub.code as subject_code,
                    sec.name as section_name,
                    gl.name as grade_level_name
                FROM attendance_sessions a
                JOIN subjects sub ON a.subject_id = sub.id
                JOIN sections sec ON sub.section_id = sec.id
                JOIN grade_levels gl ON sec.grade_level_id = gl.id
                WHERE a.qr_token = ?
            `)
            .bind(token)
            .first<{
                session_id: number;
                subject_id: number;
                session_date: string;
                session_time: string;
                qr_expires_at: string;
                allow_late_after_minutes: number;
                session_created_at: string;
                subject_name: string;
                subject_code: string;
                section_name: string;
                grade_level_name: string;
            }>();

        if (!session) {
            return NextResponse.json({ error: 'Invalid or expired QR code' }, { status: 404 });
        }

        // Check if token is expired
        if (session.qr_expires_at && new Date(session.qr_expires_at) < new Date()) {
            return NextResponse.json({ error: 'This QR code has expired' }, { status: 410 });
        }

        // Calculate if student would be marked as late
        const sessionStart = new Date(`${session.session_date}T${session.session_time || '00:00:00'}`);
        const lateThreshold = new Date(sessionStart.getTime() + (session.allow_late_after_minutes || 15) * 60 * 1000);
        const isLate = new Date() > lateThreshold;

        return NextResponse.json({
            success: true,
            session: {
                id: session.session_id,
                subjectId: session.subject_id,
                subjectName: session.subject_name,
                subjectCode: session.subject_code,
                sectionName: session.section_name,
                gradeLevelName: session.grade_level_name,
                date: session.session_date,
                time: session.session_time,
            },
            willBeMarkedAs: isLate ? 'late' : 'present',
            expiresAt: session.qr_expires_at,
        });
    } catch (error: any) {
        console.error('Validate QR token error:', error);
        return NextResponse.json({ error: 'Failed to validate QR token: ' + error.message }, { status: 500 });
    }
}

// PUT - Mark student attendance via QR scan
export async function PUT(request: NextRequest) {
    try {
        const { db } = await getDB();
        const body = await request.json();
        const { token, studentId } = body;

        if (!token || !studentId) {
            return NextResponse.json({ error: 'Token and Student ID are required' }, { status: 400 });
        }

        // Find session by token
        const session = await db
            .prepare(`
                SELECT 
                    a.id as session_id,
                    a.subject_id,
                    a.session_date,
                    a.session_time,
                    a.qr_expires_at,
                    a.allow_late_after_minutes,
                    a.created_at as session_created_at
                FROM attendance_sessions a
                WHERE a.qr_token = ?
            `)
            .bind(token)
            .first<{
                session_id: number;
                subject_id: number;
                session_date: string;
                session_time: string;
                qr_expires_at: string;
                allow_late_after_minutes: number;
                session_created_at: string;
            }>();

        if (!session) {
            return NextResponse.json({ error: 'Invalid QR code' }, { status: 404 });
        }

        // Check if token is expired
        if (session.qr_expires_at && new Date(session.qr_expires_at) < new Date()) {
            return NextResponse.json({ error: 'This QR code has expired' }, { status: 410 });
        }

        // Check if student is enrolled in the subject
        const enrollment = await db
            .prepare('SELECT id FROM subject_students WHERE subject_id = ? AND student_id = ?')
            .bind(session.subject_id, studentId)
            .first();

        if (!enrollment) {
            return NextResponse.json({ error: 'You are not enrolled in this subject' }, { status: 403 });
        }

        // Calculate status (present or late)
        const sessionStart = new Date(`${session.session_date}T${session.session_time || '00:00:00'}`);
        const lateThreshold = new Date(sessionStart.getTime() + (session.allow_late_after_minutes || 15) * 60 * 1000);
        const status = new Date() > lateThreshold ? 'late' : 'present';

        // Check if already marked
        const existing = await db
            .prepare('SELECT id, status FROM attendance_records WHERE session_id = ? AND student_id = ?')
            .bind(session.session_id, studentId)
            .first<{ id: number; status: string }>();

        if (existing) {
            // Already marked - check if it was via QR (present/late) or manual
            if (existing.status === 'present' || existing.status === 'late') {
                return NextResponse.json({
                    success: true,
                    message: 'You have already marked your attendance',
                    status: existing.status,
                    alreadyMarked: true
                });
            }

            // Update from absent to present/late
            await db
                .prepare('UPDATE attendance_records SET status = ?, updated_at = datetime(\'now\') WHERE session_id = ? AND student_id = ?')
                .bind(status, session.session_id, studentId)
                .run();
        } else {
            // Insert new record
            await db
                .prepare('INSERT INTO attendance_records (session_id, student_id, status) VALUES (?, ?, ?)')
                .bind(session.session_id, studentId, status)
                .run();
        }

        return NextResponse.json({
            success: true,
            message: `You have been marked as ${status}`,
            status,
            sessionId: session.session_id,
        });
    } catch (error: any) {
        console.error('Mark QR attendance error:', error);
        return NextResponse.json({ error: 'Failed to mark attendance: ' + error.message }, { status: 500 });
    }
}