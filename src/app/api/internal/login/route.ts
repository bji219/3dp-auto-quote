import { NextRequest, NextResponse } from 'next/server';
import { INTERNAL_COOKIE, passcodeToken, safeEqual } from '@/lib/internal-auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  const expected = process.env.INTERNAL_PASSCODE;
  if (!expected) {
    return NextResponse.json(
      { success: false, message: 'INTERNAL_PASSCODE is not set.' },
      { status: 404 }
    );
  }
  const body = await request.json().catch(() => ({}));
  const given = typeof body.passcode === 'string' ? body.passcode : '';
  // Slow guessing down a little; this is a single shared passcode.
  await new Promise((r) => setTimeout(r, 400));
  if (!safeEqual(await passcodeToken(given), await passcodeToken(expected))) {
    return NextResponse.json({ success: false, message: 'Wrong passcode.' }, { status: 401 });
  }
  const response = NextResponse.json({ success: true });
  response.cookies.set(INTERNAL_COOKIE, await passcodeToken(expected), {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 30,
  });
  return response;
}
