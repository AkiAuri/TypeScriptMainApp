import { NextRequest, NextResponse } from 'next/server';

async function getDB() {
    const { getCloudflareContext } = await import('@opennextjs/cloudflare');
    const ctx = await getCloudflareContext({ async: true });
    const db = (ctx.env as any)?.DB;
    if (!db) throw new Error('Database not configured');
    return { db, ctx };
}

// GET - Fetch attendance data for a student
export async function GET(request: NextRequest) {
    try {
        const { db } = await getDB();
        const { searchParams } = new URL(request.url);
        const studentId = searchParams.get('studentId');
        const semester = searchParams.get('semester');
        const year = searchParams.get('year');

        if (!studentId) {
            return NextResponse.json({ error: 'Student ID is required' }, { status: 400 });
        }

        // Get all subjects the student is enrolled in with attendance stats
        let sql = `
            SELECT 
                sub.id,
                sub.name,
                sub.code,
                sec.name as section_name,
                gl.name as grade_level_name,
                sem.name as semester_name,
                sy.year as school_year,
                (
                    SELECT COUNT(*) 
                    FROM attendance_sessions asess 
                    WHERE asess.subject_id = sub.id
                ) as total_sessions,
                (
                    SELECT COUNT(*) 
                    FROM attendance_records ar
                    JOIN attendance_sessions asess ON ar.session_id = asess.id
                    WHERE asess.subject_id = sub.id 
                    AND ar.student_id = ? 
                    AND ar.status = 'present'
                ) as present_count,
                (
                    SELECT COUNT(*) 
                    FROM attendance_records ar
                    JOIN attendance_sessions asess ON ar.session_id = asess.id
                    WHERE asess.subject_id = sub.id 
                    AND ar.student_id = ?
                    AND ar.status = 'late'
                ) as late_count,
                (
                    SELECT COUNT(*) 
                    FROM attendance_records ar
                    JOIN attendance_sessions asess ON ar.session_id = asess.id
                    WHERE asess.subject_id = sub.id 
                    AND ar.student_id = ?
                    AND ar.status = 'absent'
                ) as absent_count,
                (
                    SELECT COUNT(*) 
                    FROM attendance_records ar
                    JOIN attendance_sessions asess ON ar.session_id = asess.id
                    WHERE asess.subject_id = sub.id 
                    AND ar.student_id = ? 
                    AND ar.status = 'excused'
                ) as excused_count,
                (
                    SELECT group_concat(
                        COALESCE(p.first_name || ' ', '') || COALESCE(p.last_name, u.username),
                        ', '
                    )
                    FROM subject_instructors si
                    JOIN users u ON si.instructor_id = u.id
                    LEFT JOIN profiles p ON u.id = p.user_id
                    WHERE si.subject_id = sub.id
                ) as instructors
            FROM subject_students ss
            JOIN subjects sub ON ss.subject_id = sub.id
            JOIN sections sec ON sub.section_id = sec.id
            JOIN grade_levels gl ON sec.grade_level_id = gl.id
            JOIN semesters sem ON gl.semester_id = sem.id
            JOIN school_years sy ON sem.school_year_id = sy.id
            WHERE ss.student_id = ?
        `;

        const params: any[] = [studentId, studentId, studentId, studentId, studentId];

        // Add filters
        if (semester && semester !== 'all') {
            sql += ` AND sem.name = ?`;
            params.push(semester);
        }

        if (year && year !== 'all') {
            sql += ` AND sy.year = ?`;
            params.push(year);
        }

        sql += ` ORDER BY sy.year DESC, sem.name, sub.name`;

        const subjectsResult = await db.prepare(sql).bind(...params).all();

        // Color palette for subjects
        const colors = [
            "#3B82F6", // blue
            "#8B5CF6", // purple
            "#10B981", // green
            "#F59E0B", // yellow
            "#EF4444", // red
            "#06B6D4", // cyan
            "#EC4899", // pink
            "#6366F1", // indigo
        ];

        // Calculate attendance for each subject
        const subjects = subjectsResult.results.map((sub: any, index: number) => {
            const totalSessions = sub.total_sessions || 0;
            const presentCount = sub.present_count || 0;
            const lateCount = sub.late_count || 0;
            const absentCount = sub.absent_count || 0;
            const excusedCount = sub.excused_count || 0;

            // Present + Late counts as "attended"
            const attendedCount = presentCount + lateCount;
            const attendanceRate = totalSessions > 0
                ? Math.round((attendedCount / totalSessions) * 100)
                : 0;

            return {
                id: sub.id,
                name: sub.name,
                code: sub.code || `SUB-${sub.id}`,
                sectionName: sub.section_name,
                gradeLevelName: sub.grade_level_name,
                semesterName: sub.semester_name,
                schoolYear: sub.school_year,
                instructor: sub.instructors || 'No instructor',
                color: colors[index % colors.length],
                attendance: attendanceRate,
                totalSessions,
                presentCount,
                lateCount,
                absentCount,
                excusedCount,
                attendedCount,
            };
        });

        // Calculate overall stats
        const totalSessionsAll = subjects.reduce((sum: number, s: any) => sum + s.totalSessions, 0);
        const totalAttendedAll = subjects.reduce((sum: number, s: any) => sum + s.attendedCount, 0);
        const totalAbsentAll = subjects.reduce((sum: number, s: any) => sum + s.absentCount, 0);
        const totalLateAll = subjects.reduce((sum: number, s: any) => sum + s.lateCount, 0);
        const totalExcusedAll = subjects.reduce((sum: number, s: any) => sum + s.excusedCount, 0);

        const overallAttendance = totalSessionsAll > 0
            ? Math.round((totalAttendedAll / totalSessionsAll) * 100)
            : 0;

        // Get filter options
        const filterResult = await db
            .prepare(`
                SELECT DISTINCT sem.name as semester_name, sy.year as school_year
                FROM subject_students ss
                JOIN subjects sub ON ss.subject_id = sub.id
                JOIN sections sec ON sub.section_id = sec.id
                JOIN grade_levels gl ON sec.grade_level_id = gl.id
                JOIN semesters sem ON gl.semester_id = sem.id
                JOIN school_years sy ON sem.school_year_id = sy.id
                WHERE ss.student_id = ?
                ORDER BY sy.year DESC, sem.name
            `)
            .bind(studentId)
            .all();

        const semesters = [...new Set(filterResult.results.map((f: any) => f.semester_name))];
        const years = [...new Set(filterResult.results.map((f: any) => f.school_year))];

        return NextResponse.json({
            success: true,
            subjects,
            overall: {
                attendanceRate: overallAttendance,
                totalSessions: totalSessionsAll,
                classesAttended: totalAttendedAll,
                classesAbsent: totalAbsentAll,
                classesLate: totalLateAll,
                classesExcused: totalExcusedAll,
            },
            filters: {
                semesters,
                years,
            },
        });
    } catch (error: any) {
        console.error('Fetch student attendance error:', error);
        return NextResponse.json({
            error: 'Failed to fetch attendance',
            details: error.message
        }, { status: 500 });
    }
}