import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
    const { pathname } = request.nextUrl;

    // Public routes
    const publicRoutes = ['/', '/login', '/register', '/forgot-password', '/setup'];
    if (publicRoutes.some(route => pathname === route || pathname.startsWith(route + '/')) || pathname.startsWith('/api/auth')) {
        return NextResponse.next();
    }

    // Check authentication (Basic check for now)
    // Since we rely on client-side Firebase Auth, we primarily handle redirects in components.
    // We allow the request to proceed to the page, where the AuthGuard (AuthContext) will redirect if needed.

    return NextResponse.next();
}

export const config = {
    matcher: [
        '/((?!_next/static|_next/image|favicon.ico).*)',
    ],
};
