import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { isRestrictedDeviceUserAgent } from './lib/device-access';

export function proxy(request: NextRequest) {
  const token =
    request.cookies.get('authjs.session-token')?.value ||
    request.cookies.get('__Secure-authjs.session-token')?.value;

  const { pathname } = request.nextUrl;
  const isPublicApiRoute = [
    '/api/webhooks/stripe',
    '/api/landing-config',
    '/api/landing-images',
  ].includes(pathname);
  const ua = request.headers.get('user-agent') || '';
  const isRestrictedDevice = isRestrictedDeviceUserAgent(ua);

  // Protected routes — redirect to home if unauthenticated
  const protectedPaths = ['/project', '/dashboard', '/generate', '/edit', '/tools', '/projects', '/profile', '/shared', '/styles', '/editor', '/account', '/canvas', '/studio'];
  const isProtected = protectedPaths.some((p) => pathname.startsWith(p));

  // Phone/tablet users can browse landing pages, but app workspace routes are desktop-only.
  if (isRestrictedDevice && isProtected) {
    const url = request.nextUrl.clone();
    url.pathname = '/';
    return NextResponse.redirect(url);
  }

  if (isProtected && !token) {
    const url = request.nextUrl.clone();
    url.pathname = '/';
    return NextResponse.redirect(url);
  }

  // API routes (except auth/public webhooks) — desktop-only workspace access.
  if (pathname.startsWith('/api') && !pathname.startsWith('/api/auth') && !isPublicApiRoute) {
    if (isRestrictedDevice) {
      return NextResponse.json({ error: 'Desktop access required' }, { status: 403 });
    }

    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/project/:path*',
    '/dashboard/:path*',
    '/generate/:path*',
    '/edit/:path*',
    '/tools/:path*',
    '/projects/:path*',
    '/profile/:path*',
    '/shared/:path*',
    '/styles/:path*',
    '/editor/:path*',
    '/account/:path*',
    '/canvas/:path*',
    '/studio/:path*',
    '/api/((?!auth).*)' ,
  ],
};


