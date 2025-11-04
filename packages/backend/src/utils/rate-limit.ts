// Simple in-memory rate limiter
interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const store = new Map<string, RateLimitEntry>();

export interface RateLimitConfig {
  windowMs: number; // Time window in milliseconds
  maxRequests: number; // Max requests per window
}

export function rateLimit(config: RateLimitConfig) {
  return (identifier: string): boolean => {
    const now = Date.now();
    const entry = store.get(identifier);

    // Clean up expired entries
    if (entry && entry.resetAt < now) {
      store.delete(identifier);
    }

    const current = store.get(identifier);
    
    if (!current) {
      // First request in window
      store.set(identifier, {
        count: 1,
        resetAt: now + config.windowMs,
      });
      return true;
    }

    if (current.count >= config.maxRequests) {
      // Rate limit exceeded
      return false;
    }

    // Increment count
    current.count++;
    return true;
  };
}

// Rate limiters for different endpoints
export const authRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  maxRequests: 10,
});

export const apiRateLimit = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  maxRequests: 100,
});

// Clean up expired entries periodically
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of store.entries()) {
    if (entry.resetAt < now) {
      store.delete(key);
    }
  }
}, 60 * 1000); // Every minute

