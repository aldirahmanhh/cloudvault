// Rate limiting for auth endpoints
// Prevents brute force attacks and spam registration

const rateLimitStore = new Map();
const failedAttemptsStore = new Map();

/**
 * Rate limiter with sliding window
 * @param {string} identifier - IP address or username
 * @param {number} maxRequests - Max requests allowed
 * @param {number} windowMs - Time window in milliseconds
 * @returns {Object} { allowed: boolean, remaining: number, resetAt: number }
 */
export function checkRateLimit(identifier, maxRequests = 5, windowMs = 60000) {
  const now = Date.now();
  const key = `rate:${identifier}`;
  
  const record = rateLimitStore.get(key) || { requests: [], resetAt: now + windowMs };
  
  // Remove expired requests
  record.requests = record.requests.filter(timestamp => now - timestamp < windowMs);
  
  if (record.requests.length >= maxRequests) {
    return {
      allowed: false,
      remaining: 0,
      resetAt: record.resetAt,
      retryAfter: Math.ceil((record.resetAt - now) / 1000),
    };
  }
  
  record.requests.push(now);
  record.resetAt = now + windowMs;
  rateLimitStore.set(key, record);
  
  return {
    allowed: true,
    remaining: maxRequests - record.requests.length,
    resetAt: record.resetAt,
  };
}

/**
 * Track failed login attempts with exponential backoff
 * @param {string} identifier - Username or IP
 * @returns {Object} { allowed: boolean, attempts: number, waitTime: number }
 */
export function checkFailedAttempts(identifier) {
  const now = Date.now();
  const key = `failed:${identifier}`;
  
  const record = failedAttemptsStore.get(key) || { count: 0, lockedUntil: 0 };
  
  // Check if still locked
  if (record.lockedUntil > now) {
    const waitTime = Math.ceil((record.lockedUntil - now) / 1000);
    return {
      allowed: false,
      attempts: record.count,
      waitTime,
      message: `Terlalu banyak percobaan gagal. Coba lagi dalam ${waitTime} detik.`,
    };
  }
  
  // Reset if lock expired
  if (record.lockedUntil > 0 && record.lockedUntil <= now) {
    record.count = 0;
    record.lockedUntil = 0;
  }
  
  return {
    allowed: true,
    attempts: record.count,
    waitTime: 0,
  };
}

/**
 * Record failed login attempt with exponential backoff
 * Lockout durations: 30s, 2min, 5min, 15min, 1hour
 */
export function recordFailedAttempt(identifier) {
  const now = Date.now();
  const key = `failed:${identifier}`;
  
  const record = failedAttemptsStore.get(key) || { count: 0, lockedUntil: 0 };
  record.count += 1;
  
  // Exponential backoff: 30s, 2m, 5m, 15m, 1h
  const lockoutDurations = [30, 120, 300, 900, 3600];
  const lockoutIndex = Math.min(record.count - 3, lockoutDurations.length - 1);
  
  if (record.count >= 3) {
    const lockoutSeconds = lockoutDurations[lockoutIndex];
    record.lockedUntil = now + (lockoutSeconds * 1000);
  }
  
  failedAttemptsStore.set(key, record);
  
  return {
    attempts: record.count,
    lockedUntil: record.lockedUntil,
  };
}

/**
 * Reset failed attempts on successful login
 */
export function resetFailedAttempts(identifier) {
  const key = `failed:${identifier}`;
  failedAttemptsStore.delete(key);
}

/**
 * Get client IP from request
 */
export function getClientIp(request) {
  // Vercel provides real IP in x-forwarded-for or x-real-ip
  const forwarded = request.headers.get('x-forwarded-for');
  const realIp = request.headers.get('x-real-ip');
  
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  
  return realIp || 'unknown';
}

/**
 * Cleanup old entries (run periodically)
 */
export function cleanupRateLimitStore() {
  const now = Date.now();
  
  // Cleanup rate limit store
  for (const [key, record] of rateLimitStore.entries()) {
    if (record.resetAt < now) {
      rateLimitStore.delete(key);
    }
  }
  
  // Cleanup failed attempts store
  for (const [key, record] of failedAttemptsStore.entries()) {
    if (record.lockedUntil > 0 && record.lockedUntil < now - 3600000) {
      // Remove entries locked more than 1 hour ago
      failedAttemptsStore.delete(key);
    }
  }
}

// Auto cleanup every 5 minutes
if (typeof setInterval !== 'undefined') {
  setInterval(cleanupRateLimitStore, 5 * 60 * 1000);
}
