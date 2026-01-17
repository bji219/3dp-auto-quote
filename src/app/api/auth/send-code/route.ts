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

/**
 * Request schema validation
 */
const sendCodeSchema = z.object({
  email: z.string().email('Invalid email address'),
});

/**
 * POST /api/auth/send-code
 * Send a verification code to an email address
 */
export async function POST(request: NextRequest) {
  try {
    // Parse and validate request body
    const body = await request.json();
    const validation = sendCodeSchema.safeParse(body);

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

    // Get client metadata
    const ipAddress = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown';
    const userAgent = request.headers.get('user-agent') || undefined;

    // Check rate limiting
    const rateLimit = await checkRateLimit(email, ipAddress);

    if (!rateLimit.allowed) {
      return NextResponse.json(
        {
          success: false,
          message: `Too many verification attempts. Please try again later.`,
          attemptsRemaining: 0,
          resetAt: rateLimit.resetAt.toISOString(),
        },
        { status: 429 }
      );
    }

    // Create verification code
    const verification = await createVerificationCode(email, {
      ipAddress,
      userAgent,
    });

    // Send email
    const emailResult = await sendVerificationCodeEmail(
      email,
      verification.code,
      15 // 15 minutes expiry
    );

    // Record the attempt
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
    console.error('Send code error:', error);
    return NextResponse.json(
      {
        success: false,
        message: 'Internal server error',
      },
      { status: 500 }
    );
  }
}
