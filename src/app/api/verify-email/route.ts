import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { sendQuoteEmail } from '@/utils/email';
import { VerificationResponse } from '@/types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET /api/verify-email?token=xxx
 * Verify email address using token
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const token = searchParams.get('token');

    if (!token) {
      return NextResponse.json<VerificationResponse>(
        {
          success: false,
          message: 'Verification token is required',
        },
        { status: 400 }
      );
    }

    // Find quote with this verification token
    const quote = await prisma.quote.findFirst({
      where: {
        verificationToken: token,
        emailVerified: false,
      },
    });

    if (!quote) {
      return NextResponse.json<VerificationResponse>(
        {
          success: false,
          message: 'Invalid or expired verification token',
        },
        { status: 404 }
      );
    }

    // Update quote as verified
    await prisma.quote.update({
      where: { id: quote.id },
      data: {
        emailVerified: true,
        verificationToken: null,
        status: 'verified',
      },
    });

    // Send quote email
    try {
      await sendQuoteEmail(quote.email, {
        fileName: quote.fileName,
        totalCost: quote.totalCost,
        estimatedPrintTime:
          quote.volume / 10, // Simplified calculation
        validUntil: quote.validUntil,
      });
    } catch (emailError) {
      console.error('Failed to send quote email:', emailError);
      // Continue even if email fails
    }

    return NextResponse.json<VerificationResponse>(
      {
        success: true,
        message: 'Email verified successfully. Your quote has been sent to your email.',
        verified: true,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Verification error:', error);
    return NextResponse.json<VerificationResponse>(
      {
        success: false,
        message: 'Failed to verify email',
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/verify-email
 * Resend verification email
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email } = body;

    if (!email) {
      return NextResponse.json<VerificationResponse>(
        {
          success: false,
          message: 'Email is required',
        },
        { status: 400 }
      );
    }

    // Find most recent unverified quote for this email
    const quote = await prisma.quote.findFirst({
      where: {
        email,
        emailVerified: false,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    if (!quote || !quote.verificationToken) {
      return NextResponse.json<VerificationResponse>(
        {
          success: false,
          message: 'No pending verification found for this email',
        },
        { status: 404 }
      );
    }

    // Resend verification email
    const { sendVerificationEmail } = await import('@/utils/email');
    await sendVerificationEmail(email, quote.verificationToken);

    return NextResponse.json<VerificationResponse>(
      {
        success: true,
        message: 'Verification email resent successfully',
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Resend verification error:', error);
    return NextResponse.json<VerificationResponse>(
      {
        success: false,
        message: 'Failed to resend verification email',
      },
      { status: 500 }
    );
  }
}
