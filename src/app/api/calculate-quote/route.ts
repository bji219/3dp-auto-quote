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

    // Construct file path
    const uploadsDir = path.join(process.cwd(), 'public', 'uploads');
    const filePath = path.join(uploadsDir, `${fileId}.stl`);

    // Check if file exists
    try {
      await fs.access(filePath);
    } catch (error) {
      return NextResponse.json(
        {
          success: false,
          message: 'File not found',
          fileId,
        },
        { status: 404 }
      );
    }

    // Read and parse STL file
    const fileBuffer = await fs.readFile(filePath);
    const arrayBuffer = fileBuffer.buffer.slice(
      fileBuffer.byteOffset,
      fileBuffer.byteOffset + fileBuffer.byteLength
    );

    const stlData = await parseSTL(arrayBuffer);

    // Calculate file hash for verification
    const fileHash = crypto.createHash('sha256').update(fileBuffer).digest('hex');

    // Get file stats
    const fileStats = await fs.stat(filePath);
    const fileSize = fileStats.size;

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

    // Save quote to database
    const savedQuote = await prisma.quote.create({
      data: {
        email,
        emailVerified: true, // User is authenticated
        fileName: fileId,
        fileSize,
        fileHash,
        
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
