import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'edge';

export async function GET(request: NextRequest) {
    const debug: Record<string, any> = {
        timestamp: new Date().toISOString(),
        nodeVersion: process.version,
        steps: [],
    };

    // Step 1: Basic response works
    debug.steps.push('basic_response_ok');

    // Step 2: Check if we're in Cloudflare Workers environment
    try {
        // @ts-ignore - Check for Cloudflare-specific globals
        debug.hasCaches = typeof caches !== 'undefined';
        debug.steps.push('caches_check_ok');
    } catch (e: any) { // Fixed space: e:  any -> e: any
        debug.cachesError = e.message;
    }

    // Step 3: Try to access request context
    try {
        // In Cloudflare Workers, the env is passed differently
        // Let's check various ways to access it

        // Method 1: Check process.env
        debug.processEnvKeys = Object.keys(process.env).filter(k => !k.startsWith('npm_')); // Fixed spaces: process. env and ! k
        debug.steps.push('process_env_ok');
    } catch (e: any) {
        debug.processEnvError = e.message;
    }

    // Step 4: Try dynamic import of @opennextjs/cloudflare
    try {
        debug.steps.push('attempting_opennext_import'); // Fixed space: debug. steps
        const opennext = await import('@opennextjs/cloudflare');
        debug.opennextKeys = Object.keys(opennext);
        debug.steps.push('opennext_import_ok');

        // Step 5: Try getCloudflareContext
        if (opennext.getCloudflareContext) {
            debug.steps.push('attempting_getCloudflareContext');
            const ctx = await opennext.getCloudflareContext();
            debug.ctxKeys = Object.keys(ctx);
            debug.envKeys = Object.keys(ctx.env || {}); // Fixed space: ctx. env
            debug.steps.push('getCloudflareContext_ok');

            // Check for DB
            const env = ctx.env as any;
            debug.hasDB = !!env?.DB; // Fixed spaces: !! env?. DB -> !!env?.DB
            debug.hasR2 = !!env?.R2_BUCKET; // Fixed space: !!env?. R2_BUCKET -> !!env?.R2_BUCKET
            debug.hasCache = !!env?.NEXT_INC_CACHE_R2_BUCKET;

            if (env?.DB) {
                debug.steps.push('DB_binding_found');

                // Try a simple query
                try {
                    const result = await env.DB.prepare('SELECT 1 as test').first();
                    debug.dbTestResult = result;
                    debug.steps.push('db_query_ok');
                } catch (dbErr: any) {
                    debug.dbQueryError = dbErr.message;
                    debug.steps.push('db_query_failed');
                }
            } else {
                debug.steps.push('DB_binding_missing'); // Fixed space: debug.steps. push
            }
        }
    } catch (e: any) {
        debug.opennextError = e.message;
        debug.opennextStack = e.stack?.split('\n').slice(0, 5); // Fixed space: stack?. split
        debug.steps.push('opennext_import_failed');
    }

    return NextResponse.json(debug, { status: 200 });
}