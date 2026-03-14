import { NextResponse, type NextRequest } from "next/server"

const publicRoutes = ["/landing","/public","/api/payments/dodo/webhook","/api/payments/stripe/webhook","/api/trpc", "/auth-callback", "/api/scaffold"]

const authRoutes =["/sign-in","/sign-up","/error","/forgot-password","/reset-password",'/email-verified',"/api/auth"]

const apiAuthPrefix = "/api/auth"

const allowedOrigins = ['http://localhost:3000', 'http://localhost:5173', process.env.NEXT_PUBLIC_URL].filter(Boolean) as string[]

const corsOptions = {
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  }

export default async function middleware(req:NextRequest){

    const origin = req.headers.get('origin') ?? ''
    const pathName = req.nextUrl.pathname;
    const sameHost = origin && new URL(origin).host === req.nextUrl.host;
    const isAllowedOrigin = sameHost || allowedOrigins.includes(origin)


    const isApiAuthRoute = pathName.startsWith(apiAuthPrefix);
    const isPublicRoute =  publicRoutes.some((route) => pathName.startsWith(route));
    const isAuthRoute = authRoutes.includes(pathName);    
  
    const response = NextResponse.next()

    // Handle preflighted requests
    const isPreflight = req.method === 'OPTIONS'
    
    if (isPreflight) {
        const preflightHeaders = {
        ...(isAllowedOrigin && { 
            'Access-Control-Allow-Origin': origin,
            'Access-Control-Allow-Credentials': 'true'
        }),
        ...corsOptions,
        }
        return NextResponse.json({}, { headers: preflightHeaders })
    }

    // Set CORS headers on all responses for allowed origins
    if (isAllowedOrigin) {
        response.headers.set('Access-Control-Allow-Origin', origin)
        response.headers.set('Access-Control-Allow-Credentials', 'true')
    }
     
    Object.entries(corsOptions).forEach(([key, value]) => {
        response.headers.set(key, value)
    })

    // Avoid infinite recursion: don't fetch session for /api/auth routes
    if (isApiAuthRoute || isPublicRoute) {
        return response;
    }

    // Check for both the local and Secure (production HTTPS) cookie prefixes.
    // Better Auth uses __Secure- prefix in production.
    const sessionToken = req.cookies.get('better-auth.session_token')?.value || req.cookies.get('__Secure-better-auth.session_token')?.value;
    const isLoggedIn = !!sessionToken;


    if (isAuthRoute){
        if (isLoggedIn){
            return Response.redirect(new URL('/',req.nextUrl));
        }
        return response;
    }

    if (!isLoggedIn && !isPublicRoute){
        return Response.redirect(new URL('/landing',req.nextUrl));
    }


    return response
}

export const config = {
    matcher: ['/((?!.+\\.[\\w]+$|_next).*)','/','/(api|trpc)(.*)'],
}