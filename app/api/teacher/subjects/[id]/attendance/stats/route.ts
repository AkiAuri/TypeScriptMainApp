import { NextRequest, NextResponse } from 'next/server';
import { getDb } from "@/lib/db";
import { RowDataPacket } from 'mysql2';

// GET - Fetch attendance statistics for a subject
export async function GET(
    request: NextRequest, // Fixed double space
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const pool = await getDb();
        const subjectId = (await params).id;

        // Get total sessions count
        const [sessionsResult] = await pool.execute<RowDataPacket[]>(`
            SELECT COUNT(*) as totalSessions
            FROM attendance_sessions
            WHERE subject_id = ?
        `, [subjectId]);

        // Get attendance records aggregation - use COALESCE to handle nulls
        const [recordsResult] = await pool.execute<RowDataPacket[]>(`
            SELECT
                COALESCE(SUM(CASE WHEN ar.status = 'present' THEN 1 ELSE 0 END), 0) as totalPresent,
                COALESCE(SUM(CASE WHEN ar.status = 'absent' THEN 1 ELSE 0 END), 0) as totalAbsent,
                COALESCE(SUM(CASE WHEN ar.status = 'late' THEN 1 ELSE 0 END), 0) as totalLate,
                COALESCE(SUM(CASE WHEN ar.status = 'excused' THEN 1 ELSE 0 END), 0) as totalExcused,
                COUNT(*) as totalRecords
            FROM attendance_records ar
                     JOIN attendance_sessions a ON ar.session_id = a.id
            WHERE a.subject_id = ?
        `, [subjectId]); // Fixed trailing space in SQL above

        // Get total students enrolled
        const [studentsResult] = await pool.execute<RowDataPacket[]>(`
            SELECT COUNT(*) as totalStudents
            FROM subject_students
            WHERE subject_id = ?
        `, [subjectId]);

        // Parse values as integers (MySQL might return them as strings or BigInt)
        const totalSessions = parseInt(String(sessionsResult[0]?.totalSessions || 0), 10); // Fixed space: ?. totalSessions -> ?.totalSessions
        const totalPresent = parseInt(String(recordsResult[0]?.totalPresent || 0), 10);
        const totalAbsent = parseInt(String(recordsResult[0]?.totalAbsent || 0), 10);
        const totalLate = parseInt(String(recordsResult[0]?.totalLate || 0), 10);
        const totalRecords = parseInt(String(recordsResult[0]?.totalRecords || 0), 10);
        const totalStudents = parseInt(String(studentsResult[0]?.totalStudents || 0), 10);

        // Calculate average attendance percentage
        // Present + Late count as "attended" (late students were still there)
        let averageAttendance = 0;
        if (totalRecords > 0) {
            averageAttendance = Math.round(((totalPresent + totalLate) / totalRecords) * 100);
        }

        console.log('Attendance stats for subject', subjectId, {
            totalSessions,
            totalPresent,
            totalAbsent,
            totalLate,
            totalRecords,
            totalStudents,
            averageAttendance,
        });

        return NextResponse.json({
            success: true,
            stats: {
                subjectId: parseInt(subjectId, 10),
                totalSessions,
                totalPresent,
                totalAbsent,
                totalLate,
                totalStudents,
                averageAttendance,
            }
        });
    } catch (error) {
        console.error('Fetch attendance stats error:', error);
        return NextResponse.json({ error: 'Failed to fetch attendance stats' }, { status: 500 });
    }
}