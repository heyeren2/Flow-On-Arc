import { NextResponse } from 'next/server';

/**
 * Vercel Edge Middleware to block aggressive/malicious bots.
 * This runs at the edge before the request reaches the origin.
 */
export function middleware(request) {
  const userAgent = request.headers.get('user-agent') || '';
  
  // List of aggressive bot signatures
  const blockedBots = [
    'aiohttp',
    'baiduspider',
    'bingbot',
    'blexbot',
    'bytespider',
    'ccbot',
    'claudebot',
    'dotbot',
    'exabot',
    'facebookexternalhit',
    'gptbot',
    'guzzlehttp',
    'mj12bot',
    'petalbot',
    'rogerbot',
    'semrushbot',
    'sogou',
    'twitterbot',
    'yandexbot',
    'headlesschrome',
    'python-requests',
    'node-fetch',
    'axios',
    'curl',
    'wget',
    'postmanruntime',
    'insomnia'
  ];

  const lowerUA = userAgent.toLowerCase();
  const isBlocked = blockedBots.some(bot => lowerUA.includes(bot.toLowerCase()));

  // Allow known browser engines but block headless or suspicious patterns
  if (isBlocked) {
    console.log(`[Middleware] Blocked request from User-Agent: ${userAgent}`);
    return new NextResponse(
      JSON.stringify({ error: 'Access denied: Automated traffic detected.' }),
      { 
        status: 403, 
        headers: { 'content-type': 'application/json' } 
      }
    );
  }

  return NextResponse.next();
}

// Only run middleware on static resource requests if they seem to be the primary target
// or on all requests to catch page-level scraping.
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
};
