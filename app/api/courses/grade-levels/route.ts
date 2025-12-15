import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { RowDataPacket, ResultSetHeader } from 'mysql2';
import { logActivity, getAdminIdFromRequest } from '@/lib/activity-logger';

// GET - Fetch grade levels by semester
export async function GET(request:  NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const semesterId = searchParams.get('semesterId');

        if (!semesterId) {
            return NextResponse.json({ error: 'Semester ID is required' }, { status: 400 });
        }

        const [rows] = await pool.execute<RowDataPacket[]>(`
            SELECT
                gl.id,
                gl.name,
                gl.semester_id,
                gl.created_at,
                COUNT(DISTINCT sec.id) as section_count
            FROM grade_levels gl
                     LEFT JOIN sections sec ON gl.id = sec.grade_level_id
            WHERE gl.semester_id = ?
            GROUP BY gl.id
            ORDER BY gl.name ASC
        `, [semesterId]);

        return NextResponse.json({ success: true, data: rows });
    } catch (error) {
        console.error('Fetch grade levels error:', error);
        return NextResponse.json({ error: 'Failed to fetch grade levels' }, { status: 500 });
    }
}

// POST - Create new grade level
export async function POST(request:  NextRequest) {
    try {
        const adminId = getAdminIdFromRequest(request);
        const { name, semesterId } = await request.json();

        if (!name || !semesterId) {
            return NextResponse.json({ error: 'Name and semester ID are required' }, { status: 400 });
        }

        const [result] = await pool.execute<ResultSetHeader>(
            'INSERT INTO grade_levels (name, semester_id) VALUES (?, ?)',
            [name, semesterId]
        );

        // ✅ Log activity
        await logActivity(
            adminId,
            'create',
            `Created new grade level: ${name}`
        );

        return NextResponse.json({
            success: true,
            data: { id: result.insertId, name, semester_id:  semesterId },
        });
    } catch (error) {
        console.error('Create grade level error:', error);
        return NextResponse.json({ error: 'Failed to create grade level' }, { status: 500 });
    }
}