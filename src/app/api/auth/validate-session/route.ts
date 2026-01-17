import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { validateUserSession } from '@/utils/verification';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Request schema validation
 */
const validateSessionSchema = z.object({
  token: z.string().min(1, 'Token is required'),
});

/**
 * POST /api/auth/validate-session
 * Validate a session token
 */
export async function POST(request: NextRequest) {
  try {
    // Try to get token from body or Authorization header
    let token: string | undefined;

    const authHeader = request.headers.get('authorization');
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.substring(7);
    }

    if (!token) {
      const body = await request.json();
      const validation = validateSessionSchema.safeParse(body);

      if (!validation.success) {
        return NextResponse.json(
          {
            success: false,
            valid: false,
            message: 'Invalid request data',
            errors: validation.error.errors,
          },
          { status: 400 }
        );
      }

      token = validation.data.token;
    }

    // Validate the session
    const result = await validateUserSession(token);

    if (!result.valid) {
      return NextResponse.json(
        {
          success: false,
          valid: false,
          message: 'Invalid or expired session',
        },
        { status: 401 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        valid: true,
        message: 'Session is valid',
        user: {
          email: result.email,
        },
        session: {
          expiresAt: result.session.expiresAt.toISOString(),
          lastActivity: result.session.lastActivity.toISOString(),
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Validate session error:', error);
    return NextResponse.json(
      {
        success: false,
        valid: false,
        message: 'Internal server error',
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/auth/validate-session
 * Validate a session token from Authorization header
 */
export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        {
          success: false,
          valid: false,
          message: 'Missing or invalid Authorization header',
        },
        { status: 401 }
      );
    }

    const token = authHeader.substring(7);

    // Validate the session
    const result = await validateUserSession(token);

    if (!result.valid) {
      return NextResponse.json(
        {
          success: false,
          valid: false,
          message: 'Invalid or expired session',
        },
        { status: 401 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        valid: true,
        message: 'Session is valid',
        user: {
          email: result.email,
        },
        session: {
          expiresAt: result.session.expiresAt.toISOString(),
          lastActivity: result.session.lastActivity.toISOString(),
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Validate session error:', error);
    return NextResponse.json(
      {
        success: false,
        valid: false,
        message: 'Internal server error',
      },
      { status: 500 }
    );
  }
}
