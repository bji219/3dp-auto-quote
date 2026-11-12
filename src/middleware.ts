import { NextRequest, NextResponse } from 'next/server';
import { INTERNAL_COOKIE, passcodeToken, safeEqual } from '@/lib/internal-auth';

export const config = { matcher: ['/internal', '/internal/:path*'] };

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (pathname === '/internal/login') return NextResponse.next();

  const passcode = process.env.INTERNAL_PASSCODE;
  if (!passcode) {
    if (process.env.NODE_ENV === 'production') {
      return new NextResponse('Not found', { status: 404 });
    }
    return NextResponse.next();
  }

  const cookie = request.cookies.get(INTERNAL_COOKIE)?.value ?? '';
  if (safeEqual(cookie, await passcodeToken(passcode))) return NextResponse.next();

  const url = request.nextUrl.clone();
  url.pathname = '/internal/login';
  url.search = '';
  return NextResponse.redirect(url);
}
