import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { RowDataPacket, ResultSetHeader } from 'mysql2';
import { logActivity, getAdminIdFromRequest } from '@/lib/activity-logger';

// GET - Fetch all school years with counts
export async function GET() {
    try {
        const [rows] = await pool.execute<RowDataPacket[]>(`
            SELECT 
                sy.id, 
                sy.year, 
                sy.is_active,
                sy.created_at,
                COUNT(DISTINCT s.id) as semester_count
            FROM school_years sy
            LEFT JOIN semesters s ON sy.id = s.school_year_id
            GROUP BY sy.id
            ORDER BY sy.year DESC
        `);

        return NextResponse.json({ success: true, data: rows });
    } catch (error) {
        console.error('Fetch school years error:', error);
        return NextResponse.json({ error: 'Failed to fetch school years' }, { status: 500 });
    }
}

// POST - Create new school year
export async function POST(request: NextRequest) {
    try {
        const adminId = getAdminIdFromRequest(request);
        const { year } = await request.json();

        if (!year) {
            return NextResponse.json({ error: 'Year is required' }, { status: 400 });
        }

        const [result] = await pool.execute<ResultSetHeader>(
            'INSERT INTO school_years (year) VALUES (?)',
            [year]
        );

        // ✅ Log activity
        await logActivity(
            adminId,
            'create',
            `Created new school year: ${year}`
        );

        return NextResponse.json({
            success: true,
            data: { id: result.insertId, year },
        });
    } catch (error) {
        console.error('Create school year error:', error);
        return NextResponse.json({ error: 'Failed to create school year' }, { status: 500 });
    }
}