/**
 * Rate Limiting Middleware for Cloudflare Workers
 *
 * Uses KV namespace to implement token bucket rate limiting.
 */

import { logWithContext } from './log';
import type { Env } from './types';

// ============================================================================
// Types
// ============================================================================

export interface RateLimitConfig {
  requests: number;      // Max requests per window
  windowMs: number;      // Time window in milliseconds
  keyPrefix?: string;    // Prefix for KV keys
}

export interface RateLimitResult {
  allowed: boolean;
  limit: number;
  remaining: number;
  resetAt: number;
  error?: string;
}

// ============================================================================
// Default Configurations
// ============================================================================

const DEFAULT_RATE_LIMITS: Record<string, RateLimitConfig> = {
  // Webhooks - higher limit due to GitHub event bursts
  webhook: { requests: 100, windowMs: 60000, keyPrefix: 'webhook' },

  // Interactive sessions - moderate limit
  interactive: { requests: 20, windowMs: 60000, keyPrefix: 'interactive' },

  // API endpoints - moderate limit
  api: { requests: 100, windowMs: 60000, keyPrefix: 'api' },

  // Health/metrics - higher limit for monitoring
  monitoring: { requests: 300, windowMs: 60000, keyPrefix: 'monitor' },

  // Default - conservative limit
  default: { requests: 60, windowMs: 60000, keyPrefix: 'default' },
};

// ============================================================================
// Rate Limiting Functions
// ============================================================================

/**
 * Check if a request should be rate limited
 */
export async function checkRateLimit(
  env: Env,
  identifier: string,
  category: string = 'default'
): Promise<RateLimitResult> {
  const config = DEFAULT_RATE_LIMITS[category] || DEFAULT_RATE_LIMITS.default;
  const kv = env.RATE_LIMIT_KV;

  if (!kv) {
    // KV not configured - allow all requests but log warning
    logWithContext('RATE_LIMIT', 'KV namespace not configured, rate limiting disabled');
    return {
      allowed: true,
      limit: config.requests,
      remaining: config.requests,
      resetAt: Date.now() + config.windowMs
    };
  }

  const key = `${config.keyPrefix}:${identifier}`;
  const now = Date.now();
  const windowStart = now - config.windowMs;

  try {
    // Get current counter from KV
    const data = await kv.get(key, 'json');
    const counter = data as { count: number; resetAt: number } | null;

    // If no existing counter or window expired, start fresh
    if (!counter || counter.resetAt < now) {
      const newCounter = { count: 1, resetAt: now + config.windowMs };
      await kv.put(key, JSON.stringify(newCounter), {
        expirationTtl: Math.ceil(config.windowMs / 1000) + 60
      });

      return {
        allowed: true,
        limit: config.requests,
        remaining: config.requests - 1,
        resetAt: newCounter.resetAt
      };
    }

    // Check if limit exceeded
    if (counter.count >= config.requests) {
      return {
        allowed: false,
        limit: config.requests,
        remaining: 0,
        resetAt: counter.resetAt,
        error: `Rate limit exceeded. Try again in ${Math.ceil((counter.resetAt - now) / 1000)} seconds.`
      };
    }

    // Increment counter
    const newCounter = { count: counter.count + 1, resetAt: counter.resetAt };
    await kv.put(key, JSON.stringify(newCounter), {
      expirationTtl: Math.ceil(config.windowMs / 1000) + 60
    });

    return {
      allowed: true,
      limit: config.requests,
      remaining: config.requests - newCounter.count,
      resetAt: newCounter.resetAt
    };

  } catch (error) {
    // On KV errors, allow request but log
    logWithContext('RATE_LIMIT', 'KV error, allowing request', {
      error: error instanceof Error ? error.message : String(error)
    });
    return {
      allowed: true,
      limit: config.requests,
      remaining: config.requests,
      resetAt: now + config.windowMs
    };
  }
}

/**
 * Extract client identifier from request
 */
export function getClientIdentifier(request: Request): string {
  // Try to get IP from CF-Connecting-IP header (set by Cloudflare)
  const cfIp = request.headers.get('CF-Connecting-IP');
  if (cfIp) {
    return cfIp;
  }

  // Fallback to X-Forwarded-For
  const xff = request.headers.get('X-Forwarded-For');
  if (xff) {
    return xff.split(',')[0].trim();
  }

  // Final fallback - use a hash of the request
  return 'anonymous';
}

/**
 * Determine rate limit category from request path
 */
export function getCategoryFromPath(pathname: string): string {
  if (pathname.startsWith('/webhooks/')) return 'webhook';
  if (pathname.startsWith('/interactive/')) return 'interactive';
  if (pathname.startsWith('/api/')) return 'api';
  if (pathname === '/health' || pathname === '/metrics' || pathname.startsWith('/metrics/')) return 'monitoring';
  return 'default';
}

/**
 * Rate limiting middleware for Workers
 */
export async function applyRateLimit(
  request: Request,
  env: Env,
  pathname: string
): Promise<{ allowed: boolean; response?: Response }> {
  const category = getCategoryFromPath(pathname);
  const identifier = getClientIdentifier(request);

  const result = await checkRateLimit(env, identifier, category);

  if (!result.allowed) {
    const response = new Response(JSON.stringify({
      error: 'Rate limit exceeded',
      message: result.error,
      limit: result.limit,
      resetAt: result.resetAt
    }), {
      status: 429,
      headers: {
        'Content-Type': 'application/json',
        'X-RateLimit-Limit': result.limit.toString(),
        'X-RateLimit-Remaining': '0',
        'X-RateLimit-Reset': result.resetAt.toString(),
        'Retry-After': Math.ceil((result.resetAt - Date.now()) / 1000).toString()
      }
    });

    logWithContext('RATE_LIMIT', 'Request rate limited', {
      identifier,
      category,
      pathname
    });

    return { allowed: false, response };
  }

  return { allowed: true };
}

/**
 * Add rate limit headers to response
 */
export function addRateLimitHeaders(
  response: Response,
  result: RateLimitResult
): Response {
  const headers = new Headers(response.headers);
  headers.set('X-RateLimit-Limit', result.limit.toString());
  headers.set('X-RateLimit-Remaining', result.remaining.toString());
  headers.set('X-RateLimit-Reset', result.resetAt.toString());

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers
  });
}
