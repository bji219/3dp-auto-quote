import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAuth } from '@/middleware/auth';
import { parseSTL } from '@/utils/stl-parser-enhanced';
import { calculateDetailedQuote } from '@/utils/pricing-enhanced';
import { prisma } from '@/lib/prisma';
import { promises as fs } from 'fs';
import path from 'path';
import crypto from 'crypto';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const calculateQuoteSchema = z.object({
  fileId: z.string().min(1, 'File ID is required'),
  material: z.string().optional().default('PLA'),
  infillPercentage: z.number().min(0).max(100).optional().default(20),
  quality: z.enum(['draft', 'standard', 'high']).optional().default('standard'),
  rushOrder: z.boolean().optional().default(false),
  color: z.string().optional(),
});

/**
 * POST /api/calculate-quote
 * Calculate quote for uploaded STL file
 * Requires authentication
 */
export async function POST(request: NextRequest) {
  try {
    // Authenticate request
    const authResult = await requireAuth(request);
    if (authResult instanceof NextResponse) {
      return authResult; // Return error response
    }
    const { email } = authResult;

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

    const { fileId, material, infillPercentage, quality, rushOrder, color } = validation.data;

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
    let stlData;

    if (fileRecord.volume && fileRecord.surfaceArea && fileRecord.boundingBox) {
      // Use cached metrics
      stlData = {
        volume: fileRecord.volume,
        surfaceArea: fileRecord.surfaceArea,
        boundingBox: fileRecord.boundingBox as { x: number; y: number; z: number },
        estimatedPrintTime: 0, // Will be recalculated by pricing engine
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
          boundingBox: stlData.boundingBox,
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

    // Save quote to database
    const savedQuote = await prisma.quote.create({
      data: {
        email,
        emailVerified: true, // User is authenticated
        fileId,
        fileName: fileRecord.fileName,
        filePath: fileRecord.filePath,
        fileSize: fileRecord.fileSize,
        fileHash: fileRecord.fileHash,
        
        // STL metrics
        volume: stlData.volume,
        surfaceArea: stlData.surfaceArea,
        boundingBox: {
          x: stlData.boundingBox.x,
          y: stlData.boundingBox.y,
          z: stlData.boundingBox.z,
        },
        
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
          email: savedQuote.email,
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
    
    // Handle specific errors
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
