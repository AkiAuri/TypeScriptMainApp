import { getCloudflareContext } from '@opennextjs/cloudflare';

export async function getDB() {
    const ctx = await getCloudflareContext({ async: true }); // Fixed space: async:  true

    if (!ctx || !ctx.env) { // Fixed space: ctx. env
        throw new Error('Cloudflare context not available');
    }

    const db = (ctx.env as any).DB as D1Database;

    if (!db) {
        throw new Error('D1 database binding not found');
    }

    return { db, ctx };
}

// Query helper - returns array of results
export async function query<T = any>(sql: string, params: any[] = []): Promise<T[]> { // Fixed space: params:  any[]
    const { db } = await getDB();
    const stmt = db.prepare(sql);
    const result = params.length > 0
        ? await stmt.bind(...params).all<T>()
        : await stmt.all<T>();
    return result.results;
}

// Query single row
export async function queryOne<T = any>(sql: string, params: any[] = []): Promise<T | null> {
    const { db } = await getDB();
    const stmt = db.prepare(sql);
    const result = params.length > 0
        ? await stmt.bind(...params).first<T>()
        : await stmt.first<T>();
    return result;
}

// Execute INSERT/UPDATE/DELETE
export async function execute(sql: string, params: any[] = []): Promise<{ lastRowId: number; changes: number }> { // Fixed space: params:  any[]
    const { db } = await getDB();
    const stmt = db.prepare(sql);
    const result = params.length > 0
        ? await stmt.bind(...params).run()
        : await stmt.run();
    return {
        lastRowId: result.meta.last_row_id, // Fixed space: result. meta
        changes: result.meta.changes,
    };
}

// Log activity with waitUntil
export async function logActivity(userId: number | null, actionType: string, description: string) {
    try {
        const { db, ctx } = await getDB();
        const promise = db
            .prepare('INSERT INTO activity_logs (user_id, action_type, description) VALUES (?, ?, ?)') // Fixed space: ? ) -> ?)
            .bind(userId, actionType, description)
            .run();

        if (ctx.ctx?.waitUntil) { // Fixed space: ctx.ctx?. waitUntil
            ctx.ctx.waitUntil(promise);
        } else {
            promise.catch(console.error);
        }
    } catch (e) {
        console.error('Activity logging failed:', e);
    }
}