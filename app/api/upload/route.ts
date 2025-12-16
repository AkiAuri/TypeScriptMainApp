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
        const studentId = formData.get('studentId') as string;
        const submissionId = formData.get('submissionId') as string;

        if (!file) {
            return NextResponse.json({ error: 'No file provided' }, { status: 400 });
        }

        // Validate file size (max 10MB)
        const maxSize = 10 * 1024 * 1024; // 10MB
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
        const { bucket } = await getR2();

        // Generate unique filename
        const timestamp = Date.now();
        const randomStr = Math.random().toString(36).substring(2, 8);
        const ext = file.name.split('.').pop() || '';
        const fileName = `${folder}/${studentId || 'file'}_${submissionId || 'sub'}_${timestamp}_${randomStr}.${ext}`;

        // Upload to R2
        const arrayBuffer = await file.arrayBuffer();
        await bucket.put(fileName, arrayBuffer, {
            httpMetadata: {
                contentType: file.type,
            },
            customMetadata: {
                originalName: file.name,
                uploadedAt: new Date().toISOString(),
            },
        });

        // Generate app-internal URL (best for security/proxying)
        const fileUrl = `/api/files/${fileName}`;

        return NextResponse.json({
            success: true,
            file: {
                name: file.name,
                originalName: file.name,
                fileName: fileName,
                type: file.type,
                size: file.size,
                url: fileUrl,
            }
        });
    } catch (error: any) {
        console.error('File upload error:', error);
        return NextResponse.json({ error: 'Failed to upload file: ' + error.message }, { status: 500 });
    }
}