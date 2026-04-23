import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function proxy(request: NextRequest) {
  const token =
    request.cookies.get('authjs.session-token')?.value ||
    request.cookies.get('__Secure-authjs.session-token')?.value;

  const { pathname } = request.nextUrl;
  const isPublicApiRoute = pathname === '/api/webhooks/stripe';

  // Protected routes — redirect to home if unauthenticated
  const protectedPaths = ['/project', '/dashboard', '/generate', '/edit', '/tools', '/projects', '/profile', '/shared'];
  const isProtected = protectedPaths.some((p) => pathname.startsWith(p));

  if (isProtected && !token) {
    const url = request.nextUrl.clone();
    url.pathname = '/';
    url.searchParams.set('auth', 'login');
    return NextResponse.redirect(url);
  }

  // API routes (except auth) — return 401 if unauthenticated
  if (pathname.startsWith('/api') && !pathname.startsWith('/api/auth') && !isPublicApiRoute && !token) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
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
    '/api/((?!auth).*)' ,
  ],
};


