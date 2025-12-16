import { NextRequest, NextResponse } from 'next/server';

async function getR2() {
    const { getCloudflareContext } = await import('@opennextjs/cloudflare');
    const ctx = await getCloudflareContext({ async: true });
    const bucket = (ctx.env as any)?.R2_BUCKET;
    if (!bucket) throw new Error('R2 bucket not configured');
    return { bucket, ctx };
}

// POST - Upload file to R2
export async function POST(request: NextRequest) {
    try {
        const formData = await request.formData();
        const file = formData.get('file') as File | null;
        const folder = formData.get('folder') as string || 'uploads';
        const studentId = formData.get('studentId') as string || 'unknown';
        const submissionId = formData.get('submissionId') as string || 'unknown';

        if (!file) {
            return NextResponse.json({ error: 'No file provided' }, { status: 400 });
        }

        // Validate file size (max 10MB)
        const maxSize = 10 * 1024 * 1024;
        if (file.size > maxSize) {
            return NextResponse.json({ error: 'File size exceeds 10MB limit' }, { status: 400 });
        }

        // Allowed file types
        const allowedTypes = [
            'application/pdf',
            'application/msword',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'application/vnd.ms-excel',
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'application/vnd.ms-powerpoint',
            'application/vnd.openxmlformats-officedocument.presentationml.presentation',
            'text/plain',
            'image/jpeg',
            'image/png',
            'image/gif',
            'image/webp',
            'application/zip',
            'application/x-rar-compressed',
        ];

        if (!allowedTypes.includes(file.type)) {
            return NextResponse.json({
                error: 'File type not allowed. Allowed: PDF, DOC, DOCX, XLS, XLSX, PPT, PPTX, TXT, Images, ZIP, RAR'
            }, { status: 400 });
        }

        // Get R2 bucket
        let bucket;
        try {
            const r2 = await getR2();
            bucket = r2.bucket;
        } catch (e: any) {
            console.error('R2 not available:', e);
            return NextResponse.json(
                { error: 'File storage not configured', details: e.message },
                { status: 500 }
            );
        }

        // Generate unique filename
        const timestamp = Date.now();
        const randomStr = Math.random().toString(36).substring(2, 8);
        const ext = file.name.split('.').pop() || 'bin';

        // File path in R2: folder/studentId_submissionId_timestamp_random.ext
        const fileName = `${studentId}_${submissionId}_${timestamp}_${randomStr}.${ext}`;
        const filePath = `${folder}/${fileName}`;

        console.log('Uploading file to R2:', filePath);

        // Upload to R2
        const arrayBuffer = await file.arrayBuffer();
        await bucket.put(filePath, arrayBuffer, {
            httpMetadata: {
                contentType: file.type,
            },
            customMetadata: {
                originalName: file.name,
                uploadedAt: new Date().toISOString(),
                studentId: studentId,
                submissionId: submissionId,
            },
        });

        // Generate URL that points to our file serving API
        const fileUrl = `/api/files/${filePath}`;

        console.log('File uploaded successfully:', fileUrl);

        return NextResponse.json({
            success: true,
            file: {
                name: file.name,
                originalName: file.name,
                fileName: fileName,
                type: file.type,
                size: file.size,
                url: fileUrl,
                path: filePath,
            }
        });
    } catch (error: any) {
        console.error('File upload error:', error);
        return NextResponse.json(
            { error: 'Failed to upload file', details: error.message },
            { status: 500 }
        );
    }
}