import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { sendQuoteEmail } from '@/utils/email-service';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const saveEmailSchema = z.object({
  email: z.string().email('Invalid email address'),
});

/**
 * POST /api/quote/[id]/save-email
 * Save email to an existing quote and send quote details
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    const body = await request.json();
    const validation = saveEmailSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        {
          success: false,
          message: 'Invalid email address',
          errors: validation.error.errors,
        },
        { status: 400 }
      );
    }

    const { email } = validation.data;

    // Find the quote
    const quote = await prisma.quote.findUnique({
      where: { id },
    });

    if (!quote) {
      return NextResponse.json(
        { success: false, message: 'Quote not found' },
        { status: 404 }
      );
    }

    // Update quote with email
    const updatedQuote = await prisma.quote.update({
      where: { id },
      data: {
        email,
        emailVerified: false, // Not verified, but they provided it
      },
    });

    // Send quote email
    try {
      await sendQuoteEmail(email, {
        quoteId: quote.id,
        fileName: quote.fileName,
        material: quote.material,
        quality: quote.quality,
        totalCost: quote.totalCost,
        validUntil: quote.validUntil,
        breakdown: {
          estimatedPrice: quote.baseCost + quote.materialCost + quote.laborCost,
          shippingCost: 0, // Not stored separately in DB
          rushOrderFee: quote.rushOrder ? quote.totalCost * 0.25 : 0,
          discount: 0,
          taxAmount: quote.totalCost * 0.08, // Approximate
        },
      });
    } catch (emailError) {
      console.error('Failed to send quote email:', emailError);
      // Don't fail the request if email fails
    }

    return NextResponse.json({
      success: true,
      message: 'Email saved! Quote details have been sent to your email.',
      quote: {
        id: updatedQuote.id,
        email: updatedQuote.email,
      },
    });
  } catch (error) {
    console.error('Save email error:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to save email' },
      { status: 500 }
    );
  }
}
