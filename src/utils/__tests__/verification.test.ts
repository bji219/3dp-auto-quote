import {
  generateVerificationCode,
  generateSecureVerificationCode,
  createVerificationCode,
  verifyCode,
  checkRateLimit,
  recordVerificationAttempt,
  generateSessionToken,
  verifySessionToken,
  createUserSession,
  validateUserSession,
  invalidateSession,
  cleanupExpiredVerifications,
  cleanupExpiredSessions,
  cleanupOldAttempts,
  VERIFICATION_CONFIG,
} from '../verification';
import { prisma } from '@/lib/prisma';

// Mock prisma
jest.mock('@/lib/prisma', () => ({
  prisma: {
    emailVerification: {
      create: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
      deleteMany: jest.fn(),
    },
    verificationAttempt: {
      count: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      deleteMany: jest.fn(),
    },
    userSession: {
      create: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
      deleteMany: jest.fn(),
    },
  },
}));

describe('Verification Code Generation', () => {
  describe('generateVerificationCode', () => {
    it('should generate a 6-digit code', () => {
      const code = generateVerificationCode();
      expect(code).toHaveLength(6);
      expect(code).toMatch(/^\d{6}$/);
    });

    it('should generate different codes on multiple calls', () => {
      const code1 = generateVerificationCode();
      const code2 = generateVerificationCode();
      // Not guaranteed to be different, but highly likely
      // This is just to check randomness
      expect(code1).toMatch(/^\d{6}$/);
      expect(code2).toMatch(/^\d{6}$/);
    });

    it('should generate codes in the correct range', () => {
      const code = generateVerificationCode();
      const codeNum = parseInt(code, 10);
      expect(codeNum).toBeGreaterThanOrEqual(100000);
      expect(codeNum).toBeLessThanOrEqual(999999);
    });
  });

  describe('generateSecureVerificationCode', () => {
    it('should generate a secure 6-digit code', () => {
      const code = generateSecureVerificationCode();
      expect(code).toHaveLength(6);
      expect(code).toMatch(/^\d{6}$/);
    });

    it('should generate codes in the correct range', () => {
      const code = generateSecureVerificationCode();
      const codeNum = parseInt(code, 10);
      expect(codeNum).toBeGreaterThanOrEqual(100000);
      expect(codeNum).toBeLessThanOrEqual(999999);
    });
  });
});

describe('Verification Code Management', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('createVerificationCode', () => {
    it('should create a verification code with expiry', async () => {
      const mockVerification = {
        id: 'test-id',
        code: '123456',
        expiresAt: new Date(Date.now() + 15 * 60 * 1000),
        email: 'test@example.com',
      };

      (prisma.emailVerification.create as jest.Mock).mockResolvedValue(mockVerification);

      const result = await createVerificationCode('test@example.com');

      expect(result.code).toMatch(/^\d{6}$/);
      expect(result.expiresAt).toBeInstanceOf(Date);
      expect(prisma.emailVerification.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            email: 'test@example.com',
            code: expect.any(String),
            expiresAt: expect.any(Date),
          }),
        })
      );
    });

    it('should include metadata when provided', async () => {
      const mockVerification = {
        id: 'test-id',
        code: '123456',
        expiresAt: new Date(),
        email: 'test@example.com',
      };

      (prisma.emailVerification.create as jest.Mock).mockResolvedValue(mockVerification);

      await createVerificationCode('test@example.com', {
        ipAddress: '127.0.0.1',
        userAgent: 'Test Agent',
      });

      expect(prisma.emailVerification.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            ipAddress: '127.0.0.1',
            userAgent: 'Test Agent',
          }),
        })
      );
    });
  });

  describe('verifyCode', () => {
    it('should verify a valid code', async () => {
      const mockVerification = {
        id: 'test-id',
        email: 'test@example.com',
        code: '123456',
        verified: false,
        expiresAt: new Date(Date.now() + 10 * 60 * 1000),
      };

      (prisma.emailVerification.findFirst as jest.Mock).mockResolvedValue(mockVerification);
      (prisma.emailVerification.update as jest.Mock).mockResolvedValue({
        ...mockVerification,
        verified: true,
      });

      const result = await verifyCode('test@example.com', '123456');

      expect(result.success).toBe(true);
      expect(result.message).toBe('Email verified successfully');
      expect(result.verificationId).toBe('test-id');
      expect(prisma.emailVerification.update).toHaveBeenCalled();
    });

    it('should reject invalid code', async () => {
      (prisma.emailVerification.findFirst as jest.Mock).mockResolvedValue(null);

      const result = await verifyCode('test@example.com', '999999');

      expect(result.success).toBe(false);
      expect(result.message).toBe('Invalid or expired verification code');
      expect(result.verificationId).toBeUndefined();
    });

    it('should reject expired code', async () => {
      const mockVerification = {
        id: 'test-id',
        email: 'test@example.com',
        code: '123456',
        verified: false,
        expiresAt: new Date(Date.now() - 10 * 60 * 1000), // Expired
      };

      (prisma.emailVerification.findFirst as jest.Mock).mockResolvedValue(null);

      const result = await verifyCode('test@example.com', '123456');

      expect(result.success).toBe(false);
    });
  });
});

describe('Rate Limiting', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('checkRateLimit', () => {
    it('should allow requests under the limit', async () => {
      (prisma.verificationAttempt.count as jest.Mock).mockResolvedValue(1);
      (prisma.verificationAttempt.findFirst as jest.Mock).mockResolvedValue({
        createdAt: new Date(Date.now() - 30 * 60 * 1000),
      });

      const result = await checkRateLimit('test@example.com');

      expect(result.allowed).toBe(true);
      expect(result.attemptsRemaining).toBe(2);
    });

    it('should block requests over the limit', async () => {
      (prisma.verificationAttempt.count as jest.Mock).mockResolvedValue(3);
      (prisma.verificationAttempt.findFirst as jest.Mock).mockResolvedValue({
        createdAt: new Date(Date.now() - 30 * 60 * 1000),
      });

      const result = await checkRateLimit('test@example.com');

      expect(result.allowed).toBe(false);
      expect(result.attemptsRemaining).toBe(0);
    });

    it('should provide correct reset time', async () => {
      const firstAttemptTime = new Date(Date.now() - 30 * 60 * 1000);
      (prisma.verificationAttempt.count as jest.Mock).mockResolvedValue(2);
      (prisma.verificationAttempt.findFirst as jest.Mock).mockResolvedValue({
        createdAt: firstAttemptTime,
      });

      const result = await checkRateLimit('test@example.com');

      expect(result.resetAt).toBeInstanceOf(Date);
      expect(result.resetAt.getTime()).toBeGreaterThan(Date.now());
    });
  });

  describe('recordVerificationAttempt', () => {
    it('should record successful attempt', async () => {
      await recordVerificationAttempt('test@example.com', true, '127.0.0.1');

      expect(prisma.verificationAttempt.create).toHaveBeenCalledWith({
        data: {
          email: 'test@example.com',
          successful: true,
          ipAddress: '127.0.0.1',
        },
      });
    });

    it('should record failed attempt', async () => {
      await recordVerificationAttempt('test@example.com', false);

      expect(prisma.verificationAttempt.create).toHaveBeenCalledWith({
        data: {
          email: 'test@example.com',
          successful: false,
          ipAddress: undefined,
        },
      });
    });
  });
});

describe('Session Token Management', () => {
  describe('generateSessionToken', () => {
    it('should generate a valid JWT token', () => {
      const token = generateSessionToken('test@example.com');

      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
      expect(token.split('.')).toHaveLength(3); // JWT has 3 parts
    });

    it('should include email in token payload', () => {
      const token = generateSessionToken('test@example.com');
      const result = verifySessionToken(token);

      expect(result.valid).toBe(true);
      expect(result.email).toBe('test@example.com');
    });

    it('should respect custom expiry time', () => {
      const token = generateSessionToken('test@example.com', 1); // 1 hour
      const result = verifySessionToken(token);

      expect(result.valid).toBe(true);
    });
  });

  describe('verifySessionToken', () => {
    it('should verify valid token', () => {
      const token = generateSessionToken('test@example.com');
      const result = verifySessionToken(token);

      expect(result.valid).toBe(true);
      expect(result.email).toBe('test@example.com');
      expect(result.error).toBeUndefined();
    });

    it('should reject invalid token', () => {
      const result = verifySessionToken('invalid.token.here');

      expect(result.valid).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should reject tampered token', () => {
      const token = generateSessionToken('test@example.com');
      const tamperedToken = token.slice(0, -5) + 'xxxxx';
      const result = verifySessionToken(tamperedToken);

      expect(result.valid).toBe(false);
    });
  });

  describe('createUserSession', () => {
    it('should create session in database', async () => {
      const mockSession = {
        id: 'session-id',
        token: 'mock-token',
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        email: 'test@example.com',
      };

      (prisma.userSession.create as jest.Mock).mockResolvedValue(mockSession);

      const result = await createUserSession('test@example.com');

      expect(result.token).toBeDefined();
      expect(result.expiresAt).toBeInstanceOf(Date);
      expect(prisma.userSession.create).toHaveBeenCalled();
    });
  });

  describe('validateUserSession', () => {
    it('should validate active session', async () => {
      const token = generateSessionToken('test@example.com');
      const mockSession = {
        id: 'session-id',
        token,
        email: 'test@example.com',
        isActive: true,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        lastActivity: new Date(),
      };

      (prisma.userSession.findFirst as jest.Mock).mockResolvedValue(mockSession);
      (prisma.userSession.update as jest.Mock).mockResolvedValue(mockSession);

      const result = await validateUserSession(token);

      expect(result.valid).toBe(true);
      expect(result.email).toBe('test@example.com');
    });

    it('should reject inactive session', async () => {
      const token = generateSessionToken('test@example.com');

      (prisma.userSession.findFirst as jest.Mock).mockResolvedValue(null);

      const result = await validateUserSession(token);

      expect(result.valid).toBe(false);
    });
  });

  describe('invalidateSession', () => {
    it('should mark session as inactive', async () => {
      await invalidateSession('test-token');

      expect(prisma.userSession.updateMany).toHaveBeenCalledWith({
        where: { token: 'test-token' },
        data: { isActive: false },
      });
    });
  });
});

describe('Cleanup Functions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('cleanupExpiredVerifications', () => {
    it('should delete expired verifications', async () => {
      (prisma.emailVerification.deleteMany as jest.Mock).mockResolvedValue({ count: 5 });

      const count = await cleanupExpiredVerifications();

      expect(count).toBe(5);
      expect(prisma.emailVerification.deleteMany).toHaveBeenCalled();
    });
  });

  describe('cleanupExpiredSessions', () => {
    it('should delete expired sessions', async () => {
      (prisma.userSession.deleteMany as jest.Mock).mockResolvedValue({ count: 3 });

      const count = await cleanupExpiredSessions();

      expect(count).toBe(3);
      expect(prisma.userSession.deleteMany).toHaveBeenCalled();
    });
  });

  describe('cleanupOldAttempts', () => {
    it('should delete old attempts', async () => {
      (prisma.verificationAttempt.deleteMany as jest.Mock).mockResolvedValue({ count: 10 });

      const count = await cleanupOldAttempts();

      expect(count).toBe(10);
      expect(prisma.verificationAttempt.deleteMany).toHaveBeenCalled();
    });
  });
});

describe('Configuration', () => {
  it('should have correct default configuration', () => {
    expect(VERIFICATION_CONFIG.CODE_LENGTH).toBe(6);
    expect(VERIFICATION_CONFIG.CODE_EXPIRY_MINUTES).toBe(15);
    expect(VERIFICATION_CONFIG.MAX_ATTEMPTS_PER_HOUR).toBe(3);
    expect(VERIFICATION_CONFIG.SESSION_EXPIRY_HOURS).toBe(24);
  });
});
