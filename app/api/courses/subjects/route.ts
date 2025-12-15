import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { RowDataPacket, ResultSetHeader } from 'mysql2';
import { logActivity, getAdminIdFromRequest } from '@/lib/activity-logger';

// GET - Fetch subjects by section
export async function GET(request:  NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const sectionId = searchParams.get('sectionId');

        if (!sectionId) {
            return NextResponse.json({ error: 'Section ID is required' }, { status: 400 });
        }

        const [subjects] = await pool.execute<RowDataPacket[]>(`
            SELECT
                sub.id,
                sub.name,
                sub.code,
                sub.section_id,
                sub.created_at,
                COUNT(DISTINCT si.instructor_id) as instructor_count,
                COUNT(DISTINCT ss.student_id) as student_count
            FROM subjects sub
                     LEFT JOIN subject_instructors si ON sub.id = si.subject_id
                     LEFT JOIN subject_students ss ON sub.id = ss.subject_id
            WHERE sub.section_id = ?
            GROUP BY sub.id
            ORDER BY sub.name ASC
        `, [sectionId]);

        return NextResponse.json({ success: true, data: subjects });
    } catch (error) {
        console.error('Fetch subjects error:', error);
        return NextResponse.json({ error: 'Failed to fetch subjects' }, { status: 500 });
    }
}

// POST - Create new subject
export async function POST(request: NextRequest) {
    try {
        const adminId = getAdminIdFromRequest(request);
        const { name, code, sectionId } = await request.json();

        if (!name || !sectionId) {
            return NextResponse.json({ error: 'Name and section ID are required' }, { status: 400 });
        }

        // Get section name for logging
        const [section] = await pool.execute<RowDataPacket[]>(
            'SELECT name FROM sections WHERE id = ?',
            [sectionId]
        );
        const sectionName = section[0]?. name || 'Unknown';

        const [result] = await pool.execute<ResultSetHeader>(
            'INSERT INTO subjects (name, code, section_id) VALUES (?, ?, ?)',
            [name, code || null, sectionId]
        );

        // ✅ Log activity
        await logActivity(
            adminId,
            'create',
            `Created new subject: ${name}${code ? ` (${code})` : ''} in ${sectionName}`
        );

        return NextResponse.json({
            success: true,
            data: { id: result. insertId, name, code, section_id: sectionId },
        });
    } catch (error) {
        console.error('Create subject error:', error);
        return NextResponse.json({ error: 'Failed to create subject' }, { status: 500 });
    }
}