import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET /api/quote/:id
 * Retrieve a quote by ID
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    if (!id) {
      return NextResponse.json(
        {
          success: false,
          message: 'Quote ID is required',
        },
        { status: 400 }
      );
    }

    // Fetch quote from database
    const quote = await prisma.quote.findUnique({
      where: { id },
    });

    if (!quote) {
      return NextResponse.json(
        {
          success: false,
          message: 'Quote not found',
        },
        { status: 404 }
      );
    }

    // Check if quote is still valid
    const isExpired = new Date() > quote.validUntil;

    return NextResponse.json(
      {
        success: true,
        quote: {
          id: quote.id,
          email: quote.email,
          emailVerified: quote.emailVerified,
          
          // File information
          fileName: quote.fileName,
          fileSize: quote.fileSize,
          fileHash: quote.fileHash,
          
          // STL Analysis
          volume: quote.volume,
          surfaceArea: quote.surfaceArea,
          boundingBox: quote.boundingBox,
          
          // Pricing options
          material: quote.material,
          infillPercentage: quote.infillPercentage,
          quality: quote.quality,
          color: quote.color,
          rushOrder: quote.rushOrder,
          
          // Cost breakdown
          baseCost: quote.baseCost,
          materialCost: quote.materialCost,
          laborCost: quote.laborCost,
          totalCost: quote.totalCost,
          
          // Quote status
          status: quote.status,
          validUntil: quote.validUntil.toISOString(),
          isExpired,
          
          // Timestamps
          createdAt: quote.createdAt.toISOString(),
          updatedAt: quote.updatedAt.toISOString(),
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Get quote error:', error);
    return NextResponse.json(
      {
        success: false,
        message: 'Internal server error',
      },
      { status: 500 }
    );
  }
}
