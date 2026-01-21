import { NextRequest, NextResponse } from 'next/server';
import { parseSTL, validateSTLData } from '@/utils/stl-parser';
import {
  saveFileWithMetadata,
  calculateFileHash,
  generateFileId
} from '@/utils/file-storage';
import { prisma } from '@/lib/prisma';
import { UploadResponse } from '@/types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Configuration
const MAX_FILE_SIZE = parseInt(process.env.MAX_FILE_SIZE_MB || '50') * 1024 * 1024;

/**
 * POST /api/upload
 * Upload and parse STL file, saves to storage and database
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
    const buffer = Buffer.from(arrayBuffer);

    // Parse STL file first (to validate before saving)
    console.log(`Parsing STL file: ${file.name}, size: ${file.size} bytes`);
    const stlData = await parseSTL(arrayBuffer);

    console.log('STL parsed:', {
      volume: stlData.volume,
      surfaceArea: stlData.surfaceArea,
      vertices: stlData.vertices,
      triangles: stlData.triangles,
      isValid: stlData.isValid,
    });

    // Validate parsed data
    const validation = validateSTLData(stlData);
    if (!validation.valid) {
      console.error('STL validation failed:', validation.errors);
      return NextResponse.json<UploadResponse>(
        {
          success: false,
          message: 'Invalid STL file',
          error: validation.errors.join(', '),
        },
        { status: 400 }
      );
    }

    // Get request metadata
    const ipAddress = request.headers.get('x-forwarded-for') ||
                     request.headers.get('x-real-ip') ||
                     'unknown';
    const userAgent = request.headers.get('user-agent') || 'unknown';

    // Calculate file hash for deduplication
    const fileHash = await calculateFileHash(buffer);

    // Check for existing file with same hash (deduplication)
    const existingFile = await prisma.fileUpload.findFirst({
      where: { fileHash },
    });

    let fileRecord;

    if (existingFile) {
      // File already exists - update last accessed time and reuse
      fileRecord = await prisma.fileUpload.update({
        where: { id: existingFile.id },
        data: { lastAccessedAt: new Date() },
      });

      console.log(`Reusing existing file: ${existingFile.fileId}`);
    } else {
      // New file - save to storage and database
      const storageMetadata = await saveFileWithMetadata(
        file.name,
        buffer,
        undefined, // uploadedBy (no user context yet)
        ipAddress,
        userAgent
      );

      // Save to database
      fileRecord = await prisma.fileUpload.create({
        data: {
          fileId: storageMetadata.fileId,
          fileName: storageMetadata.fileName,
          filePath: storageMetadata.filePath,
          fileSize: storageMetadata.fileSize,
          fileHash: storageMetadata.fileHash,
          mimeType: storageMetadata.mimeType,
          storageType: storageMetadata.storageType,
          volume: stlData.volume,
          surfaceArea: stlData.surfaceArea,
          boundingBox: JSON.stringify(stlData.boundingBox),
          ipAddress,
          userAgent,
        },
      });
    }

    return NextResponse.json<UploadResponse>(
      {
        success: true,
        message: existingFile
          ? 'File already exists, reusing cached version'
          : 'File uploaded and parsed successfully',
        data: {
          fileId: fileRecord.fileId,
          fileName: file.name,
          fileSize: file.size,
          fileHash,
          stlData,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Upload error details:', {
      error,
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      env: {
        DATABASE_URL: process.env.DATABASE_URL ? 'Set' : 'Not set',
        STORAGE_TYPE: process.env.STORAGE_TYPE || 'local (default)',
        STORAGE_BASE_PATH: process.env.STORAGE_BASE_PATH || 'default',
        NETLIFY: process.env.NETLIFY || 'false',
      }
    });

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
