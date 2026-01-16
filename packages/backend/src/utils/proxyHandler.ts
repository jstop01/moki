/**
 * Proxy Handler - forwards requests to real APIs
 */

import { Request } from 'express';
import { ProxyConfig } from '@mock-api-builder/shared';

interface ProxyResponse {
  status: number;
  data: any;
  headers: Record<string, string>;
}

// Simple in-memory cache
const proxyCache = new Map<string, { data: ProxyResponse; expiry: number }>();

/**
 * Generate cache key from request
 */
function getCacheKey(method: string, url: string, body?: any): string {
  const bodyHash = body ? JSON.stringify(body) : '';
  return `${method}:${url}:${bodyHash}`;
}

/**
 * Clean expired cache entries
 */
function cleanExpiredCache(): void {
  const now = Date.now();
  for (const [key, value] of proxyCache.entries()) {
    if (value.expiry < now) {
      proxyCache.delete(key);
    }
  }
}

/**
 * Rewrite path based on configuration
 */
function rewritePath(path: string, rewrites?: Record<string, string>): string {
  if (!rewrites) return path;

  for (const [pattern, replacement] of Object.entries(rewrites)) {
    const regex = new RegExp(pattern);
    if (regex.test(path)) {
      return path.replace(regex, replacement);
    }
  }
  return path;
}

/**
 * Forward request to target API
 */
export async function proxyRequest(
  req: Request,
  config: ProxyConfig,
  originalPath: string
): Promise<ProxyResponse> {
  // Clean expired cache periodically
  if (Math.random() < 0.1) cleanExpiredCache();

  // Build target URL
  const rewrittenPath = rewritePath(originalPath, config.pathRewrite);
  const targetUrl = new URL(rewrittenPath, config.targetUrl);

  // Add query params
  const queryString = new URLSearchParams(req.query as Record<string, string>).toString();
  if (queryString) {
    targetUrl.search = queryString;
  }

  const fullUrl = targetUrl.toString();
  const cacheKey = getCacheKey(req.method, fullUrl, req.body);

  // Check cache
  if (config.cacheResponse) {
    const cached = proxyCache.get(cacheKey);
    if (cached && cached.expiry > Date.now()) {
      console.log(`[Proxy] Cache hit: ${fullUrl}`);
      return cached.data;
    }
  }

  console.log(`[Proxy] Forwarding ${req.method} ${fullUrl}`);

  // Build headers
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...config.headers,
  };

  // Forward certain original headers
  const forwardHeaders = ['authorization', 'x-api-key', 'accept', 'accept-language'];
  for (const header of forwardHeaders) {
    const value = req.get(header);
    if (value) {
      headers[header] = value;
    }
  }

  try {
    const fetchOptions: RequestInit = {
      method: req.method,
      headers,
      signal: AbortSignal.timeout(config.timeout || 30000),
    };

    // Add body for non-GET requests
    if (req.method !== 'GET' && req.method !== 'HEAD' && req.body) {
      fetchOptions.body = JSON.stringify(req.body);
    }

    const response = await fetch(fullUrl, fetchOptions);

    // Parse response
    let data: any;
    const contentType = response.headers.get('content-type') || '';

    if (contentType.includes('application/json')) {
      data = await response.json();
    } else {
      data = await response.text();
    }

    // Extract response headers
    const responseHeaders: Record<string, string> = {};
    response.headers.forEach((value, key) => {
      // Skip certain headers
      if (!['content-encoding', 'transfer-encoding', 'connection'].includes(key.toLowerCase())) {
        responseHeaders[key] = value;
      }
    });

    const result: ProxyResponse = {
      status: response.status,
      data,
      headers: responseHeaders,
    };

    // Cache response
    if (config.cacheResponse && response.ok) {
      const ttl = (config.cacheTtl || 300) * 1000; // Default 5 minutes
      proxyCache.set(cacheKey, {
        data: result,
        expiry: Date.now() + ttl,
      });
      console.log(`[Proxy] Cached response for ${ttl / 1000}s`);
    }

    return result;
  } catch (error: any) {
    console.error(`[Proxy] Error: ${error.message}`);

    // Return error response
    return {
      status: 502,
      data: {
        error: 'Proxy Error',
        message: error.message,
        target: fullUrl,
      },
      headers: {},
    };
  }
}

/**
 * Clear proxy cache
 */
export function clearProxyCache(): void {
  proxyCache.clear();
  console.log('[Proxy] Cache cleared');
}

/**
 * Get cache stats
 */
export function getProxyCacheStats(): { size: number; keys: string[] } {
  return {
    size: proxyCache.size,
    keys: Array.from(proxyCache.keys()),
  };
}
