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

const confirmCodeSchema = z.object({
  email: z.string().email('Invalid email address'),
  code: z.string().length(6, 'Code must be 6 digits').regex(/^\d{6}$/, 'Code must be numeric'),
});

/**
 * POST /api/confirm-code
 * Verify a code and return a session token
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validation = confirmCodeSchema.safeParse(body);

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
    const ipAddress = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown';
    const userAgent = request.headers.get('user-agent') || undefined;

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

    const verificationResult = await verifyCode(email, code);
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

    const session = await createUserSession(email, { ipAddress, userAgent });

    const mailingListResult = await subscribeToMailingList(email, {
      source: 'email_verification',
      tags: ['verified_user'],
    });

    if (mailingListResult.success) {
      sendWelcomeEmail(email).catch((error) => {
        console.error('Failed to send welcome email:', error);
      });
    }

    return NextResponse.json(
      {
        success: true,
        message: 'Email verified successfully',
        sessionToken: session.token,
        expiresAt: session.expiresAt.toISOString(),
        user: {
          email,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Confirm code error:', error);
    return NextResponse.json(
      {
        success: false,
        message: 'Internal server error',
      },
      { status: 500 }
    );
  }
}
