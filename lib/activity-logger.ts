import pool from '@/lib/db';

export type ActionType = 'login' | 'logout' | 'submission' | 'upload' | 'create' | 'update' | 'delete';

/**
 * Log an activity to the database
 * @param adminUserId - The ID of the admin/user performing the action (null for system actions)
 * @param actionType - The type of action being performed
 * @param description - A description of the action
 */
export async function logActivity(
    adminUserId: number | null,
    actionType: ActionType,
    description: string
): Promise<void> {
    try {
        await pool.execute(
            'INSERT INTO activity_logs (user_id, action_type, description) VALUES (?, ?, ?)',
            [adminUserId, actionType, description]
        );
    } catch (error) {
        console.error('Failed to log activity:', error);
        // Don't throw - logging should not break the main operation
    }
}

/**
 * Helper to get admin ID from request headers
 * Frontend should send 'x-admin-id' header with requests
 */
export function getAdminIdFromRequest(request: Request): number | null {
    const adminId = request.headers.get('x-admin-id');
    return adminId ? parseInt(adminId, 10) : null;
}