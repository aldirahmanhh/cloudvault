import { describe, it, expect } from 'vitest';
import { formatFileSize, MAX_FILE_SIZE, FILE_SIZE_THRESHOLD } from '@/lib/constants';

describe('formatFileSize', () => {
  it('should format bytes correctly', () => {
    expect(formatFileSize(0)).toBe('0 B');
    expect(formatFileSize(1024)).toBe('1.00 KB');
    expect(formatFileSize(1024 * 1024)).toBe('1.00 MB');
    expect(formatFileSize(1024 * 1024 * 1024)).toBe('1.00 GB');
    expect(formatFileSize(1536)).toBe('1.50 KB');
  });

  it('should handle null/undefined', () => {
    expect(formatFileSize(null)).toBe('0 B');
    expect(formatFileSize(undefined)).toBe('0 B');
  });

  it('should handle large files', () => {
    expect(formatFileSize(2 * 1024 * 1024 * 1024)).toBe('2.00 GB');
  });
});

describe('Constants', () => {
  it('should have correct MAX_FILE_SIZE', () => {
    expect(MAX_FILE_SIZE).toBe(2 * 1024 * 1024 * 1024); // 2GB
  });

  it('should have correct FILE_SIZE_THRESHOLD', () => {
    expect(FILE_SIZE_THRESHOLD).toBe(52428800); // 50MB
  });
});
