import { NextRequest, NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';
import crypto from 'crypto';
import { parseSTL, validateSTLData } from '@/utils/stl-parser';
import { generateFileHash } from '@/utils/validation';
import { UploadResponse } from '@/types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Configuration
const MAX_FILE_SIZE = parseInt(process.env.MAX_FILE_SIZE_MB || '50') * 1024 * 1024;
const UPLOAD_DIR = join(process.cwd(), 'public', 'uploads');

/**
 * Generate a unique file ID
 */
function generateFileId(): string {
  return `file_${Date.now()}_${crypto.randomBytes(8).toString('hex')}`;
}

/**
 * Ensure upload directory exists
 */
async function ensureUploadDir(): Promise<void> {
  if (!existsSync(UPLOAD_DIR)) {
    await mkdir(UPLOAD_DIR, { recursive: true });
  }
}

/**
 * POST /api/upload
 * Upload and parse STL file, returns file ID and metrics
 */
export async function POST(request: NextRequest) {
  try {
    // Check content type
    const contentType = request.headers.get('content-type') || '';
    if (!contentType.includes('multipart/form-data')) {
      return NextResponse.json<UploadResponse>(
        {
          success: false,
          message: 'Invalid content type. Expected multipart/form-data',
        },
        { status: 400 }
      );
    }

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

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json<UploadResponse>(
        {
          success: false,
          message: 'File too large',
          error: `File size must not exceed ${MAX_FILE_SIZE / 1024 / 1024}MB`,
        },
        { status: 400 }
      );
    }

    if (file.size === 0) {
      return NextResponse.json<UploadResponse>(
        {
          success: false,
          message: 'File is empty',
          error: 'Cannot process empty file',
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

    // Generate unique file ID
    const fileId = generateFileId();
    const savedFileName = `${fileId}.stl`;

    // Ensure upload directory exists
    await ensureUploadDir();

    // Save file to disk
    const filePath = join(UPLOAD_DIR, savedFileName);
    const buffer = Buffer.from(arrayBuffer);
    await writeFile(filePath, buffer);

    return NextResponse.json<UploadResponse>(
      {
        success: true,
        message: 'File uploaded and parsed successfully',
        data: {
          fileId,
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
