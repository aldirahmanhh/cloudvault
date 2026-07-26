import { NextResponse } from 'next/server';
import { cacheFile } from '@/lib/storage';
import { getUserFromRequest } from '@/lib/auth';
import * as discord from '@/lib/discord';

export const dynamic = 'force-dynamic';

export async function POST(request) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await request.json();
    const { fileId, fileName, mimeType, totalSize, storageType, chunks } = body;

    if (!fileId || !chunks || chunks.length === 0) {
      return NextResponse.json({ error: 'Missing file data' }, { status: 400 });
    }

    const sortedChunks = chunks.sort((a, b) => a.chunkIndex - b.chunkIndex);

    cacheFile({
      id: fileId,
      name: fileName,
      mimeType,
      size: totalSize,
      storageType,
      userId: user.userId,
      chunks: sortedChunks,
      createdAt: new Date().toISOString(),
    });

    // Store metadata in Discord for cold-instance recovery (multi-chunk files
    // otherwise require reassembly from scan; a meta record makes them
    // discoverable instantly on any serverless instance).
    try {
      const firstChunk = sortedChunks[0];
      await discord.storeMetadata(
        fileId,
        fileName,
        mimeType,
        totalSize,
        storageType,
        {
          messageId: firstChunk.messageId,
          channelId: firstChunk.channelId,
          chunkSize: firstChunk.chunkSize,
          totalChunks: sortedChunks.length,
        },
        user.userId
      );
    } catch (err) {
      console.warn(`  ⚠️ Metadata store failed: ${err.message}`);
    }

    console.log(`✅ File complete: "${fileName}" (${chunks.length} chunks)`);

    return NextResponse.json({
      id: fileId,
      name: fileName,
      size: totalSize,
      storageType,
      chunks: chunks.length,
    });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
