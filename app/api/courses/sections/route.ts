import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { RowDataPacket, ResultSetHeader } from 'mysql2';
import { logActivity, getAdminIdFromRequest } from '@/lib/activity-logger';

// GET - Fetch sections by grade level
export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const gradeLevelId = searchParams.get('gradeLevelId');

        if (!gradeLevelId) {
            return NextResponse.json({ error: 'Grade level ID is required' }, { status: 400 });
        }

        const [rows] = await pool.execute<RowDataPacket[]>(`
            SELECT
                sec.id,
                sec.name,
                sec.grade_level_id,
                sec.created_at,
                COUNT(DISTINCT sub.id) as subject_count
            FROM sections sec
                     LEFT JOIN subjects sub ON sec.id = sub.section_id
            WHERE sec.grade_level_id = ?
            GROUP BY sec.id
            ORDER BY sec.name ASC
        `, [gradeLevelId]);

        return NextResponse.json({ success: true, data: rows });
    } catch (error) {
        console.error('Fetch sections error:', error);
        return NextResponse. json({ error: 'Failed to fetch sections' }, { status: 500 });
    }
}

// POST - Create new section
export async function POST(request: NextRequest) {
    try {
        const adminId = getAdminIdFromRequest(request);
        const { name, gradeLevelId } = await request.json();

        if (!name || !gradeLevelId) {
            return NextResponse.json({ error: 'Name and grade level ID are required' }, { status: 400 });
        }

        // Get grade level name for logging
        const [gradeLevel] = await pool.execute<RowDataPacket[]>(
            'SELECT name FROM grade_levels WHERE id = ?',
            [gradeLevelId]
        );
        const gradeLevelName = gradeLevel[0]?.name || 'Unknown';

        const [result] = await pool.execute<ResultSetHeader>(
            'INSERT INTO sections (name, grade_level_id) VALUES (?, ?)',
            [name, gradeLevelId]
        );

        // ✅ Log activity
        await logActivity(
            adminId,
            'create',
            `Created new section: ${name} in ${gradeLevelName}`
        );

        return NextResponse.json({
            success: true,
            data: { id: result.insertId, name, grade_level_id: gradeLevelId },
        });
    } catch (error) {
        console.error('Create section error:', error);
        return NextResponse.json({ error: 'Failed to create section' }, { status: 500 });
    }
}