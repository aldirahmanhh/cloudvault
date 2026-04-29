import { NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import { cacheFile } from '@/lib/storage';
import { getUserFromRequest } from '@/lib/auth';
import * as discord from '@/lib/discord';
import * as telegram from '@/lib/telegram';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function POST(request) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

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
