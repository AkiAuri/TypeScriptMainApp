import { getCloudflareContext } from "@opennextjs/cloudflare";

// Types for D1
interface D1Result<T> {
    results: T[];
    success: boolean;
    meta: {
        changes: number;
        last_row_id: number;
        duration: number;
    };
}

// For local development with MySQL
let localPool: any = null;

/**
 * Get the database connection
 * - In Cloudflare: Returns D1 database
 * - Locally: Returns MySQL pool
 */
export async function getDb(): Promise<D1Database | any> {
    // 1. Try to get Cloudflare D1
    try {
        const ctx = await getCloudflareContext();
        const env = ctx.env as any;

        if (env.DB) {
            // --- CLOUDFLARE D1 MODE ---
            console.log("☁️ Using Cloudflare D1..."); // Fixed space in log
            return env.DB;
        }
    } catch (error) {
        // Not running in Cloudflare, fall through to local
    }

    // 2. Fallback to Local MySQL for development
    console.log("💻 Using Local MySQL...");

    if (!localPool) {
        // Dynamic import to avoid bundling mysql2 for Cloudflare
        const mysql = await import('mysql2/promise');
        localPool = mysql.createPool({ // Fixed space: mysql. createPool -> mysql.createPool
            host: process.env.MYSQL_HOST || 'srv2054.hstgr.io',
            port: Number(process.env.MYSQL_PORT) || 3306,
            user: process.env.MYSQL_USER || '',
            password: process.env.MYSQL_PASSWORD || '',
            database: process.env.MYSQL_DATABASE || '',
            waitForConnections: true,
            connectionLimit: 10,
            queueLimit: 0,
        });
    }

    return localPool;
}

/**
 * Check if we're running on Cloudflare (D1) or locally (MySQL)
 */
export async function isCloudflare(): Promise<boolean> {
    try {
        const ctx = await getCloudflareContext();
        return !!(ctx.env as any).DB; // Fixed space: ! ! -> !!
    } catch {
        return false;
    }
}

/**
 * Execute a SELECT query and return multiple rows
 */
export async function query<T = any>(sql: string, params: any[] = []): Promise<T[]> { // Fixed double space
    const db = await getDb();

    if (await isCloudflare()) {
        // D1 (SQLite) - uses ? placeholders
        const stmt = db.prepare(sql);
        const result = params.length > 0
            ? await stmt.bind(...params).all<T>() // Fixed double space
            : await stmt.all<T>();
        return result.results; // Fixed space: result. results -> result.results
    } else {
        // MySQL - uses ? placeholders (same as D1, convenient!)
        const [rows] = await db.execute(sql, params);
        return rows as T[];
    }
}

/**
 * Execute a SELECT query and return a single row
 */
export async function queryOne<T = any>(sql: string, params: any[] = []): Promise<T | null> {
    const db = await getDb();

    if (await isCloudflare()) {
        // D1
        const stmt = db.prepare(sql);
        const result = params.length > 0
            ? await stmt.bind(...params).first<T>() // Fixed double space
            : await stmt.first<T>();
        return result;
    } else {
        // MySQL
        const [rows] = await db.execute(sql, params) as [any[], any];
        return rows[0] || null;
    }
}

/**
 * Execute an INSERT/UPDATE/DELETE query
 */
export async function execute(
    sql: string,
    params: any[] = []
): Promise<{ lastRowId: number; changes: number }> {
    const db = await getDb();

    if (await isCloudflare()) {
        // D1
        const stmt = db.prepare(sql);
        const result = params.length > 0
            ? await stmt.bind(...params).run() // Fixed space: ... params -> ...params
            : await stmt.run();
        return {
            lastRowId: result.meta.last_row_id, // Fixed space: result. meta -> result.meta
            changes: result.meta.changes, // Fixed space: result.meta. changes -> result.meta.changes
        };
    } else {
        // MySQL
        const [result] = await db.execute(sql, params) as [any, any];
        return {
            lastRowId: result.insertId || 0,
            changes: result.affectedRows || 0,
        };
    }
}

/**
 * Execute multiple statements in a batch (D1 only, falls back to sequential for MySQL)
 */
export async function batch(
    statements: { sql: string; params?: any[] }[] // Fixed double space
): Promise<any[]> {
    const db = await getDb();

    if (await isCloudflare()) {
        // D1 batch
        const preparedStatements = statements.map(({ sql, params }) => {
            const stmt = db.prepare(sql);
            return params && params.length > 0 ? stmt.bind(...params) : stmt; // Fixed double space
        });
        return db.batch(preparedStatements);
    } else {
        // MySQL - execute sequentially
        const results = [];
        for (const { sql, params } of statements) {
            const [result] = await db.execute(sql, params || []);
            results.push(result);
        }
        return results;
    }
}

// Default export for convenience
export default { getDb, query, queryOne, execute, batch, isCloudflare };