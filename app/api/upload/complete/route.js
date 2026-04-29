import { NextResponse } from 'next/server';
import { cacheFile } from '@/lib/storage';
import { getUserFromRequest } from '@/lib/auth';

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

    cacheFile({
      id: fileId,
      name: fileName,
      mimeType,
      size: totalSize,
      storageType,
      userId: user.userId,
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
