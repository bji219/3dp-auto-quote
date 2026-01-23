import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { parseSTL } from '@/utils/stl-parser-enhanced';
import { calculateDetailedQuote } from '@/utils/pricing-enhanced';
import { prisma } from '@/lib/prisma';
import { promises as fs } from 'fs';
import path from 'path';
import type { STLData } from '@/types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const calculateQuoteSchema = z.object({
  fileId: z.string().min(1, 'File ID is required'),
  material: z.string().optional().default('PLA'),
  infillPercentage: z.number().min(0).max(100).optional().default(20),
  quality: z.enum(['draft', 'standard', 'high']).optional().default('standard'),
  rushOrder: z.boolean().optional().default(false),
  color: z.string().optional(),
  // Anti-bot fields
  honeypot: z.string().optional(),
  formLoadTime: z.number().optional(),
});

/**
 * POST /api/calculate-quote-public
 * Calculate quote for uploaded STL file (no auth required)
 * Uses honeypot + timing check for bot prevention
 */
export async function POST(request: NextRequest) {
  try {
    // Parse and validate request body
    const body = await request.json();
    const validation = calculateQuoteSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        {
          success: false,
          message: 'Invalid request data',
          errors: validation.error.errors,
        },
        { status: 400 }
      );
    }

    const { fileId, material, infillPercentage, quality, rushOrder, color, honeypot, formLoadTime } = validation.data;

    // Anti-bot checks
    // 1. Honeypot field should be empty (bots often fill hidden fields)
    if (honeypot && honeypot.length > 0) {
      console.log('Bot detected: honeypot field filled');
      return NextResponse.json(
        { success: false, message: 'Invalid request' },
        { status: 400 }
      );
    }

    // 2. Form should take at least 2 seconds to fill (bots are fast)
    if (formLoadTime) {
      const timeTaken = Date.now() - formLoadTime;
      if (timeTaken < 2000) {
        console.log('Bot detected: form submitted too quickly', timeTaken);
        return NextResponse.json(
          { success: false, message: 'Please wait a moment before submitting' },
          { status: 400 }
        );
      }
    }

    // Check FileUpload record exists
    const fileRecord = await prisma.fileUpload.findUnique({
      where: { fileId },
    });

    if (!fileRecord) {
      return NextResponse.json(
        {
          success: false,
          message: 'File not found',
          fileId,
        },
        { status: 404 }
      );
    }

    // Update last accessed time
    await prisma.fileUpload.update({
      where: { fileId },
      data: { lastAccessedAt: new Date() },
    });

    // Use cached STL data if available, otherwise parse file
    let stlData: STLData;

    if (fileRecord.volume && fileRecord.surfaceArea && fileRecord.boundingBox) {
      stlData = {
        volume: fileRecord.volume,
        surfaceArea: fileRecord.surfaceArea,
        boundingBox: typeof fileRecord.boundingBox === 'string'
          ? JSON.parse(fileRecord.boundingBox)
          : fileRecord.boundingBox as { x: number; y: number; z: number },
        estimatedPrintTime: 0,
        vertices: 0,
        triangles: 0,
        isValid: true,
      };
    } else {
      // Read and parse STL file
      const uploadsDir = path.join(process.cwd(), 'public', 'uploads');
      const filePath = path.join(uploadsDir, fileRecord.filePath);

      const fileBuffer = await fs.readFile(filePath);
      const arrayBuffer = fileBuffer.buffer.slice(
        fileBuffer.byteOffset,
        fileBuffer.byteOffset + fileBuffer.byteLength
      );

      stlData = await parseSTL(arrayBuffer);

      // Update cached metrics
      await prisma.fileUpload.update({
        where: { fileId },
        data: {
          volume: stlData.volume,
          surfaceArea: stlData.surfaceArea,
          boundingBox: JSON.stringify(stlData.boundingBox),
        },
      });
    }

    // Calculate detailed quote
    const quote = calculateDetailedQuote(stlData, {
      material,
      infillPercentage,
      quality,
      rushOrder,
      shippingEnabled: true,
    });

    // Set quote validity (7 days from now)
    const validUntil = new Date();
    validUntil.setDate(validUntil.getDate() + 7);

    // Get request metadata
    const ipAddress = request.headers.get('x-forwarded-for') ||
                     request.headers.get('x-real-ip') ||
                     'unknown';
    const userAgent = request.headers.get('user-agent') || 'unknown';

    // Save quote to database (without email - will be added later if user provides it)
    const savedQuote = await prisma.quote.create({
      data: {
        email: 'anonymous@temp.local', // Placeholder - will be updated when user provides email
        emailVerified: false,
        fileId,
        fileName: fileRecord.fileName,
        filePath: fileRecord.filePath,
        fileSize: fileRecord.fileSize,
        fileHash: fileRecord.fileHash,

        // STL metrics
        volume: stlData.volume,
        surfaceArea: stlData.surfaceArea,
        boundingBox: JSON.stringify({
          x: stlData.boundingBox.x,
          y: stlData.boundingBox.y,
          z: stlData.boundingBox.z,
        }),

        // Pricing options
        material,
        infillPercentage,
        quality,
        color: color || null,
        rushOrder,

        // Cost breakdown
        baseCost: quote.breakdown.setupFee,
        materialCost: quote.breakdown.materialCost,
        laborCost: quote.breakdown.laborCost + quote.breakdown.machineCost,
        totalCost: quote.breakdown.total,

        // Quote status
        status: 'pending',
        validUntil,

        // Metadata
        ipAddress,
        userAgent,
      },
    });

    return NextResponse.json(
      {
        success: true,
        message: 'Quote calculated successfully',
        quote: {
          id: savedQuote.id,
          fileName: savedQuote.fileName,

          // Model details
          model: quote.model,

          // Material details
          material: quote.material,

          // Print details
          print: quote.print,

          // Cost breakdown
          breakdown: quote.breakdown,

          // Quote metadata
          validUntil: savedQuote.validUntil.toISOString(),
          createdAt: savedQuote.createdAt.toISOString(),
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Calculate quote error:', error);

    if (error instanceof Error) {
      if (error.message.includes('Invalid STL')) {
        return NextResponse.json(
          {
            success: false,
            message: 'Invalid STL file format',
            error: error.message,
          },
          { status: 400 }
        );
      }
    }

    return NextResponse.json(
      {
        success: false,
        message: 'Internal server error',
      },
      { status: 500 }
    );
  }
}
