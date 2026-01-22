import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { prisma } from '@/lib/prisma';
import { sendOrderConfirmationEmail, sendAdminOrderNotification } from '@/utils/email-service';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * POST /api/webhooks/stripe
 * Handle Stripe webhook events
 */
export async function POST(request: NextRequest) {
  // Initialize Stripe inside the handler to avoid build-time errors
  if (!process.env.STRIPE_SECRET_KEY || !process.env.STRIPE_WEBHOOK_SECRET) {
    console.error('Stripe configuration missing');
    return NextResponse.json(
      { error: 'Stripe is not configured' },
      { status: 500 }
    );
  }

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  const body = await request.text();
  const signature = request.headers.get('stripe-signature');

  if (!signature) {
    console.error('No Stripe signature found');
    return NextResponse.json(
      { error: 'No signature found' },
      { status: 400 }
    );
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (err) {
    console.error('Webhook signature verification failed:', err);
    return NextResponse.json(
      { error: `Webhook Error: ${err instanceof Error ? err.message : 'Unknown error'}` },
      { status: 400 }
    );
  }

  // Handle the event
  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        await handleCheckoutSessionCompleted(session);
        break;
      }

      case 'payment_intent.succeeded': {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        console.log('PaymentIntent succeeded:', paymentIntent.id);
        // Additional payment confirmation logic if needed
        break;
      }

      case 'payment_intent.payment_failed': {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        console.error('Payment failed:', paymentIntent.id);
        // Handle failed payment if needed
        break;
      }

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('Error processing webhook:', error);
    return NextResponse.json(
      { error: 'Webhook handler failed' },
      { status: 500 }
    );
  }
}

/**
 * Handle successful checkout session
 */
async function handleCheckoutSessionCompleted(session: Stripe.Checkout.Session) {
  const quoteId = session.metadata?.quoteId;

  if (!quoteId) {
    console.error('No quoteId in session metadata');
    return;
  }

  console.log(`Processing order for quote: ${quoteId}`);

  // Find the quote
  const quote = await prisma.quote.findUnique({
    where: { id: quoteId },
  });

  if (!quote) {
    console.error(`Quote not found: ${quoteId}`);
    return;
  }

  // Check if already processed
  if (quote.status === 'accepted' || quote.status === 'completed') {
    console.log(`Quote ${quoteId} already processed`);
    return;
  }

  // Update quote status to accepted
  await prisma.quote.update({
    where: { id: quoteId },
    data: { status: 'accepted' },
  });

  console.log(`Quote ${quoteId} status updated to accepted`);

  // Send confirmation email to customer
  try {
    await sendOrderConfirmationEmail(quote.email, {
      quoteId: quote.id,
      fileName: quote.fileName,
      material: quote.material,
      quality: quote.quality,
      totalCost: quote.totalCost,
      validUntil: quote.validUntil,
    });
    console.log(`Confirmation email sent to ${quote.email}`);
  } catch (error) {
    console.error('Failed to send confirmation email:', error);
  }

  // Send notification to admin with STL file attachment
  try {
    await sendAdminOrderNotification({
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
    console.log(`Admin notification sent for quote ${quoteId}`);
  } catch (error) {
    console.error('Failed to send admin notification:', error);
  }
}
