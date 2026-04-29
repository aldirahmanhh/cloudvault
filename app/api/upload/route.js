import { NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import { cacheFile, getStorageType, formatSize } from '@/lib/storage';
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
    const storageType = getStorageType(totalSize || buffer.length);

    console.log(`📤 Upload chunk ${chunkIndex + 1}/${totalChunks} of "${fileName}" → ${storageType.toUpperCase()}`);

    let chunkResult;

    if (storageType === 'telegram' && totalChunks === 1) {
      // Single file → Telegram
      chunkResult = await telegram.uploadFile(buffer, fileName, fileId, mimeType);

      // Also store metadata record in Discord (for cold-start recovery)
      await discord.storeMetadata(fileId, fileName, mimeType, buffer.length, 'telegram', chunkResult, user.userId);
    } else {
      chunkResult = await discord.uploadChunk(buffer, fileName, chunkIndex, totalChunks, fileId, mimeType, user.userId);
    }

    // If this is the last chunk, cache the complete file
    const isLastChunk = chunkIndex === totalChunks - 1;

    if (isLastChunk && totalChunks === 1) {
      cacheFile({
        id: fileId,
        name: fileName,
        mimeType,
        size: buffer.length,
        storageType,
        userId: user.userId,
        chunks: [chunkResult],
        createdAt: new Date().toISOString(),
      });
    }

    return NextResponse.json({
      fileId,
      chunkIndex,
      totalChunks,
      storageType,
      messageId: chunkResult.messageId,
      channelId: chunkResult.channelId,
      isLastChunk,
    });
  } catch (error) {
    console.error('Upload error:', error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
