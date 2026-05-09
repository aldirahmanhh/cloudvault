import { NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import { cacheFile } from '@/lib/storage';
import { getUserFromRequest } from '@/lib/auth';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';
import * as discord from '@/lib/discord';
import * as telegram from '@/lib/telegram';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

// Allowed MIME types (whitelist approach)
const ALLOWED_MIME_TYPES = [
  // Images
  'image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml', 'image/bmp',
  // Videos
  'video/mp4', 'video/webm', 'video/ogg', 'video/quicktime', 'video/x-msvideo',
  // Audio
  'audio/mpeg', 'audio/ogg', 'audio/wav', 'audio/webm', 'audio/aac', 'audio/flac',
  // Documents
  'application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-powerpoint', 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'text/plain', 'text/csv', 'text/html', 'text/css', 'text/javascript',
  // Archives
  'application/zip', 'application/x-rar-compressed', 'application/x-7z-compressed', 'application/x-tar', 'application/gzip',
  // Code
  'application/json', 'application/xml',
  // Fallback
  'application/octet-stream',
];

const MAX_FILE_SIZE = 2 * 1024 * 1024 * 1024; // 2GB

export async function POST(request) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    // Rate limiting: 20 uploads per user per 10 minutes
    const clientIp = getClientIp(request);
    const rateCheck = checkRateLimit(`upload:${user.userId}:${clientIp}`, 20, 10 * 60 * 1000);
    
    if (!rateCheck.allowed) {
      return NextResponse.json(
        { 
          error: `Terlalu banyak upload. Coba lagi dalam ${rateCheck.retryAfter} detik.`,
          retryAfter: rateCheck.retryAfter,
        },
        { 
          status: 429,
          headers: {
            'Retry-After': rateCheck.retryAfter.toString(),
            'X-RateLimit-Limit': '20',
            'X-RateLimit-Remaining': rateCheck.remaining.toString(),
          },
        }
      );
    }

    const formData = await request.formData();
    const file = formData.get('file');
    const fileId = formData.get('fileId') || uuidv4();
    const fileName = formData.get('fileName') || file?.name || 'unnamed';
    const chunkIndex = parseInt(formData.get('chunkIndex') || '0');
    const totalChunks = parseInt(formData.get('totalChunks') || '1');
    const mimeType = formData.get('mimeType') || file?.type || 'application/octet-stream';
    const totalSize = parseInt(formData.get('totalSize') || '0');

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    // Validate file size
    if (totalSize > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: `File terlalu besar. Maksimal ${MAX_FILE_SIZE / (1024 * 1024 * 1024)}GB` },
        { status: 413 }
      );
    }

    // Validate MIME type
    if (!ALLOWED_MIME_TYPES.includes(mimeType)) {
      return NextResponse.json(
        { error: `Tipe file tidak diizinkan: ${mimeType}` },
        { status: 415 }
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const fileSize = totalSize || buffer.length;
    const canTelegram = fileSize <= 50 * 1024 * 1024; // Telegram max 50MB

    console.log(`📤 Upload chunk ${chunkIndex + 1}/${totalChunks} of "${fileName}" → Discord${canTelegram && totalChunks === 1 ? ' + Telegram' : ''}`);

    // Always upload to Discord (primary storage + metadata)
    const discordResult = await discord.uploadChunk(buffer, fileName, chunkIndex, totalChunks, fileId, mimeType, user.userId);

    // Also upload to Telegram as backup (only for single-chunk files ≤ 50MB)
    let telegramBackup = null;
    if (canTelegram && totalChunks === 1) {
      try {
        telegramBackup = await telegram.uploadFile(buffer, fileName, fileId, mimeType);
        // Store backup reference in Discord metadata message
        await discord.storeMetadata(fileId, fileName, mimeType, buffer.length, 'dual', {
          ...discordResult,
          telegramMessageId: telegramBackup.messageId,
          telegramChannelId: telegramBackup.channelId,
        }, user.userId);
        console.log(`  ✈️ Telegram backup saved`);
      } catch (err) {
        console.warn(`  ⚠️ Telegram backup failed: ${err.message}`);
      }
    }

    const isLastChunk = chunkIndex === totalChunks - 1;

    if (isLastChunk && totalChunks === 1) {
      cacheFile({
        id: fileId,
        name: fileName,
        mimeType,
        size: buffer.length,
        storageType: 'discord',
        userId: user.userId,
        chunks: [discordResult],
        telegramBackup,
        createdAt: new Date().toISOString(),
      });
    }

    return NextResponse.json({
      fileId,
      chunkIndex,
      totalChunks,
      storageType: 'discord',
      messageId: discordResult.messageId,
      channelId: discordResult.channelId,
      hasBackup: !!telegramBackup,
      isLastChunk,
    });
  } catch (error) {
    console.error('Upload error:', error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
