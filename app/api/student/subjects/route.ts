import { NextRequest, NextResponse } from 'next/server';

async function getDB() {
    const { getCloudflareContext } = await import('@opennextjs/cloudflare');
    const ctx = await getCloudflareContext({ async: true });
    const db = (ctx.env as any)?.DB;
    if (!db) throw new Error('Database not configured');
    return { db, ctx };
}

// GET - Fetch subjects enrolled by a student
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

        // Build query with optional filters
        // Note: SQLite doesn't have GROUP_CONCAT with SEPARATOR, uses group_concat with comma by default
        let sql = `
            SELECT
                sub.id,
                sub.name,
                sub.code,
                sec.id as section_id,
                sec.name as section_name,
                gl.id as grade_level_id,
                gl.name as grade_level_name,
                sem.id as semester_id,
                sem.name as semester_name,
                sy.id as school_year_id,
                sy.year as school_year,
                ss.enrolled_at,
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
                    SELECT COUNT(*) FROM subject_submissions
                    WHERE subject_id = sub.id AND is_visible = 1
                ) as total_submissions,
                (
                    SELECT COUNT(*) FROM student_submissions stu_sub
                                             JOIN subject_submissions sub_sub ON stu_sub.submission_id = sub_sub.id
                    WHERE sub_sub.subject_id = sub.id AND stu_sub.student_id = ss.student_id
                ) as completed_submissions
            FROM subject_students ss
                     JOIN subjects sub ON ss.subject_id = sub.id
                     JOIN sections sec ON sub.section_id = sec.id
                     JOIN grade_levels gl ON sec.grade_level_id = gl.id
                     JOIN semesters sem ON gl.semester_id = sem.id
                     JOIN school_years sy ON sem.school_year_id = sy.id
            WHERE ss.student_id = ?
        `;

        const params: any[] = [studentId];

        if (semester && semester !== 'all') {
            sql += ` AND sem.name = ?`;
            params.push(semester);
        }

        if (year && year !== 'all') {
            sql += ` AND sy.year = ?`;
            params.push(year);
        }

        sql += ` ORDER BY sy.year DESC, sem.name, sub.name`;

        const stmt = db.prepare(sql);
        const subjectsResult = params.length > 0
            ? await stmt.bind(...params).all()
            : await stmt.all();

        // Get unique semesters and years for filters
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

        // Color palette for subjects
        const colors = [
            "from-blue-500 to-blue-600",
            "from-purple-500 to-purple-600",
            "from-green-500 to-green-600",
            "from-orange-500 to-orange-600",
            "from-red-500 to-red-600",
            "from-cyan-500 to-cyan-600",
            "from-pink-500 to-pink-600",
            "from-indigo-500 to-indigo-600",
        ];

        const mappedSubjects = subjectsResult.results.map((subject: any, index: number) => {
            const totalSubmissions = subject.total_submissions || 0;
            const completedSubmissions = subject.completed_submissions || 0;
            const progress = totalSubmissions > 0
                ? Math.round((completedSubmissions / totalSubmissions) * 100)
                : 0;

            return {
                id: subject.id,
                name: subject.name,
                code: subject.code || `SUB-${subject.id}`,
                sectionId: subject.section_id,
                sectionName: subject.section_name,
                gradeLevelId: subject.grade_level_id,
                gradeLevelName: subject.grade_level_name,
                semesterId: subject.semester_id,
                semesterName: subject.semester_name,
                schoolYearId: subject.school_year_id,
                schoolYear: subject.school_year,
                instructors: subject.instructors || 'No instructor assigned',
                enrolledAt: subject.enrolled_at,
                totalSubmissions,
                completedSubmissions,
                progress,
                color: colors[index % colors.length],
            };
        });

        return NextResponse.json({
            success: true,
            subjects: mappedSubjects,
            filters: {
                semesters,
                years,
            },
        });
    } catch (error: any) {
        console.error('Fetch student subjects error:', error);
        return NextResponse.json({ error: 'Failed to fetch subjects: ' + error.message }, { status: 500 });
    }
}