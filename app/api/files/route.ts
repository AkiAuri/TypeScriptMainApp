import { NextRequest, NextResponse } from 'next/server';

async function getR2() {
    const { getCloudflareContext } = await import('@opennextjs/cloudflare');
    const ctx = await getCloudflareContext({ async: true });
    const bucket = (ctx.env as any)?.R2_BUCKET;
    if (!bucket) throw new Error('R2 bucket not configured');
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

        console.log('Attempting to serve file:', filePath);

        // Get R2 bucket
        let bucket;
        try {
            const r2 = await getR2();
            bucket = r2.bucket;
        } catch (e: any) {
            console.error('R2 bucket error:', e);
            return NextResponse.json(
                { error: 'Storage not configured', details: e.message },
                { status: 500 }
            );
        }

        // Get the file from R2
        const object = await bucket.get(filePath);

        if (!object) {
            console.log('File not found in R2:', filePath);
            return NextResponse.json(
                { error: 'File not found', path: filePath },
                { status: 404 }
            );
        }

        // Get the file body
        const body = await object.arrayBuffer();

        // Set up response headers
        const headers = new Headers();
        headers.set('Content-Type', object.httpMetadata?.contentType || 'application/octet-stream');
        headers.set('Content-Length', String(object.size));

        // Cache for 1 day
        headers.set('Cache-Control', 'public, max-age=86400');

        // Check if download is requested
        const { searchParams } = new URL(request.url);
        if (searchParams.get('download') === 'true') {
            const originalName = object.customMetadata?.originalName || filePath.split('/').pop() || 'download';
            headers.set('Content-Disposition', `attachment; filename="${originalName}"`);
        } else {
            // For inline viewing (especially images)
            headers.set('Content-Disposition', 'inline');
        }

        return new NextResponse(body, {
            status: 200,
            headers
        });
    } catch (error: any) {
        console.error('File serve error:', error);
        return NextResponse.json(
            { error: 'Failed to serve file', details: error.message },
            { status: 500 }
        );
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

        await bucket.delete(filePath);

        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error('File delete error:', error);
        return NextResponse.json(
            { error: 'Failed to delete file', details: error.message },
            { status: 500 }
        );
    }
}