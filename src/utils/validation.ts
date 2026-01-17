import { z } from 'zod';

/**
 * Email validation schema
 */
export const emailSchema = z.string().email('Invalid email address');

/**
 * File upload validation schema
 */
export const fileUploadSchema = z.object({
  fileName: z.string().min(1, 'File name is required').regex(/\.stl$/i, 'File must be an STL file'),
  fileSize: z.number().positive().max(50 * 1024 * 1024, 'File size must not exceed 50MB'),
});

/**
 * Quote request validation schema
 */
export const quoteRequestSchema = z.object({
  email: emailSchema,
  fileName: z.string().min(1),
  fileSize: z.number().positive(),
  material: z.string().optional().default('PLA'),
  infillPercentage: z.number().min(0).max(100).optional().default(20),
  quality: z.enum(['draft', 'standard', 'high']).optional().default('standard'),
  color: z.string().optional(),
  rushOrder: z.boolean().optional().default(false),
});

/**
 * Verification token schema
 */
export const verificationTokenSchema = z.string().min(32, 'Invalid verification token');

/**
 * Validate email format
 */
export function isValidEmail(email: string): boolean {
  try {
    emailSchema.parse(email);
    return true;
  } catch {
    return false;
  }
}

/**
 * Validate file extension
 */
export function isValidSTLFile(fileName: string): boolean {
  return /\.stl$/i.test(fileName);
}

/**
 * Generate verification token
 */
export function generateVerificationToken(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let token = '';
  for (let i = 0; i < 64; i++) {
    token += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return token;
}

/**
 * Generate file hash
 */
export async function generateFileHash(buffer: ArrayBuffer): Promise<string> {
  const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  return hashHex;
}
