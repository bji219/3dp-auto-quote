import { NextResponse } from 'next/server';

/**
 * Debug endpoint to check environment variables
 * DELETE THIS FILE after debugging
 */
export async function GET() {
  return NextResponse.json({
    environment: process.env.NODE_ENV,
    isNetlify: !!process.env.NETLIFY,
    hasSupabaseUrl: !!process.env.SUPABASE_DATABASE_URL,
    hasDirectUrl: !!process.env.DIRECT_DATABASE_URL,
    hasDatabaseUrl: !!process.env.DATABASE_URL,
    // Sanitized connection info (first 30 chars only, hide credentials)
    supabaseUrl: process.env.SUPABASE_DATABASE_URL?.substring(0, 30) + '...' || 'Not set',
    directUrl: process.env.DIRECT_DATABASE_URL?.substring(0, 30) + '...' || 'Not set',
    prismaClientAvailable: (() => {
      try {
        require('@prisma/client');
        return true;
      } catch {
        return false;
      }
    })(),
  });
}
