import { prisma } from '@/lib/prisma';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';

/**
 * Configuration for verification
 */
export const VERIFICATION_CONFIG = {
  CODE_LENGTH: 6,
  CODE_EXPIRY_MINUTES: 15,
  MAX_ATTEMPTS_PER_HOUR: 10,
  SESSION_EXPIRY_HOURS: 24,
  JWT_SECRET: process.env.JWT_SECRET || 'your-secret-key-change-in-production',
};

/**
 * Generate a 6-digit verification code
 */
export function generateVerificationCode(): string {
  // Generate a random 6-digit number
  const code = Math.floor(100000 + Math.random() * 900000).toString();
  return code;
}

/**
 * Generate a cryptographically secure random code (alternative implementation)
 */
export function generateSecureVerificationCode(): string {
  const bytes = crypto.randomBytes(3);
  const code = (bytes.readUIntBE(0, 3) % 900000) + 100000;
  return code.toString();
}

/**
 * Create a verification code for an email
 */
export async function createVerificationCode(
  email: string,
  metadata?: {
    ipAddress?: string;
    userAgent?: string;
  }
): Promise<{
  id: string;
  code: string;
  expiresAt: Date;
}> {
  const code = generateSecureVerificationCode();
  const expiresAt = new Date(Date.now() + VERIFICATION_CONFIG.CODE_EXPIRY_MINUTES * 60 * 1000);

  const verification = await prisma.emailVerification.create({
    data: {
      email,
      code,
      expiresAt,
      ipAddress: metadata?.ipAddress,
      userAgent: metadata?.userAgent,
    },
  });

  return {
    id: verification.id,
    code: verification.code,
    expiresAt: verification.expiresAt,
  };
}

/**
 * Verify a code for an email
 */
export async function verifyCode(
  email: string,
  code: string
): Promise<{
  success: boolean;
  message: string;
  verificationId?: string;
}> {
  // Find the most recent non-verified code for this email
  const verification = await prisma.emailVerification.findFirst({
    where: {
      email,
      code,
      verified: false,
      expiresAt: {
        gte: new Date(),
      },
    },
    orderBy: {
      createdAt: 'desc',
    },
  });

  if (!verification) {
    return {
      success: false,
      message: 'Invalid or expired verification code',
    };
  }

  // Mark as verified
  await prisma.emailVerification.update({
    where: { id: verification.id },
    data: {
      verified: true,
      verifiedAt: new Date(),
    },
  });

  return {
    success: true,
    message: 'Email verified successfully',
    verificationId: verification.id,
  };
}

/**
 * Check rate limiting for verification attempts
 */
export async function checkRateLimit(
  email: string,
  ipAddress?: string
): Promise<{
  allowed: boolean;
  attemptsRemaining: number;
  resetAt: Date;
}> {
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);

  // Count FAILED attempts in the last hour (successful ones don't count towards limit)
  const attempts = await prisma.verificationAttempt.count({
    where: {
      email,
      successful: false,
      createdAt: {
        gte: oneHourAgo,
      },
    },
  });

  const attemptsRemaining = Math.max(0, VERIFICATION_CONFIG.MAX_ATTEMPTS_PER_HOUR - attempts);
  const allowed = attempts < VERIFICATION_CONFIG.MAX_ATTEMPTS_PER_HOUR;

  // Reset time is 1 hour from the first attempt
  const firstAttempt = await prisma.verificationAttempt.findFirst({
    where: {
      email,
      createdAt: {
        gte: oneHourAgo,
      },
    },
    orderBy: {
      createdAt: 'asc',
    },
  });

  const resetAt = firstAttempt
    ? new Date(firstAttempt.createdAt.getTime() + 60 * 60 * 1000)
    : new Date(Date.now() + 60 * 60 * 1000);

  return {
    allowed,
    attemptsRemaining,
    resetAt,
  };
}

/**
 * Record a verification attempt
 */
export async function recordVerificationAttempt(
  email: string,
  successful: boolean,
  ipAddress?: string
): Promise<void> {
  await prisma.verificationAttempt.create({
    data: {
      email,
      successful,
      ipAddress,
    },
  });
}

/**
 * Generate a session token (JWT)
 */
export function generateSessionToken(
  email: string,
  expiresInHours: number = VERIFICATION_CONFIG.SESSION_EXPIRY_HOURS
): string {
  const payload = {
    email,
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + expiresInHours * 60 * 60,
  };

  return jwt.sign(payload, VERIFICATION_CONFIG.JWT_SECRET);
}

/**
 * Verify a session token
 */
export function verifySessionToken(token: string): {
  valid: boolean;
  email?: string;
  error?: string;
} {
  try {
    const decoded = jwt.verify(token, VERIFICATION_CONFIG.JWT_SECRET) as {
      email: string;
      exp: number;
    };

    return {
      valid: true,
      email: decoded.email,
    };
  } catch (error) {
    return {
      valid: false,
      error: error instanceof Error ? error.message : 'Invalid token',
    };
  }
}

/**
 * Create a user session in the database
 */
export async function createUserSession(
  email: string,
  metadata?: {
    ipAddress?: string;
    userAgent?: string;
  }
): Promise<{
  token: string;
  expiresAt: Date;
}> {
  const token = generateSessionToken(email);
  const expiresAt = new Date(
    Date.now() + VERIFICATION_CONFIG.SESSION_EXPIRY_HOURS * 60 * 60 * 1000
  );

  await prisma.userSession.create({
    data: {
      email,
      token,
      expiresAt,
      ipAddress: metadata?.ipAddress,
      userAgent: metadata?.userAgent,
    },
  });

  return {
    token,
    expiresAt,
  };
}

/**
 * Validate a session token from the database
 */
export async function validateUserSession(token: string): Promise<{
  valid: boolean;
  email?: string;
  session?: any;
}> {
  // First verify the JWT
  const jwtResult = verifySessionToken(token);
  if (!jwtResult.valid) {
    return { valid: false };
  }

  // Then check if it exists in the database and is active
  const session = await prisma.userSession.findFirst({
    where: {
      token,
      isActive: true,
      expiresAt: {
        gte: new Date(),
      },
    },
  });

  if (!session) {
    return { valid: false };
  }

  // Update last activity
  await prisma.userSession.update({
    where: { id: session.id },
    data: { lastActivity: new Date() },
  });

  return {
    valid: true,
    email: session.email,
    session,
  };
}

/**
 * Invalidate a session
 */
export async function invalidateSession(token: string): Promise<void> {
  await prisma.userSession.updateMany({
    where: { token },
    data: { isActive: false },
  });
}

/**
 * Clean up expired verification codes
 */
export async function cleanupExpiredVerifications(): Promise<number> {
  const result = await prisma.emailVerification.deleteMany({
    where: {
      expiresAt: {
        lt: new Date(),
      },
      verified: false,
    },
  });

  return result.count;
}

/**
 * Clean up expired sessions
 */
export async function cleanupExpiredSessions(): Promise<number> {
  const result = await prisma.userSession.deleteMany({
    where: {
      expiresAt: {
        lt: new Date(),
      },
    },
  });

  return result.count;
}

/**
 * Clean up old verification attempts (older than 24 hours)
 */
export async function cleanupOldAttempts(): Promise<number> {
  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

  const result = await prisma.verificationAttempt.deleteMany({
    where: {
      createdAt: {
        lt: oneDayAgo,
      },
    },
  });

  return result.count;
}
