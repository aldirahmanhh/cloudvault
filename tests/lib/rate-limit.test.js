import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock environment variables
process.env.DISCORD_BOT_TOKEN = 'test-discord-token';
process.env.DISCORD_CHANNEL_ID = 'test-channel-id';
process.env.TELEGRAM_BOT_TOKEN = 'test-telegram-token';
process.env.TELEGRAM_CHAT_ID = 'test-chat-id';
process.env.JWT_SECRET = 'test-jwt-secret-with-at-least-32-chars-long';

describe('Rate Limiting', () => {
  let checkRateLimit, resetRateLimitStore;

  beforeEach(async () => {
    // Dynamic import to avoid module-level env validation
    const module = await import('@/lib/rate-limit');
    checkRateLimit = module.checkRateLimit;
    
    // Clear rate limit store between tests
    const rateLimitModule = await import('@/lib/rate-limit');
    if (rateLimitModule.cleanupRateLimitStore) {
      rateLimitModule.cleanupRateLimitStore();
    }
  });

  it('should allow requests within limit', () => {
    const result1 = checkRateLimit('test-user', 5, 60000);
    expect(result1.allowed).toBe(true);
    expect(result1.remaining).toBe(4);

    const result2 = checkRateLimit('test-user', 5, 60000);
    expect(result2.allowed).toBe(true);
    expect(result2.remaining).toBe(3);
  });

  it('should block requests exceeding limit', () => {
    // Make 5 requests (limit)
    for (let i = 0; i < 5; i++) {
      checkRateLimit('test-user-2', 5, 60000);
    }

    // 6th request should be blocked
    const result = checkRateLimit('test-user-2', 5, 60000);
    expect(result.allowed).toBe(false);
    expect(result.remaining).toBe(0);
    expect(result.retryAfter).toBeGreaterThan(0);
  });

  it('should track different users separately', () => {
    checkRateLimit('user-a', 2, 60000);
    checkRateLimit('user-a', 2, 60000);
    
    const resultA = checkRateLimit('user-a', 2, 60000);
    expect(resultA.allowed).toBe(false);

    const resultB = checkRateLimit('user-b', 2, 60000);
    expect(resultB.allowed).toBe(true);
  });
});

describe('Failed Login Attempts', () => {
  let checkFailedAttempts, recordFailedAttempt, resetFailedAttempts;

  beforeEach(async () => {
    const module = await import('@/lib/rate-limit');
    checkFailedAttempts = module.checkFailedAttempts;
    recordFailedAttempt = module.recordFailedAttempt;
    resetFailedAttempts = module.resetFailedAttempts;
  });

  it('should allow login attempts initially', () => {
    const result = checkFailedAttempts('test-user');
    expect(result.allowed).toBe(true);
    expect(result.attempts).toBe(0);
  });

  it('should track failed attempts', () => {
    recordFailedAttempt('test-user-3');
    recordFailedAttempt('test-user-3');
    
    const result = recordFailedAttempt('test-user-3');
    expect(result.attempts).toBe(3);
  });

  it('should lock account after 3 failed attempts', () => {
    recordFailedAttempt('test-user-4');
    recordFailedAttempt('test-user-4');
    recordFailedAttempt('test-user-4');
    
    const result = checkFailedAttempts('test-user-4');
    expect(result.allowed).toBe(false);
    expect(result.waitTime).toBeGreaterThan(0);
  });

  it('should reset failed attempts', () => {
    recordFailedAttempt('test-user-5');
    recordFailedAttempt('test-user-5');
    
    resetFailedAttempts('test-user-5');
    
    const result = checkFailedAttempts('test-user-5');
    expect(result.allowed).toBe(true);
    expect(result.attempts).toBe(0);
  });
});
