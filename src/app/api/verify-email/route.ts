import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import {
  createVerificationCode,
  checkRateLimit,
  recordVerificationAttempt,
} from '@/utils/verification';
import { sendVerificationCodeEmail } from '@/utils/email-service';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const verifyEmailSchema = z.object({
  email: z.string().email('Invalid email address'),
});

/**
 * POST /api/verify-email
 * Send a verification code to an email address
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validation = verifyEmailSchema.safeParse(body);

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

    const { email } = validation.data;
    const ipAddress = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown';
    const userAgent = request.headers.get('user-agent') || undefined;

    const rateLimit = await checkRateLimit(email, ipAddress);

    if (!rateLimit.allowed) {
      return NextResponse.json(
        {
          success: false,
          message: 'Too many verification attempts. Please try again later.',
          attemptsRemaining: 0,
          resetAt: rateLimit.resetAt.toISOString(),
        },
        { status: 429 }
      );
    }

    const verification = await createVerificationCode(email, { ipAddress, userAgent });

    // Skip email sending in development if configured
    const skipEmail = process.env.SKIP_EMAIL_VERIFICATION === 'true';

    if (skipEmail) {
      console.log(`[DEV] Verification code for ${email}: ${verification.code}`);
      await recordVerificationAttempt(email, true, ipAddress);

      return NextResponse.json(
        {
          success: true,
          message: 'Verification code sent successfully',
          code: verification.code, // Only in dev mode
          expiresAt: verification.expiresAt.toISOString(),
          attemptsRemaining: rateLimit.attemptsRemaining - 1,
        },
        { status: 200 }
      );
    }

    const emailResult = await sendVerificationCodeEmail(email, verification.code, 15);

    await recordVerificationAttempt(email, emailResult.success, ipAddress);

    if (!emailResult.success) {
      return NextResponse.json(
        {
          success: false,
          message: 'Failed to send verification email',
          error: emailResult.error,
        },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        message: 'Verification code sent successfully',
        expiresAt: verification.expiresAt.toISOString(),
        attemptsRemaining: rateLimit.attemptsRemaining - 1,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Verify email error:', error);
    return NextResponse.json(
      {
        success: false,
        message: 'Internal server error',
      },
      { status: 500 }
    );
  }
}
