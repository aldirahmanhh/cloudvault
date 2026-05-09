/**
 * In-memory file index cache
 * On Vercel, this resets per cold start — files are re-scanned from Discord/Telegram
 * This is the "zero database" approach
 */

import * as discord from './discord';
import * as telegram from './telegram';
import { formatFileSize } from './constants';

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
 * Rebuild file index from Discord — optimized for cold starts
 */
export async function rebuildIndex() {
  const now = Date.now();

  // Skip if recently scanned or already scanning
  if (scanning || (now - lastScan < SCAN_INTERVAL && fileCache.size > 0)) {
    return;
  }

  // If cache is empty (cold start), scan synchronously but optimized
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
  const startTime = Date.now();
  console.log('🔄 Scanning Discord for files...');
  try {
    // Optimized: scan with pagination limit
    // For cold starts, limit to 100 most recent files for faster initial load
    const limit = fileCache.size === 0 ? 100 : 200;
    const discordFiles = await discord.scanFiles(limit);
    
    for (const file of discordFiles) {
      fileCache.set(file.id, file);
    }
    
    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log(`✅ Found ${discordFiles.length} files in Discord (${duration}s)`);
    lastScan = Date.now();
  } catch (err) {
    console.error('Failed to scan Discord:', err.message);
  } finally {
    scanning = false;
  }
}

/**
 * Download file by assembling chunks
 * Optimized: parallel chunk downloads with concurrency limit
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

  // Parallel download with concurrency limit (3 at a time)
  const sorted = [...file.chunks].sort((a, b) => a.chunkIndex - b.chunkIndex);
  const buffers = new Array(sorted.length);
  const concurrency = 3;
  
  console.log(`  📥 Downloading ${sorted.length} chunks (${concurrency} parallel)...`);
  
  for (let i = 0; i < sorted.length; i += concurrency) {
    const batch = sorted.slice(i, i + concurrency);
    const promises = batch.map(async (chunk, batchIndex) => {
      const actualIndex = i + batchIndex;
      console.log(`  📥 Chunk ${actualIndex + 1}/${sorted.length}...`);
      const buf = await discord.downloadChunk(chunk.messageId, chunk.channelId);
      buffers[actualIndex] = buf;
    });
    
    await Promise.all(promises);
    
    // Small delay between batches to avoid rate limits
    if (i + concurrency < sorted.length) {
      await new Promise(r => setTimeout(r, 200));
    }
  }
  
  return Buffer.concat(buffers);
}

/**
 * Download from Telegram backup (fallback when Discord fails)
 */
export async function downloadFromTelegramBackup(file) {
  if (!file.telegramBackup) throw new Error('No Telegram backup available');
  const backup = file.telegramBackup;
  return telegram.downloadFile(backup.messageId, backup.channelId);
}

/**
 * Delete file from storage (both Discord + Telegram backup)
 */
export async function deleteFileFromStorage(file) {
  // Delete from primary (Discord chunks)
  for (const chunk of file.chunks) {
    try {
      if (file.storageType === 'discord') {
        await discord.deleteMessage(chunk.messageId, chunk.channelId);
      } else {
        await telegram.deleteMsg(chunk.messageId, chunk.channelId);
      }
    } catch { /* ignore individual chunk errors */ }
  }
  // Delete Discord metadata message
  if (file._discordMetaMsgId) {
    try { await discord.deleteMessage(file._discordMetaMsgId, process.env.DISCORD_CHANNEL_ID); } catch { }
  }
  // Delete Telegram backup
  if (file.telegramBackup) {
    try { await telegram.deleteMsg(file.telegramBackup.messageId, file.telegramBackup.channelId); } catch { }
  }
}

// Re-export formatFileSize for backward compatibility
export { formatFileSize as formatSize };
