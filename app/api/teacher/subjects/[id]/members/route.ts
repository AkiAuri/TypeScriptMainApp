import { NextRequest, NextResponse } from 'next/server';

async function getDB() {
    const { getCloudflareContext } = await import('@opennextjs/cloudflare');
    const ctx = await getCloudflareContext({ async: true });
    const db = (ctx.env as any)?.DB;
    if (!db) throw new Error('Database not configured');
    return { db, ctx };
}

// GET - Fetch students enrolled in a subject
export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { db } = await getDB();
        const { id: subjectId } = await params;

        const studentsResult = await db
            .prepare(`
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
            `)
            .bind(subjectId)
            .all();

        const mappedStudents = studentsResult.results.map((student: any) => ({
            id: student.id,
            name: [student.first_name, student.middle_name, student.last_name]
                .filter(Boolean)
                .join(' ') || student.username,
            email: student.email,
            studentNumber: student.student_number,
            enrolledAt: student.enrolled_at
        }));

        return NextResponse.json({ success: true, members: mappedStudents });
    } catch (error: any) {
        console.error('Fetch members error:', error);
        return NextResponse.json({ error: 'Failed to fetch members: ' + error.message }, { status: 500 });
    }
}