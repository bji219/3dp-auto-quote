import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { invalidateSession } from '@/utils/verification';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Request schema validation
 */
const logoutSchema = z.object({
  token: z.string().min(1, 'Token is required'),
});

/**
 * POST /api/auth/logout
 * Invalidate a session token
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
      const validation = logoutSchema.safeParse(body);

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

      token = validation.data.token;
    }

    // Invalidate the session
    await invalidateSession(token);

    return NextResponse.json(
      {
        success: true,
        message: 'Logged out successfully',
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Logout error:', error);
    return NextResponse.json(
      {
        success: false,
        message: 'Internal server error',
      },
      { status: 500 }
    );
  }
}
