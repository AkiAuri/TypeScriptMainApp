import { NextRequest, NextResponse } from 'next/server';

async function getR2() {
    const { getCloudflareContext } = await import('@opennextjs/cloudflare');
    const ctx = await getCloudflareContext({ async: true });
    const bucket = (ctx.env as any)?.R2_BUCKET;
    return { bucket, ctx };
}

// GET - Serve file from R2
export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ path: string[] }> }
) {
    try {
        const { path } = await params;
        const filePath = path.join('/');

        console.log('Serving file:', filePath);

        // Get R2 bucket
        const { bucket } = await getR2();

        if (!bucket) {
            return NextResponse.json({
                error: 'R2 storage not configured',
                hint: 'Add R2_BUCKET binding in wrangler.toml',
                requestedPath: filePath
            }, { status: 500 });
        }

        // Get file from R2
        const object = await bucket.get(filePath);

        if (!object) {
            return NextResponse.json({
                error: 'File not found',
                path: filePath
            }, { status: 404 });
        }

        // Get file content
        const body = await object.arrayBuffer();

        // Set headers
        const headers = new Headers();
        headers.set('Content-Type', object.httpMetadata?.contentType || 'application/octet-stream');
        headers.set('Content-Length', String(object.size));
        headers.set('Cache-Control', 'public, max-age=86400');

        // Download or inline viewing
        const { searchParams } = new URL(request.url);
        const download = searchParams.get('download') === 'true';

        if (download) {
            const fileName = object.customMetadata?.originalName || filePath.split('/').pop() || 'download';
            headers.set('Content-Disposition', `attachment; filename="${fileName}"`);
        } else {
            headers.set('Content-Disposition', 'inline');
        }

        return new NextResponse(body, { status: 200, headers });
    } catch (error: any) {
        console.error('File serve error:', error);
        return NextResponse.json({
            error: 'Failed to serve file',
            details: error.message
        }, { status: 500 });
    }
}

// DELETE - Delete file from R2
export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ path: string[] }> }
) {
    try {
        const { bucket } = await getR2();
        const { path } = await params;
        const filePath = path.join('/');

        if (!bucket) {
            return NextResponse.json({ error: 'R2 storage not configured' }, { status: 500 });
        }

        await bucket.delete(filePath);

        return NextResponse.json({ success: true, deleted: filePath });
    } catch (error: any) {
        console.error('File delete error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}