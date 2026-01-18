import { NextRequest, NextResponse } from 'next/server';
import { validateUserSession } from '@/utils/verification';

/**
 * Extract session token from request
 */
export function extractToken(request: NextRequest): string | null {
  // Check Authorization header
  const authHeader = request.headers.get('authorization');
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7);
  }

  // Check X-Session-Token header
  const sessionHeader = request.headers.get('x-session-token');
  if (sessionHeader) {
    return sessionHeader;
  }

  return null;
}

/**
 * Authenticate request and return user email
 */
export async function authenticateRequest(
  request: NextRequest
): Promise<{
  authenticated: boolean;
  email?: string;
  error?: string;
}> {
  const token = extractToken(request);

  if (!token) {
    return {
      authenticated: false,
      error: 'No authentication token provided',
    };
  }

  const result = await validateUserSession(token);

  if (!result.valid) {
    return {
      authenticated: false,
      error: 'Invalid or expired session token',
    };
  }

  return {
    authenticated: true,
    email: result.email,
  };
}

/**
 * Middleware to require authentication
 */
export async function requireAuth(
  request: NextRequest
): Promise<{ email: string } | NextResponse> {
  const auth = await authenticateRequest(request);

  if (!auth.authenticated) {
    return NextResponse.json(
      {
        success: false,
        message: auth.error || 'Authentication required',
      },
      { status: 401 }
    );
  }

  return { email: auth.email! };
}

/**
 * Get user email from authenticated request
 */
export async function getUserEmail(request: NextRequest): Promise<string | null> {
  const auth = await authenticateRequest(request);
  return auth.authenticated ? auth.email! : null;
}
