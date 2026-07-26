import { NextResponse } from 'next/server';
import * as discord from '@/lib/discord';
import { getFileById, setThumbnail, rebuildIndex } from '@/lib/storage';
import { getUserFromRequest } from '@/lib/auth';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';

export const dynamic = 'force-dynamic';

// Max thumbnail size: 200KB (128x128 JPEG well within budget)
const MAX_THUMB_BYTES = 200 * 1024;

/**
 * POST /api/thumbnail/upload
 * Body: { fileId, thumbnail: 'data:image/jpeg;base64,...' }
 * Client generates JPEG thumbnail via canvas, ships as data URL.
 */
export async function POST(request) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const clientIp = getClientIp(request);
    const rate = checkRateLimit(`thumb-upload:${user.userId}:${clientIp}`, 30, 10 * 60 * 1000);
    if (!rate.allowed) {
      return NextResponse.json(
        { error: `Terlalu banyak request thumbnail. Coba lagi dalam ${rate.retryAfter} detik.` },
        { status: 429 }
      );
    }

    const { fileId, thumbnail } = await request.json();
    if (!fileId || !thumbnail) {
      return NextResponse.json({ error: 'fileId dan thumbnail wajib diisi' }, { status: 400 });
    }

    // Parse data URL: data:image/jpeg;base64,XXX
    const match = /^data:(image\/(?:jpeg|png|webp));base64,(.+)$/.exec(thumbnail);
    if (!match) {
      return NextResponse.json({ error: 'Format thumbnail tidak valid (harus data URL JPEG/PNG/WebP)' }, { status: 400 });
    }

    const buffer = Buffer.from(match[2], 'base64');
    if (buffer.length > MAX_THUMB_BYTES) {
      return NextResponse.json({ error: 'Thumbnail terlalu besar (max 200KB)' }, { status: 400 });
    }

    await rebuildIndex();
    const file = getFileById(fileId);
    if (!file) return NextResponse.json({ error: 'File tidak ditemukan' }, { status: 404 });
    if (file.userId !== user.userId) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    // Upload thumbnail as separate Discord message flagged as _thumb
    const uploaded = await discord.uploadChunk(
      buffer,
      'thumb.jpg',
      0,
      1,
      fileId,
      match[1],
      user.userId,
      { _thumb: true, parentFileId: fileId }
    );

    // Persist reference for cold-start recovery
    try {
      await discord.storeThumbnailRef(fileId, uploaded.messageId, uploaded.channelId, user.userId);
    } catch (err) {
      console.warn('storeThumbnailRef failed (thumbnail still usable this session):', err.message);
    }

    // Update in-memory cache immediately
    setThumbnail(fileId, { messageId: uploaded.messageId, channelId: uploaded.channelId });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('POST /api/thumbnail/upload error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
