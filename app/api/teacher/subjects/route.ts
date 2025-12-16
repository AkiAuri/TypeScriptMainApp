import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

export const runtime = 'edge';

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const teacherId = searchParams.get('teacherId');
        const semester = searchParams.get('semester');
        const year = searchParams.get('year');

        if (!teacherId) {
            return NextResponse.json({ error: 'Teacher ID is required' }, { status: 400 });
        }

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
        (SELECT COUNT(*) FROM subject_students WHERE subject_id = sub.id) as student_count
      FROM subject_instructors si
      JOIN subjects sub ON si.subject_id = sub.id
      JOIN sections sec ON sub.section_id = sec.id
      JOIN grade_levels gl ON sec.grade_level_id = gl.id
      JOIN semesters sem ON gl.semester_id = sem.id
      JOIN school_years sy ON sem.school_year_id = sy.id
      WHERE si.instructor_id = ?
    `; // Fixed spaces in SQL: sub. id -> sub.id and gl. semester_id -> gl.semester_id

        const params: any[] = [teacherId];

        if (semester && semester !== 'all') {
            sql += ` AND sem.name = ?`;
            params.push(semester);
        }

        if (year && year !== 'all') {
            sql += ` AND sy.year = ?`;
            params.push(year);
        }

        sql += ` ORDER BY sy.year DESC, sem.name, sub.name`;

        const subjects = await query(sql, params);

        // Get filters
        const filterData = await query(`
      SELECT DISTINCT sem.name as semester_name, sy.year as school_year
      FROM subject_instructors si
      JOIN subjects sub ON si.subject_id = sub.id
      JOIN sections sec ON sub.section_id = sec.id
      JOIN grade_levels gl ON sec.grade_level_id = gl.id
      JOIN semesters sem ON gl.semester_id = sem.id
      JOIN school_years sy ON sem.school_year_id = sy.id
      WHERE si.instructor_id = ?
      ORDER BY sy.year DESC, sem.name
    `, [teacherId]); // Fixed spaces in SQL: sem. school_year_id -> sem.school_year_id and sy. id -> sy.id

        const semesters = [...new Set(filterData.map((f: any) => f.semester_name))]; // Fixed space: ... new -> ...new
        const years = [...new Set(filterData.map((f: any) => f.school_year))]; // Fixed space: filterData. map -> filterData.map

        const colors = [
            "from-blue-500 to-blue-600",
            "from-purple-500 to-purple-600",
            "from-green-500 to-green-600",
            "from-orange-500 to-orange-600",
            "from-red-500 to-red-600",
            "from-cyan-500 to-cyan-600",
        ];

        const mappedSubjects = subjects.map((subject: any, index: number) => ({
            id: subject.id,
            name: subject.name,
            code: subject.code || `SUB-${subject.id}`,
            sectionId: subject.section_id,
            sectionName: subject.section_name, // Fixed space: subject. section_name -> subject.section_name
            gradeLevelId: subject.grade_level_id,
            gradeLevelName: subject.grade_level_name,
            semesterId: subject.semester_id,
            semesterName: subject.semester_name,
            schoolYearId: subject.school_year_id,
            schoolYear: subject.school_year,
            studentCount: subject.student_count || 0,
            color: colors[index % colors.length],
        }));

        return NextResponse.json({
            success: true,
            subjects: mappedSubjects,
            filters: { semesters, years },
        });
    } catch (error) {
        console.error('Fetch teacher subjects error:', error);
        return NextResponse.json({ error: 'Failed to fetch subjects' }, { status: 500 });
    }
}