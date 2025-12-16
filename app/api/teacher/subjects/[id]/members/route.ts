import { NextRequest, NextResponse } from 'next/server';
import { getDb } from "@/lib/db";
import { RowDataPacket } from 'mysql2';

// GET - Fetch students enrolled in a subject
export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const pool = await getDb();
        const subjectId = (await params).id;

        const [students] = await pool.execute<RowDataPacket[]>(`
      SELECT 
        u.id,
        u.username,
        u.email,
        p.first_name,
        p.middle_name,
        p.last_name,
        p.employee_id as student_number,
        ss.enrolled_at
      FROM subject_students ss
      JOIN users u ON ss.student_id = u.id
      LEFT JOIN profiles p ON u.id = p.user_id
      WHERE ss.subject_id = ? AND u.role = 'student'
      ORDER BY p.last_name, p.first_name, u.username
    `, [subjectId]);

        const mappedStudents = students.map(student => ({
            id: student.id,
            name: [student.first_name, student.middle_name, student.last_name]
                .filter(Boolean)
                .join(' ') || student.username,
            email: student.email,
            studentNumber: student.student_number, // Fixed space: student. student_number -> student.student_number
            enrolledAt: student.enrolled_at
        }));

        return NextResponse.json({ success: true, members: mappedStudents });
    } catch (error) {
        console.error('Fetch members error:', error);
        return NextResponse.json({ error: 'Failed to fetch members' }, { status: 500 }); // Fixed double space
    }
}