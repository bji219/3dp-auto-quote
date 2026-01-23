import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { sendOrderConfirmationEmail, sendAdminOrderNotification } from '@/utils/email-service';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET /api/order/[quoteId]
 * Display order confirmation page (redirect to order page)
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { quoteId: string } }
) {
  const { quoteId } = params;

  // Redirect to order page
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://quote.idw3d.com';
  return NextResponse.redirect(`${baseUrl}/order/${quoteId}`);
}

/**
 * POST /api/order/[quoteId]
 * Process order and send notifications
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { quoteId: string } }
) {
  try {
    const { quoteId } = params;

    // Find the quote
    const quote = await prisma.quote.findUnique({
      where: { id: quoteId },
    });

    if (!quote) {
      return NextResponse.json(
        { success: false, message: 'Quote not found' },
        { status: 404 }
      );
    }

    // Check if quote is still valid
    if (new Date() > quote.validUntil) {
      return NextResponse.json(
        { success: false, message: 'Quote has expired. Please request a new quote.' },
        { status: 400 }
      );
    }

    // Check if already ordered
    if (quote.status === 'accepted' || quote.status === 'completed') {
      return NextResponse.json(
        { success: false, message: 'This quote has already been ordered.' },
        { status: 400 }
      );
    }

    // Update quote status to accepted
    const updatedQuote = await prisma.quote.update({
      where: { id: quoteId },
      data: { status: 'accepted' },
    });

    // Get file upload record for additional details
    const fileUpload = quote.fileId ? await prisma.fileUpload.findFirst({
      where: { fileId: quote.fileId },
    }) : null;

    // Send confirmation email to customer
    const customerEmailResult = await sendOrderConfirmationEmail(quote.email, {
      quoteId: quote.id,
      fileName: quote.fileName,
      material: quote.material,
      quality: quote.quality,
      totalCost: quote.totalCost,
      validUntil: quote.validUntil,
    });

    if (!customerEmailResult.success) {
      console.error('Failed to send customer confirmation email:', customerEmailResult.error);
    }

    // Send notification to admin
    const adminEmailResult = await sendAdminOrderNotification({
      quoteId: quote.id,
      customerEmail: quote.email,
      fileName: quote.fileName,
      fileId: quote.fileId || undefined,
      material: quote.material,
      quality: quote.quality,
      infillPercentage: quote.infillPercentage,
      rushOrder: quote.rushOrder,
      totalCost: quote.totalCost,
      volume: quote.volume,
      boundingBox: quote.boundingBox,
    });

    if (!adminEmailResult.success) {
      console.error('Failed to send admin notification email:', adminEmailResult.error);
    }

    return NextResponse.json({
      success: true,
      message: 'Order placed successfully! You will receive a confirmation email shortly.',
      order: {
        quoteId: updatedQuote.id,
        status: updatedQuote.status,
        email: updatedQuote.email,
        totalCost: updatedQuote.totalCost,
      },
    });
  } catch (error) {
    console.error('Order processing error:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to process order' },
      { status: 500 }
    );
  }
}
