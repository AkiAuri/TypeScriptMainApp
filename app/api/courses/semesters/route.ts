import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { RowDataPacket, ResultSetHeader } from 'mysql2';
import { logActivity, getAdminIdFromRequest } from '@/lib/activity-logger';

// GET - Fetch semesters by school year
export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const schoolYearId = searchParams.get('schoolYearId');

        if (!schoolYearId) {
            return NextResponse.json({ error: 'School year ID is required' }, { status: 400 });
        }

        const [rows] = await pool.execute<RowDataPacket[]>(`
            SELECT
                s.id,
                s.name,
                s.school_year_id,
                s.created_at,
                COUNT(DISTINCT gl.id) as grade_level_count
            FROM semesters s
                     LEFT JOIN grade_levels gl ON s.id = gl.semester_id
            WHERE s.school_year_id = ?
            GROUP BY s.id
            ORDER BY s.created_at ASC
        `, [schoolYearId]);

        return NextResponse.json({ success: true, data: rows });
    } catch (error) {
        console.error('Fetch semesters error:', error);
        return NextResponse. json({ error: 'Failed to fetch semesters' }, { status: 500 });
    }
}

// POST - Create new semester
export async function POST(request: NextRequest) {
    try {
        const adminId = getAdminIdFromRequest(request);
        const { name, schoolYearId } = await request.json();

        if (!name || ! schoolYearId) {
            return NextResponse.json({ error: 'Name and school year ID are required' }, { status: 400 });
        }

        const [result] = await pool. execute<ResultSetHeader>(
            'INSERT INTO semesters (name, school_year_id) VALUES (?, ?)',
            [name, schoolYearId]
        );

        // ✅ Log activity
        await logActivity(
            adminId,
            'create',
            `Created new semester: ${name}`
        );

        return NextResponse.json({
            success: true,
            data: { id: result.insertId, name, school_year_id:  schoolYearId },
        });
    } catch (error) {
        console.error('Create semester error:', error);
        return NextResponse.json({ error: 'Failed to create semester' }, { status: 500 });
    }
}