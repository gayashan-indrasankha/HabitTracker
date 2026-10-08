import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { auth } from '@/lib/auth/server';

// Routes that require authentication
const PROTECTED_PREFIXES = ['/today', '/week', '/goals', '/review', '/dashboard', '/habits', '/notes', '/settings'];

// Routes that should redirect authenticated users away (sign-in, sign-up)
const AUTH_ROUTES = ['/login', '/register', '/sign-in', '/sign-up'];

function matchesRoute(pathname: string, route: string) {
  return pathname === route || pathname.startsWith(`${route}/`);
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const isProtected = PROTECTED_PREFIXES.some((prefix) =>
    matchesRoute(pathname, prefix),
  );
  const isAuthRoute = AUTH_ROUTES.some((route) => matchesRoute(pathname, route));

  if (!isProtected && !isAuthRoute) {
    return NextResponse.next();
  }

  const session = await auth.api.getSession({
    headers: request.headers,
  });

  if (isProtected && !session?.user) {
    const signInUrl = new URL('/login', request.url);
    signInUrl.searchParams.set('next', pathname + request.nextUrl.search);
    return NextResponse.redirect(signInUrl);
  }

  if (isAuthRoute && session?.user) {
    return NextResponse.redirect(new URL('/today', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
