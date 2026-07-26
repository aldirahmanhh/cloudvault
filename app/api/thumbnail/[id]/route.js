import { NextResponse } from 'next/server';
import * as discord from '@/lib/discord';
import { getFileById, rebuildIndex } from '@/lib/storage';
import { getUserFromRequest } from '@/lib/auth';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';

export const dynamic = 'force-dynamic';

/**
 * GET /api/thumbnail/[id]
 * Serves the thumbnail image for a file. Auth + ownership required.
 */
export async function GET(request, { params }) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const clientIp = getClientIp(request);
    const rate = checkRateLimit(`thumb-get:${user.userId}:${clientIp}`, 200, 5 * 60 * 1000);
    if (!rate.allowed) {
      return NextResponse.json(
        { error: `Terlalu banyak request. Coba lagi dalam ${rate.retryAfter} detik.` },
        { status: 429 }
      );
    }

    await rebuildIndex();
    const file = getFileById(params.id);
    if (!file) return NextResponse.json({ error: 'File tidak ditemukan' }, { status: 404 });
    if (file.userId !== user.userId) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    if (!file.thumbnail) return NextResponse.json({ error: 'No thumbnail' }, { status: 404 });

    const buffer = await discord.downloadChunk(file.thumbnail.messageId, file.thumbnail.channelId);

    return new Response(buffer, {
      status: 200,
      headers: {
        'Content-Type': 'image/jpeg',
        'Content-Length': buffer.length.toString(),
        'Cache-Control': 'private, max-age=86400',
      },
    });
  } catch (error) {
    console.error('GET /api/thumbnail/[id] error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
