import { NextRequest, NextResponse } from 'next/server';

async function getDB() {
    const { getCloudflareContext } = await import('@opennextjs/cloudflare');
    const ctx = await getCloudflareContext({ async: true });
    const db = (ctx.env as any)?.DB;
    if (!db) throw new Error('Database not configured');
    return { db, ctx };
}

// GET - Fetch grades data for a student
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

        // Get all subjects the student is enrolled in with grade stats
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
                    SELECT group_concat(
                                   COALESCE(p.first_name || ' ', '') || COALESCE(p.last_name, u.username),
                                   ', '
                           )
                    FROM subject_instructors si
                             JOIN users u ON si.instructor_id = u.id
                             LEFT JOIN profiles p ON u.id = p.user_id
                    WHERE si.subject_id = sub.id
                ) as instructors,
                (
                    SELECT COUNT(*)
                    FROM subject_submissions subm
                    WHERE subm.subject_id = sub.id AND subm.is_visible = 1
                ) as total_tasks,
                (
                    SELECT COUNT(*)
                    FROM student_submissions ss
                             JOIN subject_submissions subm ON ss.submission_id = subm.id
                    WHERE subm.subject_id = sub.id AND ss.student_id = ?
                ) as submitted_count,
                (
                    SELECT COUNT(*)
                    FROM student_submissions ss
                             JOIN subject_submissions subm ON ss.submission_id = subm.id
                    WHERE subm.subject_id = sub.id AND ss.student_id = ? AND ss.grade IS NOT NULL
                ) as graded_count,
                (
                    SELECT AVG(ss.grade)
                    FROM student_submissions ss
                             JOIN subject_submissions subm ON ss.submission_id = subm.id
                    WHERE subm.subject_id = sub.id AND ss.student_id = ? AND ss.grade IS NOT NULL
                ) as average_grade,
                (
                    SELECT SUM(ss.grade)
                    FROM student_submissions ss
                             JOIN subject_submissions subm ON ss.submission_id = subm.id
                    WHERE subm.subject_id = sub.id AND ss.student_id = ? AND ss.grade IS NOT NULL
                ) as total_points,
                (
                    SELECT MAX(ss.grade)
                    FROM student_submissions ss
                             JOIN subject_submissions subm ON ss.submission_id = subm.id
                    WHERE subm.subject_id = sub.id AND ss.student_id = ? AND ss.grade IS NOT NULL
                ) as highest_grade,
                (
                    SELECT MIN(ss.grade)
                    FROM student_submissions ss
                             JOIN subject_submissions subm ON ss.submission_id = subm.id
                    WHERE subm.subject_id = sub.id AND ss.student_id = ? AND ss.grade IS NOT NULL
                ) as lowest_grade
            FROM subject_students sst
                     JOIN subjects sub ON sst.subject_id = sub.id
                     JOIN sections sec ON sub.section_id = sec.id
                     JOIN grade_levels gl ON sec.grade_level_id = gl.id
                     JOIN semesters sem ON gl.semester_id = sem.id
                     JOIN school_years sy ON sem.school_year_id = sy.id
            WHERE sst.student_id = ?
        `;

        const params: any[] = [studentId, studentId, studentId, studentId, studentId, studentId, studentId];

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

        // Process subjects
        const subjects = subjectsResult.results.map((sub: any, index: number) => {
            const averageGrade = sub.average_grade ? Math.round(sub.average_grade * 10) / 10 : null;

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
                totalTasks: sub.total_tasks || 0,
                submittedCount: sub.submitted_count || 0,
                gradedCount: sub.graded_count || 0,
                averageGrade,
                totalPoints: sub.total_points || 0,
                highestGrade: sub.highest_grade,
                lowestGrade: sub.lowest_grade,
                possiblePoints: (sub.graded_count || 0) * 100,
            };
        });

        // Calculate overall stats
        const gradedSubjects = subjects.filter((s: any) => s.averageGrade !== null);
        const overallAverage = gradedSubjects.length > 0
            ? Math.round((gradedSubjects.reduce((sum: number, s: any) => sum + s.averageGrade, 0) / gradedSubjects.length) * 10) / 10
            : null;

        const totalTasksAll = subjects.reduce((sum: number, s: any) => sum + s.totalTasks, 0);
        const submittedAll = subjects.reduce((sum: number, s: any) => sum + s.submittedCount, 0);
        const gradedAll = subjects.reduce((sum: number, s: any) => sum + s.gradedCount, 0);
        const pendingAll = submittedAll - gradedAll;

        // Get filter options
        const filterResult = await db
            .prepare(`
                SELECT DISTINCT sem.name as semester_name, sy.year as school_year
                FROM subject_students sst
                         JOIN subjects sub ON sst.subject_id = sub.id
                         JOIN sections sec ON sub.section_id = sec.id
                         JOIN grade_levels gl ON sec.grade_level_id = gl.id
                         JOIN semesters sem ON gl.semester_id = sem.id
                         JOIN school_years sy ON sem.school_year_id = sy.id
                WHERE sst.student_id = ?
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
                averageGrade: overallAverage,
                totalTasks: totalTasksAll,
                submittedCount: submittedAll,
                gradedCount: gradedAll,
                pendingCount: pendingAll,
                subjectsWithGrades: gradedSubjects.length,
                totalSubjects: subjects.length,
            },
            filters: {
                semesters,
                years,
            },
        });
    } catch (error: any) {
        console.error('Fetch student grades error:', error);
        return NextResponse.json({
            error: 'Failed to fetch grades',
            details: error.message
        }, { status: 500 });
    }
}