/**
 * Vercel Edge Middleware to block aggressive/malicious bots.
 * This runs at the edge before the request reaches the origin.
 * 
 * Note: For non-Next.js projects, we use standard Web APIs (Request/Response).
 */
export default function middleware(request) {
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

  // Block identified bots
  if (isBlocked) {
    console.log(`[Middleware] Blocked request from User-Agent: ${userAgent}`);
    return new Response(
      JSON.stringify({
        error: 'Access denied: Automated traffic detected.',
        message: 'If you are a human and believe this is an error, please contact us.'
      }),
      {
        status: 403,
        headers: { 'content-type': 'application/json' }
      }
    );
  }

  // To allow the request to proceed, return nothing (undefined)
  return;
}

// Optimization: Matcher to limit where the middleware runs
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - assets (Vite assets)
     */
    '/((?!api|_next/static|_next/image|favicon.ico|assets).*)',
  ],
};
