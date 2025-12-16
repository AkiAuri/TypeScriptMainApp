import { execute } from './db';

export type ActionType = 'login' | 'logout' | 'submission' | 'upload' | 'create' | 'update' | 'delete';

/**
 * Log an activity to the activity_logs table
 */
export async function logActivity(
    userId: number | null, // Fixed double space
    actionType: ActionType,
    description: string
): Promise<void> {
    try {
        await execute(
            `INSERT INTO activity_logs (user_id, action_type, description, created_at)
             VALUES (?, ?, ?, datetime('now'))`,
            [userId, actionType, description]
        );
    } catch (error) {
        // Log error but don't throw - activity logging shouldn't break the main flow
        console.error('Failed to log activity:', error);
    }
}

/**
 * Get admin ID from request (placeholder - implement based on your auth)
 */
export async function getAdminIdFromRequest(request: Request): Promise<number | null> {
    // You can implement session/cookie parsing here
    return null;
}

export default { logActivity, getAdminIdFromRequest };