import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'edge';

export async function GET(request: NextRequest) {
    const debug: any = { // Fixed space: debug:  any -> debug: any
        timestamp: new Date().toISOString(),
        step: 'start',
        errors: [],
    };

    try {
        // Step 1: Try to import getCloudflareContext // Fixed double space
        debug.step = 'importing getCloudflareContext';
        const { getCloudflareContext } = await import('@opennextjs/cloudflare');
        debug.importSuccess = true;

        // Step 2: Get context
        debug.step = 'getting context';
        const ctx = await getCloudflareContext();
        debug.contextSuccess = true;
        debug.envKeys = Object.keys(ctx.env || {});

        // Step 3: Check DB binding
        debug.step = 'checking DB binding';
        const env = ctx.env as any;
        debug.hasDB = !!env.DB;
        debug.hasR2 = !!env.R2_BUCKET;
        debug.hasCache = !!env.NEXT_INC_CACHE_R2_BUCKET;

        if (!env.DB) {
            debug.errors.push('DB binding not found');
            return NextResponse.json(debug, { status: 500 });
        }

        // Step 4: Test query
        debug.step = 'testing query';
        const db = env.DB as D1Database;

        const result = await db
            .prepare('SELECT COUNT(*) as count FROM users')
            .first<{ count: number }>();

        debug.userCount = result?.count || 0; // Fixed space: result?. count -> result?.count
        debug.querySuccess = true;

        // Step 5: Get sample user (without password)
        debug.step = 'getting sample user';
        const users = await db
            .prepare('SELECT id, username, email, role FROM users LIMIT 3')
            .all();

        debug.sampleUsers = users.results; // Fixed space: users. results -> users.results

        debug.step = 'complete';
        debug.success = true;

        return NextResponse.json(debug);

    } catch (error: any) { // Fixed space: error:  any -> error: any
        debug.error = error.message; // Fixed space: error. message -> error.message
        debug.errorStack = error.stack;
        debug.errors.push(error.message);
        return NextResponse.json(debug, { status: 500 });
    }
}