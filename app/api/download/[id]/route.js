import { NextResponse } from 'next/server';
import { getFileById, downloadFile, downloadFromTelegramBackup, rebuildIndex } from '@/lib/storage';
import { getUserFromRequest } from '@/lib/auth';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function GET(request, { params }) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    // Rate limiting: 50 downloads per user per 10 minutes
    const clientIp = getClientIp(request);
    const rateCheck = checkRateLimit(`download:${user.userId}:${clientIp}`, 50, 10 * 60 * 1000);
    
    if (!rateCheck.allowed) {
      return NextResponse.json(
        { 
          error: `Terlalu banyak download. Coba lagi dalam ${rateCheck.retryAfter} detik.`,
          retryAfter: rateCheck.retryAfter,
        },
        { 
          status: 429,
          headers: {
            'Retry-After': rateCheck.retryAfter.toString(),
            'X-RateLimit-Limit': '50',
            'X-RateLimit-Remaining': rateCheck.remaining.toString(),
          },
        }
      );
    }

    await rebuildIndex();
    const file = getFileById(params.id);

    if (!file) {
      return NextResponse.json({ error: 'File not found' }, { status: 404 });
    }
    if (file.userId && file.userId !== user.userId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    console.log(`📥 Downloading "${file.name}" from ${file.storageType.toUpperCase()}`);

    // Try primary storage, fallback to backup
    let buffer;
    try {
      buffer = await downloadFile(file);
    } catch (primaryErr) {
      console.warn(`⚠️ Primary download failed: ${primaryErr.message}, trying backup...`);
      if (file.telegramBackup) {
        buffer = await downloadFromTelegramBackup(file);
        console.log(`✅ Downloaded from Telegram backup`);
      } else {
        throw primaryErr;
      }
    }

    const mimeType = file.mimeType || 'application/octet-stream';
    const isPreviewable = mimeType.startsWith('image/') || mimeType.startsWith('video/') || mimeType.startsWith('audio/');
    const disposition = isPreviewable ? 'inline' : 'attachment';
    const totalSize = buffer.length;
    const safeName = encodeURIComponent(file.name);

    // HTTP Range support — required for smooth video/audio seeking. Browser
    // media element sends Range requests when scrubbing; without 206 replies
    // it re-downloads the full file each time (visible as stutter).
    const rangeHeader = request.headers.get('range');
    if (rangeHeader) {
      const match = /^bytes=(\d*)-(\d*)$/.exec(rangeHeader);
      if (match) {
        let start = match[1] ? parseInt(match[1], 10) : 0;
        let end = match[2] ? parseInt(match[2], 10) : totalSize - 1;

        if (isNaN(start) || isNaN(end) || start > end || start >= totalSize) {
          return new Response(null, {
            status: 416,
            headers: {
              'Content-Range': `bytes */${totalSize}`,
              'Accept-Ranges': 'bytes',
            },
          });
        }
        if (end >= totalSize) end = totalSize - 1;

        const slice = buffer.subarray(start, end + 1);
        return new Response(slice, {
          status: 206,
          headers: {
            'Content-Type': mimeType,
            'Content-Length': slice.length.toString(),
            'Content-Range': `bytes ${start}-${end}/${totalSize}`,
            'Accept-Ranges': 'bytes',
            'Content-Disposition': `${disposition}; filename="${safeName}"`,
            'Cache-Control': 'public, max-age=3600',
          },
        });
      }
    }

    return new Response(buffer, {
      headers: {
        'Content-Type': mimeType,
        'Content-Length': totalSize.toString(),
        'Accept-Ranges': 'bytes',
        'Content-Disposition': `${disposition}; filename="${safeName}"`,
        'Cache-Control': 'public, max-age=3600',
      },
    });
  } catch (error) {
    console.error('Download error:', error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
