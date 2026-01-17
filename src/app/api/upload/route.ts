import { NextRequest, NextResponse } from 'next/server';
import { parseSTL, validateSTLData } from '@/utils/stl-parser';
import { generateFileHash } from '@/utils/validation';
import { UploadResponse } from '@/types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * POST /api/upload
 * Upload and parse STL file
 */
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json<UploadResponse>(
        {
          success: false,
          message: 'No file provided',
          error: 'File is required',
        },
        { status: 400 }
      );
    }

    // Validate file type
    if (!file.name.toLowerCase().endsWith('.stl')) {
      return NextResponse.json<UploadResponse>(
        {
          success: false,
          message: 'Invalid file type',
          error: 'Only STL files are supported',
        },
        { status: 400 }
      );
    }

    // Validate file size (max 50MB)
    const maxSize = parseInt(process.env.MAX_FILE_SIZE_MB || '50') * 1024 * 1024;
    if (file.size > maxSize) {
      return NextResponse.json<UploadResponse>(
        {
          success: false,
          message: 'File too large',
          error: `File size must not exceed ${maxSize / 1024 / 1024}MB`,
        },
        { status: 400 }
      );
    }

    // Read file as ArrayBuffer
    const arrayBuffer = await file.arrayBuffer();

    // Parse STL file
    const stlData = await parseSTL(arrayBuffer);

    // Validate parsed data
    const validation = validateSTLData(stlData);
    if (!validation.valid) {
      return NextResponse.json<UploadResponse>(
        {
          success: false,
          message: 'Invalid STL file',
          error: validation.errors.join(', '),
        },
        { status: 400 }
      );
    }

    // Generate file hash
    const fileHash = await generateFileHash(arrayBuffer);

    return NextResponse.json<UploadResponse>(
      {
        success: true,
        message: 'File uploaded and parsed successfully',
        data: {
          fileName: file.name,
          fileSize: file.size,
          fileHash,
          stlData,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Upload error:', error);
    return NextResponse.json<UploadResponse>(
      {
        success: false,
        message: 'Failed to process file',
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
