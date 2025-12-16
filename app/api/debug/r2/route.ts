import { NextRequest, NextResponse } from 'next/server';

// GET - Debug R2 configuration and list files
export async function GET(request: NextRequest) {
    const debug: Record<string, any> = {
        timestamp: new Date().toISOString(),
        endpoint: '/api/debug/r2',
    };

    try {
        // Get Cloudflare context
        const { getCloudflareContext } = await import('@opennextjs/cloudflare');
        const ctx = await getCloudflareContext({ async: true });

        debug.hasContext = !!ctx;
        debug.hasEnv = !!ctx?.env;
        debug.envBindings = ctx?.env ? Object.keys(ctx.env) : [];

        // Check R2 bucket
        const bucket = (ctx?.env as any)?.R2_BUCKET;
        debug.hasR2Bucket = !!bucket;

        if (bucket) {
            // List files in R2
            const { searchParams } = new URL(request.url);
            const prefix = searchParams.get('prefix') || '';
            const limit = parseInt(searchParams.get('limit') || '20');

            const listed = await bucket.list({
                prefix: prefix,
                limit: limit
            });

            debug.r2Status = 'connected';
            debug.totalFiles = listed.objects?.length || 0;
            debug.truncated = listed.truncated;
            debug.files = listed.objects?.map((obj: any) => ({
                key: obj.key,
                size: obj.size,
                uploaded: obj.uploaded,
                url: `/api/files/${obj.key}`,
            })) || [];
        } else {
            debug.r2Status = 'not_configured';
            debug.hint = 'Add [[r2_buckets]] binding in wrangler.toml with binding = "R2_BUCKET"';
        }

        return NextResponse.json(debug);
    } catch (error: any) {
        debug.error = error.message;
        debug.stack = error.stack?.split('\n').slice(0, 3);
        return NextResponse.json(debug, { status: 500 });
    }
}