import { NextResponse } from 'next/server';

export const runtime = 'edge';

export async function GET() {
    return NextResponse.json({
        status: 'ok',
        message: 'API is working',
        timestamp: new Date().toISOString(),
    });
}