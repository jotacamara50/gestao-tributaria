import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
    // Public paths that don't require authentication
    const publicPaths = ['/login']
    const path = request.nextUrl.pathname

    // Allow public paths
    if (publicPaths.some(publicPath => path.startsWith(publicPath))) {
        return NextResponse.next()
    }

    // Allow API routes and static files
    if (path.startsWith('/api') || path.startsWith('/_next') || path.startsWith('/favicon')) {
        return NextResponse.next()
    }

    // Check for session token (NextAuth v5 uses authjs.session-token)
    const token = request.cookies.get('authjs.session-token') ||
        request.cookies.get('__Secure-authjs.session-token') ||
        request.cookies.get('next-auth.session-token') ||
        request.cookies.get('__Secure-next-auth.session-token')

    // Redirect to login if no token
    if (!token) {
        const loginUrl = new URL('/login', request.url)
        loginUrl.searchParams.set('callbackUrl', path)
        return NextResponse.redirect(loginUrl)
    }

    return NextResponse.next()
}

export const config = {
    matcher: [
        /*
         * Match all request paths except:
         * - _next/static (static files)
         * - _next/image (image optimization files)
         * - favicon.ico (favicon file)
         */
        '/((?!_next/static|_next/image|favicon.ico).*)',
    ],
}
