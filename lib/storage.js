/**
 * In-memory file index cache
 * On Vercel, this resets per cold start — files are re-scanned from Discord/Telegram
 * This is the "zero database" approach
 */

import * as discord from './discord';
import * as telegram from './telegram';

// In-memory cache
let fileCache = new Map();
let lastScan = 0;
let scanning = false;
const SCAN_INTERVAL = 300000; // Re-scan every 5 minutes

/**
 * Get storage type based on file size
 */
export function getStorageType(size) {
  const threshold = parseInt(process.env.FILE_SIZE_THRESHOLD) || 50 * 1024 * 1024;
  return size <= threshold ? 'telegram' : 'discord';
}

/**
 * Add file to cache
 */
export function cacheFile(file) {
  fileCache.set(file.id, file);
}

/**
 * Remove file from cache
 */
export function uncacheFile(id) {
  fileCache.delete(id);
}

/**
 * Get all files from cache (with search/pagination/userId filter)
 */
export function getFiles({ page = 1, limit = 20, search = '', userId = null } = {}) {
  let files = [...fileCache.values()];

  // Filter by user
  if (userId) {
    files = files.filter(f => f.userId === userId);
  }

  if (search) {
    const q = search.toLowerCase();
    files = files.filter(f => f.name.toLowerCase().includes(q));
  }

  files.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  const total = files.length;
  const totalPages = Math.ceil(total / limit);
  const offset = (page - 1) * limit;

  return {
    files: files.slice(offset, offset + limit),
    pagination: { page, limit, total, totalPages },
  };
}

/**
 * Get file by ID
 */
export function getFileById(id) {
  return fileCache.get(id) || null;
}

/**
 * Get stats
 */
export function getStats(userId = null) {
  let files = [...fileCache.values()];
  if (userId) files = files.filter(f => f.userId === userId);
  return {
    totalFiles: files.length,
    totalSize: files.reduce((s, f) => s + (f.size || 0), 0),
    discordFiles: files.filter(f => f.storageType === 'discord').length,
    telegramFiles: files.filter(f => f.storageType === 'telegram').length,
  };
}

/**
 * Rebuild file index from Discord — non-blocking after first load
 */
export async function rebuildIndex() {
  const now = Date.now();

  // Skip if recently scanned or already scanning
  if (scanning || (now - lastScan < SCAN_INTERVAL && fileCache.size > 0)) {
    return;
  }

  // If cache is empty (cold start), scan synchronously (blocking)
  // Otherwise, scan in background (non-blocking)
  if (fileCache.size === 0) {
    await doScan();
  } else {
    // Background scan — don't block the response
    doScan().catch(err => console.error('Background scan failed:', err.message));
  }
}

async function doScan() {
  scanning = true;
  console.log('🔄 Scanning Discord for files...');
  try {
    const discordFiles = await discord.scanFiles(200);
    for (const file of discordFiles) {
      fileCache.set(file.id, file);
    }
    console.log(`✅ Found ${discordFiles.length} files in Discord`);
    lastScan = Date.now();
  } catch (err) {
    console.error('Failed to scan Discord:', err.message);
  } finally {
    scanning = false;
  }
}

/**
 * Download file by assembling chunks
 */
export async function downloadFile(file) {
  if (file.storageType === 'telegram') {
    const chunk = file.chunks[0];
    return telegram.downloadFile(chunk.messageId, chunk.channelId);
  }

  // Discord — may have multiple chunks
  if (file.chunks.length === 1) {
    return discord.downloadChunk(file.chunks[0].messageId, file.chunks[0].channelId);
  }

  const sorted = [...file.chunks].sort((a, b) => a.chunkIndex - b.chunkIndex);
  const buffers = [];
  for (let i = 0; i < sorted.length; i++) {
    console.log(`  📥 Chunk ${i + 1}/${sorted.length}...`);
    const buf = await discord.downloadChunk(sorted[i].messageId, sorted[i].channelId);
    buffers.push(buf);
    if (i < sorted.length - 1) await new Promise(r => setTimeout(r, 500));
  }
  return Buffer.concat(buffers);
}

/**
 * Delete file from storage
 */
export async function deleteFileFromStorage(file) {
  for (const chunk of file.chunks) {
    if (file.storageType === 'discord') {
      await discord.deleteMessage(chunk.messageId, chunk.channelId);
    } else {
      await telegram.deleteMsg(chunk.messageId, chunk.channelId);
    }
  }
  // Also delete the Discord metadata message (for Telegram files)
  if (file._discordMetaMsgId) {
    try {
      await discord.deleteMessage(file._discordMetaMsgId, process.env.DISCORD_CHANNEL_ID);
    } catch { /* ignore */ }
  }
}

export function formatSize(bytes) {
  if (!bytes) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  let i = 0, size = bytes;
  while (size >= 1024 && i < units.length - 1) { size /= 1024; i++; }
  return `${size.toFixed(2)} ${units[i]}`;
}
