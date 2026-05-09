/**
 * Environment constants
 * Centralized access to environment variables
 */

// Site URLs
export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://cloudvault.my.id';
export const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

// Discord
export const DISCORD_BOT_TOKEN = process.env.DISCORD_BOT_TOKEN;
export const DISCORD_CHANNEL_ID = process.env.DISCORD_CHANNEL_ID;

// Telegram
export const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
export const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;

// Auth
export const JWT_SECRET = process.env.JWT_SECRET;

// Optional
export const TRAKTEER_API_KEY = process.env.TRAKTEER_API_KEY;

// File size threshold (50MB)
export const FILE_SIZE_THRESHOLD = parseInt(process.env.FILE_SIZE_THRESHOLD || '52428800');

// Max file size (2GB)
export const MAX_FILE_SIZE = 2 * 1024 * 1024 * 1024;

/**
 * Format bytes to human-readable size
 * @param {number} bytes - File size in bytes
 * @returns {string} Formatted size (e.g., "1.5 MB")
 */
export function formatFileSize(bytes) {
  if (!bytes || bytes === 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(i > 0 ? 2 : 0)} ${units[i]}`;
}
