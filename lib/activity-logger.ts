// Helper function to log activities from API routes (server-side)
export async function logActivity(
    user_id: number | null,
    action_type: "login" | "logout" | "submission" | "upload" | "create" | "update" | "delete",
    description: string
) {
    try {
        // Direct database insert for server-side logging
        const pool = (await import("@/lib/db")).default;
        await pool.query(
            `INSERT INTO activity_logs (user_id, action_type, description) VALUES (?, ?, ?)`,
            [user_id, action_type, description]
        )
    } catch (error) {
        console.error("Failed to log activity:", error)
    }
}

// Helper function to log activities from client-side components
export async function logActivityClient(
    user_id: number | null,
    action_type: "login" | "logout" | "submission" | "upload" | "create" | "update" | "delete",
    description:  string
) {
    try {
        await fetch("/api/admin/logs", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ user_id, action_type, description }),
        })
    } catch (error) {
        console.error("Failed to log activity:", error)
    }
}