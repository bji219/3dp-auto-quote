import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';
import { prisma } from '@/lib/prisma';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET /api/files/[fileId]
 * Serve uploaded files from storage (handles /tmp on serverless)
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { fileId: string } }
) {
  try {
    const { fileId } = params;

    if (!fileId) {
      return new NextResponse('File ID required', { status: 400 });
    }

    // Look up file in database
    const fileRecord = await prisma.fileUpload.findFirst({
      where: { fileId },
    });

    if (!fileRecord) {
      return new NextResponse('File not found', { status: 404 });
    }

    // Determine storage base path
    const isServerless = process.env.NETLIFY || process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME;
    const basePath = isServerless
      ? '/tmp/uploads'
      : path.join(process.cwd(), 'public', 'uploads');

    // Construct full file path
    const storagePath = fileRecord.filePath || `${fileId}.stl`;
    const fullPath = path.join(basePath, storagePath);

    // Read file from storage
    let fileBuffer: Buffer;
    try {
      fileBuffer = await fs.readFile(fullPath);
    } catch (error) {
      console.error('File not found in storage:', { fullPath, error });
      return new NextResponse('File not found in storage', { status: 404 });
    }

    // Update last accessed time
    await prisma.fileUpload.update({
      where: { id: fileRecord.id },
      data: { lastAccessedAt: new Date() },
    });

    // Return file with appropriate headers
    return new NextResponse(fileBuffer as unknown as BodyInit, {
      status: 200,
      headers: {
        'Content-Type': fileRecord.mimeType || 'application/octet-stream',
        'Content-Length': fileBuffer.length.toString(),
        'Content-Disposition': `inline; filename="${fileRecord.fileName}"`,
        'Cache-Control': 'public, max-age=3600', // Cache for 1 hour
      },
    });
  } catch (error) {
    console.error('Error serving file:', error);
    return new NextResponse('Internal server error', { status: 500 });
  }
}
