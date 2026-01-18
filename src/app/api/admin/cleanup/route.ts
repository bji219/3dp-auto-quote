import { NextRequest, NextResponse } from 'next/server';
import { runAllCleanupJobs, getCleanupStats } from '@/utils/cleanup-jobs';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET /api/admin/cleanup
 * Get cleanup statistics without performing cleanup
 */
export async function GET(request: NextRequest) {
  try {
    // Optional: Add admin authentication here
    const authHeader = request.headers.get('x-admin-key');
    if (process.env.ADMIN_API_KEY && authHeader !== process.env.ADMIN_API_KEY) {
      return NextResponse.json(
        {
          success: false,
          message: 'Unauthorized',
        },
        { status: 401 }
      );
    }

    const stats = await getCleanupStats();

    return NextResponse.json(
      {
        success: true,
        message: 'Cleanup statistics retrieved',
        stats,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Get cleanup stats error:', error);
    return NextResponse.json(
      {
        success: false,
        message: 'Internal server error',
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/cleanup
 * Run all cleanup jobs
 */
export async function POST(request: NextRequest) {
  try {
    // Optional: Add admin authentication here
    const authHeader = request.headers.get('x-admin-key');
    if (process.env.ADMIN_API_KEY && authHeader !== process.env.ADMIN_API_KEY) {
      return NextResponse.json(
        {
          success: false,
          message: 'Unauthorized',
        },
        { status: 401 }
      );
    }

    const stats = await runAllCleanupJobs();

    return NextResponse.json(
      {
        success: true,
        message: 'Cleanup jobs completed',
        stats,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Cleanup jobs error:', error);
    return NextResponse.json(
      {
        success: false,
        message: 'Internal server error',
      },
      { status: 500 }
    );
  }
}
