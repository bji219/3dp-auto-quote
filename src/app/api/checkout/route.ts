import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { prisma } from '@/lib/prisma';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * POST /api/checkout
 * Create Stripe Checkout session for a quote
 */
export async function POST(request: NextRequest) {
  try {
    // Initialize Stripe inside the handler to avoid build-time errors
    if (!process.env.STRIPE_SECRET_KEY) {
      return NextResponse.json(
        { success: false, message: 'Stripe is not configured' },
        { status: 500 }
      );
    }

    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
    const body = await request.json();
    const { quoteId } = body;

    if (!quoteId) {
      return NextResponse.json(
        { success: false, message: 'Quote ID is required' },
        { status: 400 }
      );
    }

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
        { success: false, message: 'Quote has expired' },
        { status: 400 }
      );
    }

    // Check if already ordered
    if (quote.status === 'accepted' || quote.status === 'completed') {
      return NextResponse.json(
        { success: false, message: 'This quote has already been ordered' },
        { status: 400 }
      );
    }

    // Create Stripe Checkout session
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: `3D Print: ${quote.fileName}`,
              description: `Material: ${quote.material}, Quality: ${quote.quality}, Infill: ${quote.infillPercentage}%${quote.rushOrder ? ' (Rush Order)' : ''}`,
              metadata: {
                quoteId: quote.id,
                fileName: quote.fileName,
                material: quote.material,
                quality: quote.quality,
              },
            },
            unit_amount: Math.round(quote.totalCost * 100), // Convert to cents
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: `${baseUrl}/order/${quoteId}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${baseUrl}/order/${quoteId}`,
      customer_email: quote.email,
      metadata: {
        quoteId: quote.id,
        customerEmail: quote.email,
      },
      // Automatically collect customer billing address
      billing_address_collection: 'required',
      // Optional: Collect shipping address if needed
      shipping_address_collection: {
        allowed_countries: ['US', 'CA', 'GB', 'AU', 'DE', 'FR', 'IT', 'ES', 'NL', 'BE', 'AT', 'CH'],
      },
    });

    return NextResponse.json({
      success: true,
      sessionId: session.id,
      url: session.url,
    });
  } catch (error) {
    console.error('Stripe checkout error:', error);
    return NextResponse.json(
      {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to create checkout session'
      },
      { status: 500 }
    );
  }
}
