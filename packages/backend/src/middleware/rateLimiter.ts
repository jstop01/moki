import { Request, Response } from 'express';
import { RateLimitConfig, RateLimitKeyBy } from '@mock-api-builder/shared';

/**
 * Rate limit entry for tracking requests
 */
interface RateLimitEntry {
  count: number;
  windowStart: number;
  burstUsed: number;
}

/**
 * Rate limit storage (in-memory)
 * Key format: `${endpointId}:${rateLimitKey}`
 */
const rateLimitStore = new Map<string, RateLimitEntry>();

/**
 * Clean up expired entries periodically
 */
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of rateLimitStore.entries()) {
    // Remove entries older than 1 hour
    if (now - entry.windowStart > 3600000) {
      rateLimitStore.delete(key);
    }
  }
}, 60000); // Run every minute

/**
 * Default rate limit response
 */
const defaultRateLimitResponse = {
  status: 429,
  data: {
    error: 'Too Many Requests',
    message: 'Rate limit exceeded. Please try again later.',
    retryAfter: 60,
  },
};

/**
 * Extract rate limit key from request
 */
function extractRateLimitKey(
  req: Request,
  keyBy: RateLimitKeyBy,
  keyName?: string
): string {
  switch (keyBy) {
    case 'ip':
      return req.ip || req.socket.remoteAddress || 'unknown';

    case 'header':
      if (!keyName) return 'no-key';
      return req.get(keyName) || 'no-key';

    case 'query':
      if (!keyName) return 'no-key';
      return (req.query[keyName] as string) || 'no-key';

    default:
      return 'unknown';
  }
}

/**
 * Check and update rate limit
 * Returns: { allowed: boolean, remaining: number, resetIn: number }
 */
function checkRateLimit(
  endpointId: string,
  rateLimitKey: string,
  config: RateLimitConfig
): { allowed: boolean; remaining: number; resetIn: number; total: number } {
  const storeKey = `${endpointId}:${rateLimitKey}`;
  const now = Date.now();
  const windowMs = (config.windowSeconds || 60) * 1000;
  const maxRequests = config.requestsPerWindow;
  const burstLimit = config.burstLimit || 0;

  let entry = rateLimitStore.get(storeKey);

  // Check if we need to reset the window
  if (!entry || now - entry.windowStart >= windowMs) {
    entry = {
      count: 0,
      windowStart: now,
      burstUsed: 0,
    };
  }

  const totalLimit = maxRequests + burstLimit;
  const remaining = Math.max(0, totalLimit - entry.count - 1);
  const resetIn = Math.ceil((entry.windowStart + windowMs - now) / 1000);

  // Check if request is allowed
  if (entry.count < maxRequests) {
    // Within normal limit
    entry.count++;
    rateLimitStore.set(storeKey, entry);
    return { allowed: true, remaining, resetIn, total: totalLimit };
  } else if (entry.count < totalLimit) {
    // Using burst capacity
    entry.count++;
    entry.burstUsed++;
    rateLimitStore.set(storeKey, entry);
    return { allowed: true, remaining, resetIn, total: totalLimit };
  }

  // Rate limited
  return { allowed: false, remaining: 0, resetIn, total: totalLimit };
}

/**
 * Rate limit result for external use
 */
export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetIn: number;
  total: number;
}

/**
 * Validate rate limit for an endpoint
 */
export function validateRateLimit(
  req: Request,
  endpointId: string,
  config: RateLimitConfig
): RateLimitResult {
  if (!config.enabled) {
    return { allowed: true, remaining: -1, resetIn: 0, total: 0 };
  }

  const rateLimitKey = extractRateLimitKey(req, config.keyBy, config.keyName);
  return checkRateLimit(endpointId, rateLimitKey, config);
}

/**
 * Send rate limit exceeded response
 */
export function sendRateLimitError(
  res: Response,
  result: RateLimitResult,
  customResponse?: RateLimitConfig['response']
): void {
  const response = customResponse || defaultRateLimitResponse;

  // Set rate limit headers
  res.setHeader('X-RateLimit-Limit', result.total);
  res.setHeader('X-RateLimit-Remaining', result.remaining);
  res.setHeader('X-RateLimit-Reset', result.resetIn);
  res.setHeader('Retry-After', result.resetIn);

  res.status(response.status).json({
    ...response.data,
    retryAfter: result.resetIn,
  });
}

/**
 * Set rate limit headers on successful response
 */
export function setRateLimitHeaders(
  res: Response,
  result: RateLimitResult
): void {
  if (result.total > 0) {
    res.setHeader('X-RateLimit-Limit', result.total);
    res.setHeader('X-RateLimit-Remaining', result.remaining);
    res.setHeader('X-RateLimit-Reset', result.resetIn);
  }
}

/**
 * Reset rate limit for a specific endpoint and key
 */
export function resetRateLimit(endpointId: string, rateLimitKey?: string): void {
  if (rateLimitKey) {
    rateLimitStore.delete(`${endpointId}:${rateLimitKey}`);
  } else {
    // Reset all keys for this endpoint
    for (const key of rateLimitStore.keys()) {
      if (key.startsWith(`${endpointId}:`)) {
        rateLimitStore.delete(key);
      }
    }
  }
}

/**
 * Reset all rate limits
 */
export function resetAllRateLimits(): void {
  rateLimitStore.clear();
}

/**
 * Get rate limit stats for debugging
 */
export function getRateLimitStats(): Record<string, RateLimitEntry> {
  const stats: Record<string, RateLimitEntry> = {};
  for (const [key, entry] of rateLimitStore.entries()) {
    stats[key] = { ...entry };
  }
  return stats;
}
