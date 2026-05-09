import { describe, it, expect, beforeEach } from 'vitest';

// Mock environment variables
process.env.DISCORD_BOT_TOKEN = 'test-discord-token';
process.env.DISCORD_CHANNEL_ID = 'test-channel-id';
process.env.TELEGRAM_BOT_TOKEN = 'test-telegram-token';
process.env.TELEGRAM_CHAT_ID = 'test-chat-id';
process.env.JWT_SECRET = 'test-jwt-secret-with-at-least-32-chars-long';

describe('Storage Utilities', () => {
  let getStorageType, cacheFile, getFileById, uncacheFile;

  beforeEach(async () => {
    const module = await import('@/lib/storage');
    getStorageType = module.getStorageType;
    cacheFile = module.cacheFile;
    getFileById = module.getFileById;
    uncacheFile = module.uncacheFile;
  });

  it('should determine storage type based on file size', () => {
    const smallFile = 10 * 1024 * 1024; // 10MB
    const largeFile = 100 * 1024 * 1024; // 100MB

    expect(getStorageType(smallFile)).toBe('telegram');
    expect(getStorageType(largeFile)).toBe('discord');
  });

  it('should cache and retrieve files', () => {
    const testFile = {
      id: 'test-file-1',
      name: 'test.txt',
      size: 1024,
      mimeType: 'text/plain',
    };

    cacheFile(testFile);
    const retrieved = getFileById('test-file-1');
    
    expect(retrieved).toBeDefined();
    expect(retrieved.name).toBe('test.txt');
  });

  it('should remove files from cache', () => {
    const testFile = {
      id: 'test-file-2',
      name: 'test2.txt',
      size: 2048,
    };

    cacheFile(testFile);
    expect(getFileById('test-file-2')).toBeDefined();
    
    uncacheFile('test-file-2');
    expect(getFileById('test-file-2')).toBeNull();
  });
});
