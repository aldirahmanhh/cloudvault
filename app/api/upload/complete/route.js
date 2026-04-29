import { NextResponse } from 'next/server';
import { cacheFile } from '@/lib/storage';

export const dynamic = 'force-dynamic';

// POST /api/upload/complete — signal that all chunks are uploaded
// Client sends: { fileId, fileName, mimeType, totalSize, storageType, chunks: [...] }
export async function POST(request) {
  try {
    const body = await request.json();
    const { fileId, fileName, mimeType, totalSize, storageType, chunks } = body;

    if (!fileId || !chunks || chunks.length === 0) {
      return NextResponse.json({ error: 'Missing file data' }, { status: 400 });
    }

    // Cache the complete file
    cacheFile({
      id: fileId,
      name: fileName,
      mimeType,
      size: totalSize,
      storageType,
      chunks: chunks.sort((a, b) => a.chunkIndex - b.chunkIndex),
      createdAt: new Date().toISOString(),
    });

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
