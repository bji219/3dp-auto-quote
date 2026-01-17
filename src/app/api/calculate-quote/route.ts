import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { calculateQuote, applyVolumeDiscount, getQuoteValidityDate } from '@/utils/pricing';
import { generateVerificationToken, quoteRequestSchema } from '@/utils/validation';
import { sendVerificationEmail } from '@/utils/email';
import { QuoteResponse } from '@/types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * POST /api/calculate-quote
 * Calculate quote and create database entry
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate request body
    const validatedData = quoteRequestSchema.parse(body);

    const {
      email,
      fileName,
      fileSize,
      material = 'PLA',
      infillPercentage = 20,
      quality = 'standard',
      color,
      rushOrder = false,
    } = validatedData;

    // Get STL data from request
    const { volume, surfaceArea, boundingBox } = body.stlData;

    if (!volume || !surfaceArea || !boundingBox) {
      return NextResponse.json(
        {
          success: false,
          message: 'Missing STL data',
          error: 'STL data is required for quote calculation',
        },
        { status: 400 }
      );
    }

    // Calculate quote
    const quoteCalculation = calculateQuote({
      stlData: { volume, surfaceArea, boundingBox, vertices: 0, triangles: 0, isValid: true },
      material,
      infillPercentage,
      quality,
      rushOrder,
    });

    // Apply volume discount
    const finalQuote = applyVolumeDiscount(quoteCalculation);

    // Generate verification token
    const verificationToken = generateVerificationToken();

    // Get quote validity date
    const validUntil = getQuoteValidityDate(7);

    // Create quote in database
    const quote = await prisma.quote.create({
      data: {
        email,
        emailVerified: false,
        verificationToken,
        fileName,
        fileSize,
        fileHash: body.fileHash,
        volume,
        surfaceArea,
        boundingBox,
        material,
        infillPercentage,
        quality,
        color: color || null,
        rushOrder,
        baseCost: finalQuote.baseCost,
        materialCost: finalQuote.materialCost,
        laborCost: finalQuote.laborCost,
        totalCost: finalQuote.totalCost,
        status: 'pending',
        validUntil,
      },
    });

    // Send verification email
    try {
      await sendVerificationEmail(email, verificationToken);
    } catch (emailError) {
      console.error('Failed to send verification email:', emailError);
      // Continue even if email fails
    }

    const response: QuoteResponse = {
      id: quote.id,
      email: quote.email,
      fileName: quote.fileName,
      volume: quote.volume,
      surfaceArea: quote.surfaceArea,
      boundingBox: quote.boundingBox as { x: number; y: number; z: number },
      material: quote.material,
      infillPercentage: quote.infillPercentage,
      quality: quote.quality,
      baseCost: quote.baseCost,
      materialCost: quote.materialCost,
      laborCost: quote.laborCost,
      totalCost: quote.totalCost,
      validUntil: quote.validUntil.toISOString(),
      requiresVerification: !quote.emailVerified,
    };

    return NextResponse.json(
      {
        success: true,
        message: 'Quote calculated successfully. Please check your email to verify.',
        data: response,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Calculate quote error:', error);

    if (error instanceof Error && error.name === 'ZodError') {
      return NextResponse.json(
        {
          success: false,
          message: 'Invalid request data',
          error: error.message,
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        message: 'Failed to calculate quote',
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/calculate-quote?id=xxx
 * Get quote by ID
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        {
          success: false,
          message: 'Quote ID is required',
        },
        { status: 400 }
      );
    }

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

    const response: QuoteResponse = {
      id: quote.id,
      email: quote.email,
      fileName: quote.fileName,
      volume: quote.volume,
      surfaceArea: quote.surfaceArea,
      boundingBox: quote.boundingBox as { x: number; y: number; z: number },
      material: quote.material,
      infillPercentage: quote.infillPercentage,
      quality: quote.quality,
      baseCost: quote.baseCost,
      materialCost: quote.materialCost,
      laborCost: quote.laborCost,
      totalCost: quote.totalCost,
      validUntil: quote.validUntil.toISOString(),
      requiresVerification: !quote.emailVerified,
    };

    return NextResponse.json(
      {
        success: true,
        data: response,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Get quote error:', error);
    return NextResponse.json(
      {
        success: false,
        message: 'Failed to retrieve quote',
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
