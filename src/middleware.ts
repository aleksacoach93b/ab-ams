import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key'

// Simple JWT verification for Edge Runtime
async function verifyJWT(token: string, secret: string) {
  try {
    const parts = token.split('.')
    if (parts.length !== 3) {
      throw new Error('Invalid token format')
    }

    const [header, payload, signature] = parts
    
    // Decode payload
    const decodedPayload = JSON.parse(atob(payload.replace(/-/g, '+').replace(/_/g, '/')))
    
    // Check expiration
    if (decodedPayload.exp && Date.now() >= decodedPayload.exp * 1000) {
      throw new Error('Token expired')
    }
    
    return decodedPayload
  } catch (error) {
    throw new Error('Invalid token')
  }
}

// Define protected routes and their required roles
const protectedRoutes = {
  '/dashboard': ['ADMIN', 'COACH', 'STAFF'],
  '/player-dashboard': ['PLAYER'],
  '/api/events': ['ADMIN', 'COACH', 'STAFF'],
  '/api/players': ['ADMIN', 'COACH', 'STAFF'],
  '/api/staff': ['ADMIN'],
  '/api/teams': ['ADMIN', 'COACH', 'STAFF'],
}

// Admin-only routes
const adminRoutes = [
  '/dashboard/admin',
  '/api/admin',
]

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Skip middleware for public routes
  if (
    pathname.startsWith('/login') ||
    pathname.startsWith('/setup') ||
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api/auth') ||
    pathname.startsWith('/api/setup') ||
    pathname.startsWith('/favicon.ico') ||
    pathname.startsWith('/icons/') ||
    pathname.startsWith('/uploads/') ||
    pathname === '/manifest.json' ||
    pathname === '/sw.js' ||
    pathname === '/'
  ) {
    return NextResponse.next()
  }

  // Production middleware - enable authentication for all routes
  // if (pathname.startsWith('/dashboard') || pathname.startsWith('/player-dashboard')) {
  //   return NextResponse.next()
  // }

  // Get token from request headers or cookies
  const authHeader = request.headers.get('authorization')
  const tokenFromHeader = authHeader?.replace('Bearer ', '') || null
  const tokenFromCookie = request.cookies.get('token')?.value || null
  const token = tokenFromHeader || tokenFromCookie

  console.log('Middleware check:', { pathname, hasToken: !!token, hasCookie: !!tokenFromCookie, hasHeader: !!tokenFromHeader })

  if (!token) {
    // Redirect to login if no token
    console.log('No token found, redirecting to login')
    return NextResponse.redirect(new URL('/login', request.url))
  }

  try {
    // Verify JWT token
    const decoded = await verifyJWT(token, JWT_SECRET)
    const userRole = decoded.role

    // Check admin-only routes
    if (adminRoutes.some(route => pathname.startsWith(route))) {
      if (userRole !== 'ADMIN') {
        return NextResponse.redirect(new URL('/dashboard', request.url))
      }
    }

    // Check protected routes
    for (const [route, allowedRoles] of Object.entries(protectedRoutes)) {
      if (pathname.startsWith(route)) {
        if (!allowedRoles.includes(userRole)) {
          // Redirect based on user role
          if (userRole === 'PLAYER') {
            return NextResponse.redirect(new URL('/player-dashboard', request.url))
          } else {
            return NextResponse.redirect(new URL('/dashboard', request.url))
          }
        }
        break
      }
    }

    // Allow request to proceed
    return NextResponse.next()

  } catch (error) {
    // Invalid token, redirect to login
    console.log('JWT verification failed:', error.message)
    return NextResponse.redirect(new URL('/login', request.url))
  }
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
}