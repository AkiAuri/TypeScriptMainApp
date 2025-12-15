import { NextRequest, NextResponse } from "next/server"
import pool from "@/lib/db"
import { RowDataPacket } from "mysql2"

interface ActivityLog extends RowDataPacket {
    id: number
    user_id: number | null
    action_type: string
    description: string | null
    created_at: string
    username:  string | null
    first_name: string | null
    last_name: string | null
}

export async function GET(request:  NextRequest) {
    try {
        const { searchParams } = new URL(request.url)
        const limit = searchParams.get("limit") || "50"
        const actionType = searchParams.get("action_type")

        let query = `
      SELECT 
        al.id,
        al.user_id,
        al.action_type,
        al.description,
        al.created_at,
        u.username,
        p.first_name,
        p.last_name
      FROM activity_logs al
      LEFT JOIN users u ON al.user_id = u.id
      LEFT JOIN profiles p ON u.id = p.user_id
    `

        const params:  (string | number)[] = []

        if (actionType) {
            query += ` WHERE al.action_type = ? `
            params.push(actionType)
        }

        query += ` ORDER BY al.created_at DESC LIMIT ?`
        params.push(parseInt(limit))

        const [rows] = await pool.query<ActivityLog[]>(query, params)

        const logs = rows.map((row) => ({
            id: row. id,
            user_id:  row.user_id,
            action_type: row.action_type,
            description: row. description,
            created_at:  row.created_at,
            username: row.username,
            full_name: row.first_name && row.last_name
                ? `${row.first_name} ${row.last_name}`
                : row.username || "System",
        }))

        return NextResponse.json(logs)
    } catch (error) {
        console.error("Error fetching activity logs:", error)
        return NextResponse.json(
            { error: "Failed to fetch activity logs" },
            { status: 500 }
        )
    }
}

export async function POST(request: NextRequest) {
    try {
        const body = await request.json()
        const { user_id, action_type, description } = body

        if (!action_type) {
            return NextResponse.json(
                { error: "action_type is required" },
                { status: 400 }
            )
        }

        const [result] = await pool.query(
            `INSERT INTO activity_logs (user_id, action_type, description) VALUES (?, ?, ?)`,
            [user_id || null, action_type, description || null]
        )

        return NextResponse.json(
            { message: "Activity logged successfully", result },
            { status: 201 }
        )
    } catch (error) {
        console.error("Error creating activity log:", error)
        return NextResponse.json(
            { error: "Failed to create activity log" },
            { status: 500 }
        )
    }
}