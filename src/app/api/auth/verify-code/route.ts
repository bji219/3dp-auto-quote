import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import {
  verifyCode,
  createUserSession,
  recordVerificationAttempt,
  checkRateLimit,
} from '@/utils/verification';
import { subscribeToMailingList } from '@/utils/mailing-list';
import { sendWelcomeEmail } from '@/utils/email-service';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Request schema validation
 */
const verifyCodeSchema = z.object({
  email: z.string().email('Invalid email address'),
  code: z.string().length(6, 'Code must be 6 digits').regex(/^\d{6}$/, 'Code must be numeric'),
});

/**
 * POST /api/auth/verify-code
 * Verify a code and return a session token
 */
export async function POST(request: NextRequest) {
  try {
    // Parse and validate request body
    const body = await request.json();
    const validation = verifyCodeSchema.safeParse(body);

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

    const { email, code } = validation.data;

    // Get client metadata
    const ipAddress = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown';
    const userAgent = request.headers.get('user-agent') || undefined;

    // Check rate limiting (even for verification attempts)
    const rateLimit = await checkRateLimit(email, ipAddress);

    if (!rateLimit.allowed) {
      return NextResponse.json(
        {
          success: false,
          message: 'Too many verification attempts. Please try again later.',
          resetAt: rateLimit.resetAt.toISOString(),
        },
        { status: 429 }
      );
    }

    // Verify the code
    const verificationResult = await verifyCode(email, code);

    // Record the verification attempt
    await recordVerificationAttempt(email, verificationResult.success, ipAddress);

    if (!verificationResult.success) {
      return NextResponse.json(
        {
          success: false,
          message: verificationResult.message,
          attemptsRemaining: rateLimit.attemptsRemaining - 1,
        },
        { status: 400 }
      );
    }

    // Create user session and generate JWT token
    const session = await createUserSession(email, {
      ipAddress,
      userAgent,
    });

    // Subscribe to mailing list (if not already subscribed)
    const mailingListResult = await subscribeToMailingList(email, {
      source: 'email_verification',
      tags: ['verified_user'],
    });

    // Send welcome email (don't wait for it)
    if (mailingListResult.success) {
      sendWelcomeEmail(email).catch((error) => {
        console.error('Failed to send welcome email:', error);
      });
    }

    return NextResponse.json(
      {
        success: true,
        message: 'Email verified successfully',
        session: {
          token: session.token,
          expiresAt: session.expiresAt.toISOString(),
        },
        user: {
          email,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Verify code error:', error);
    return NextResponse.json(
      {
        success: false,
        message: 'Internal server error',
      },
      { status: 500 }
    );
  }
}
