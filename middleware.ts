/**
 * Vercel Edge Middleware for rate limiting.
 * Prevents suspicious or aggressive repeated requests.
 */

const RATE_LIMIT_WINDOW = 60_000; // 1 minute window
const MAX_REQUESTS = 100; // max requests per window per IP
const BLOCK_DURATION = 300_000; // 5 minutes block for abusers

// In-memory store (resets on cold start, which is fine for edge)
const requestCounts = new Map<string, { count: number; windowStart: number }>();
const blockedIPs = new Map<string, number>();

function getClientIP(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) return forwarded.split(',')[0].trim();
  const real = request.headers.get('x-real-ip');
  if (real) return real;
  return 'unknown';
}

function isRateLimited(ip: string): { limited: boolean; retryAfter?: number } {
  const now = Date.now();

  // Check if IP is blocked
  const blockedUntil = blockedIPs.get(ip);
  if (blockedUntil && blockedUntil > now) {
    return { limited: true, retryAfter: Math.ceil((blockedUntil - now) / 1000) };
  } else if (blockedUntil) {
    blockedIPs.delete(ip);
  }

  // Get or create rate limit entry
  const entry = requestCounts.get(ip);
  if (!entry || (now - entry.windowStart) > RATE_LIMIT_WINDOW) {
    requestCounts.set(ip, { count: 1, windowStart: now });
    return { limited: false };
  }

  entry.count++;

  if (entry.count > MAX_REQUESTS) {
    // Block the IP for BLOCK_DURATION
    blockedIPs.set(ip, now + BLOCK_DURATION);
    requestCounts.delete(ip);
    return { limited: true, retryAfter: Math.ceil(BLOCK_DURATION / 1000) };
  }

  return { limited: false };
}

export default function middleware(request: Request): Response | undefined {
  const ip = getClientIP(request);
  const { limited, retryAfter } = isRateLimited(ip);

  if (limited) {
    return new Response(
      JSON.stringify({
        error: 'Too Many Requests',
        message: 'You have exceeded the rate limit. Please try again later.',
        retryAfter,
      }),
      {
        status: 429,
        headers: {
          'Content-Type': 'application/json',
          'Retry-After': String(retryAfter || 60),
          'X-RateLimit-Limit': String(MAX_REQUESTS),
          'X-RateLimit-Remaining': '0',
        },
      }
    );
  }

  return undefined;
}

export const config = {
  matcher: [
    // Apply rate limiting to API routes and auth endpoints
    '/api/:path*',
    '/auth/:path*',
  ],
};
