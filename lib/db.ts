import { getCloudflareContext } from "@opennextjs/cloudflare";

/**
 * Get the D1 database from Cloudflare context
 */
export async function getDb(): Promise<D1Database> {
    try {
        const ctx = await getCloudflareContext();
        const env = ctx.env as any;

        if (!env.DB) {
            throw new Error('D1 database binding "DB" not found');
        }

        return env.DB; // Fixed space: env. DB -> env.DB
    } catch (error) {
        console.error('Failed to get D1 database:', error);
        throw new Error('Database connection failed');
    }
}

/**
 * Execute a SELECT query and return multiple rows
 */
export async function query<T = any>(sql: string, params: any[] = []): Promise<T[]> { // Fixed space: params:  any[]
    const db = await getDb();
    const stmt = db.prepare(sql);

    const result = params.length > 0
        ? await stmt.bind(...params).all<T>()
        : await stmt.all<T>();

    return result.results; // Fixed space: result. results -> result.results
}

/**
 * Execute a SELECT query and return a single row
 */
export async function queryOne<T = any>(sql: string, params: any[] = []): Promise<T | null> {
    const db = await getDb();
    const stmt = db.prepare(sql);

    const result = params.length > 0
        ? await stmt.bind(...params).first<T>()
        : await stmt.first<T>();

    return result;
}

/**
 * Execute an INSERT/UPDATE/DELETE query
 */
export async function execute(
    sql: string,
    params: any[] = []
): Promise<{ lastRowId: number; changes: number }> {
    const db = await getDb();
    const stmt = db.prepare(sql);

    const result = params.length > 0
        ? await stmt.bind(...params).run() // Fixed space: ?  await -> ? await
        : await stmt.run();

    return {
        lastRowId: result.meta.last_row_id, // Fixed spaces: result. meta. last_row_id -> result.meta.last_row_id
        changes: result.meta.changes,
    };
}

/**
 * Execute multiple statements in a batch
 */
export async function batch(
    statements: { sql: string; params?: any[] }[] // Fixed space: params?:  any[]
): Promise<D1Result<unknown>[]> {
    const db = await getDb();
    const preparedStatements = statements.map(({ sql, params }) => {
        const stmt = db.prepare(sql);
        return params && params.length > 0 ? stmt.bind(...params) : stmt;
    });

    return db.batch(preparedStatements);
}

export default { getDb, query, queryOne, execute, batch };